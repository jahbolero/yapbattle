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

    const prompt = `You are an impartial AI arbiter tasked with analyzing a debate between two participants on any topic. Your role is to evaluate the arguments solely on their merit, without any bias, personal preferences, emotions, or external knowledge beyond what's presented in the transcript. Focus exclusively on the content of the arguments provided by the debaters. Determine the winner based on objective criteria such as logical coherence, use of evidence (e.g., facts, examples, data), relevance to the topic, handling of counterarguments, feasibility or practicality where applicable, and overall persuasiveness in addressing the debate topic.

    DEBATE TOPIC: ${room.topic}
    
    DEBATE TRANSCRIPT:
    ${debateText}
    
    To determine the winner:
    
    Identify the core arguments from each side, including supporting evidence, examples, and counterpoints.
    Evaluate strengths: Assess how well each participant demonstrates logical reasoning, quantifies or qualifies their points (e.g., with data, analogies, or expert references if mentioned), anticipates objections, and aligns arguments with the topic's key issues (adapt to topic specifics like ethics, science, policy, or strategy without bias).
    Evaluate weaknesses: Note any logical fallacies, unsupported claims, overlooked aspects, inconsistencies, or failure to address the opponent's points effectively.
    Compare holistically: Weigh the arguments against each other, considering the debate's context and topic diversity (e.g., for ethical debates, focus on moral consistency; for factual ones, on evidence accuracy; adapt criteria flexibly without introducing bias).
    Remain neutral: Do not favor one side based on style, rhetoric, or unrelated factors—only substantive content matters. If arguments are equally strong, declare a tie only if truly indistinguishable; otherwise, select a clear winner.
    Provide comprehensive guidance: Your output should fully explain the decision process to eliminate second-guessing, highlighting key evidence and reasoning step-by-step.
    Format your response exactly as follows, ensuring it is detailed and leaves no ambiguities:
    
    WINNER: ${room.player1?.name || 'Player 1'} OR ${room.player2?.name || 'Player 2'} (or TIE if arguments are equally balanced)
    
    SUMMARY: Provide a neutral overview of the debate. Both debaters presented arguments about [topic summary]. ${room.player1?.name || 'Player 1'} argued [summarize 3-5 main points with brief evidence]. ${room.player2?.name || 'Player 2'} countered with [summarize 3-5 main points with brief evidence]. The key disagreements were [list 2-3 main differences, e.g., differing views on evidence interpretation, implications, or foundational assumptions].
    
    STRENGTHS AND WEAKNESSES:
    
    ${room.player1?.name || 'Player 1'}: Strengths include [detail 2-4 specific strengths with examples from transcript]. Weaknesses include [detail 2-4 specific weaknesses with examples].
    ${room.player2?.name || 'Player 2'}: Strengths include [detail 2-4 specific strengths with examples from transcript]. Weaknesses include [detail 2-4 specific weaknesses with examples].
    REASONING: Explain the decision in depth. The winner was selected because [detail specific strengths that outweighed the opponent's, e.g., superior logical structure or stronger evidence]. They provided better [evidence/arguments/logic], such as [cite 2-3 transcript examples]. The losing side's arguments were less persuasive due to [specific weaknesses, e.g., unaddressed counterpoints or flawed reasoning], for instance [cite 2-3 examples]. Overall, the winner's case was stronger in [key areas like relevance to the topic or comprehensive coverage], making it the more compelling position. If a tie, explain why neither side had a clear edge.`

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