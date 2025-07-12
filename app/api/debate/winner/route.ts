import { NextRequest, NextResponse } from 'next/server';
import { roomStore, messageStore } from '@/lib/room-store';

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();
    console.log('Winner analysis requested for room:', roomId);

    // Get room and messages from store
    const room = roomStore.get(roomId);
    const messages = messageStore.get(roomId) || [];

    console.log('Room store keys:', Array.from(roomStore.keys()));
    console.log('Message store keys:', Array.from(messageStore.keys()));
    console.log('Looking for roomId:', roomId);
    console.log('Room found:', !!room);
    console.log('Messages found:', messages.length);

    if (!room) {
      console.log('Room not found:', roomId);
      console.log('Available rooms:', Array.from(roomStore.keys()));
      return NextResponse.json({ 
        error: 'Debate room not found. The room may have expired or the server was restarted.',
        availableRooms: Array.from(roomStore.keys()) 
      }, { status: 404 });
    }

    if (messages.length === 0) {
      console.log('No messages found for room:', roomId);
      return NextResponse.json({ error: 'No debate messages to analyze. Please ensure the debate has started and messages have been sent.' }, { status: 400 });
    }

    console.log(`Analyzing debate with ${messages.length} messages`);

    // Format debate for AI analysis
    const debateText = messages.map(msg => {
      const playerName = msg.turn === 'player1' ? 
        (room.player1?.name || 'Player 1') : 
        (room.player2?.name || 'Player 2');
      return `${playerName}: ${msg.content}`;
    }).join('\n\n');

    const prompt = `Analyze this debate and determine the winner based on argument quality and persuasiveness.

TOPIC: ${room.topic}

DEBATE TRANSCRIPT:
${debateText}

Please provide a detailed analysis in this EXACT format:

WINNER: ${room.player1?.name || 'Player 1'} OR ${room.player2?.name || 'Player 2'}
SUMMARY: Both debaters presented arguments about ${room.topic}. ${room.player1?.name || 'Player 1'} argued [main points]. ${room.player2?.name || 'Player 2'} countered with [main points]. The key disagreement was [main difference].
REASONING: The winner was more persuasive because [specific strengths]. They provided [better evidence/arguments]. The losing side's weakness was [specific weaknesses]. Overall [why winner was better].

Follow this format exactly and provide detailed analysis based on the actual debate content.`;

    console.log('Sending to io.net API:', {
      promptLength: prompt.length,
      apiKey: process.env.IONET_API_KEY ? 'Present' : 'Missing'
    });

    // Call io.net Chat Completions API directly for better results
    const response = await fetch('https://api.intelligence.io.solutions/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IONET_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/Llama-3.3-70B-Instruct",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_completion_tokens: 1000
      })
    });

    console.log('io.net response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('io.net error response:', errorText);
      throw new Error(`IO.NET API error: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('io.net response data:', JSON.stringify(data, null, 2));
    
    // Handle chat completions response format
    let analysis;
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      analysis = data.choices[0].message.content;
      console.log('Using chat completion content:', analysis);
    } else {
      // Fallback to old format
      if (data.result) {
        if (typeof data.result === 'object' && data.result.summary) {
          analysis = data.result.summary;
        } else {
          analysis = String(data.result);
        }
      } else {
        analysis = String(data.summary || data.response || '');
      }
    }
    
    console.log('Raw analysis result:', analysis);
    
    // Parse winner, summary, and reasoning
    const winnerMatch = analysis.match(/WINNER:\s*(.+?)(?=\n|SUMMARY:|$)/i);
    const summaryMatch = analysis.match(/SUMMARY:\s*(.+?)(?=REASONING:|$)/si);
    const reasoningMatch = analysis.match(/REASONING:\s*(.+)/si);
    
    let winner = 'player1'; // default
    let summary = '';
    let reasoning = '';
    
    // Parse winner
    if (winnerMatch) {
      const winnerRaw = winnerMatch[1].trim();
      console.log('Winner raw text:', winnerRaw);
      
      // Map name-based winners to player numbers
      if (winnerRaw.toLowerCase().includes(room.player1?.name?.toLowerCase() || 'player1')) {
        winner = 'player1';
      } else if (winnerRaw.toLowerCase().includes(room.player2?.name?.toLowerCase() || 'player2')) {
        winner = 'player2';
      } else if (winnerRaw.match(/^player[12]$/i)) {
        winner = winnerRaw.toLowerCase();
      }
    }
    
    // Parse summary and reasoning
    summary = summaryMatch?.[1]?.trim() || '';
    reasoning = reasoningMatch?.[1]?.trim() || '';
    
    // If we don't have proper format, try to create meaningful fallbacks
    if (!summary || !reasoning) {
      console.log('Fallback parsing needed. Analysis:', analysis);
      
      // Split the analysis into sentences and use them intelligently
      const sentences = analysis.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      if (sentences.length >= 2) {
        summary = sentences.slice(0, 2).join('. ').trim() + '.';
        reasoning = sentences.slice(1).join('. ').trim() + '.';
      } else {
        summary = `Analysis of the debate between ${room.player1?.name || 'Player 1'} and ${room.player2?.name || 'Player 2'}.`;
        reasoning = analysis || 'The AI provided a brief analysis of the debate arguments.';
      }
    }

    console.log('Parsed results:', { winner, summary: summary.substring(0, 100) + '...', reasoning: reasoning.substring(0, 100) + '...' });

    return NextResponse.json({
      success: true,
      winner,
      summary,
      reasoning,
      winnerName: winner === 'player1' ? 
        (room.player1?.name || 'Player 1') : 
        (room.player2?.name || 'Player 2')
    });

  } catch (error) {
    console.error('Winner analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze winner' },
      { status: 500 }
    );
  }
}