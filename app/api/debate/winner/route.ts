import { NextRequest, NextResponse } from 'next/server';
import { roomStore, messageStore } from '@/lib/room-store';

export async function POST(request: NextRequest) {
  try {
    const { roomId } = await request.json();
    console.log('Winner analysis requested for room:', roomId);

    // Get room and messages from store
    const room = roomStore?.get(roomId);
    const messages = messageStore?.get(roomId) || [];

    console.log('Room store keys:', roomStore ? Array.from(roomStore.keys()) : []);
    console.log('Message store keys:', messageStore ? Array.from(messageStore.keys()) : []);
    console.log('Looking for roomId:', roomId);
    console.log('Room found:', !!room);
    console.log('Messages found:', messages.length);

    if (!room) {
      console.log('Room not found:', roomId);
      console.log('Available rooms:', roomStore ? Array.from(roomStore.keys()) : []);
      return NextResponse.json({ 
        error: 'Debate room not found. The room may have expired or the server was restarted.',
        availableRooms: roomStore ? Array.from(roomStore.keys()) : []
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

    const prompt = `You are an impartial AI arbiter tasked with analyzing a debate between two participants on any topic, drawing from parliamentary debate judging principles. Evaluate arguments solely on their merit, using only the content in the transcript—no bias, personal preferences, emotions, or external knowledge. Determine the winner holistically by identifying points of contention, assessing how well each side argues and rebuts on each, and weighing their importance and performance.

DEBATE TOPIC: ${room.topic}

DEBATE TRANSCRIPT:
${debateText}

Process:

Summarize the key points and overall flow of the debate.
Identify 3-5 main points of contention (battlegrounds where arguments clash, e.g., timing, costs, ethics).
For each contention, establish criteria adapted to the topic (e.g., logical coherence, evidence use, rebuttal effectiveness, relevance, feasibility, persuasiveness).
Analyze per contention: Extract key arguments/rebuttals from each side; evaluate what's strong (e.g., data-backed, anticipates counters), lacking (e.g., unsupported, ignored objections, fallacies); explain interactions (how one side's point relates to/undermines the other's); justify who "won" that contention based on criteria.
Score each participant out of 10 overall (average of criteria like Logical Coherence, Evidence Use, Relevance, Counterarguments, Feasibility, Persuasiveness), and note per-contention mini-scores if relevant.
Compare holistically: Weigh contentions by importance (e.g., core to topic > peripheral); avoid over-reliance on single arguments; declare a tie only if performances are indistinguishable across battlegrounds.
Remain neutral: Base on substantive content only—no favoritism to style or rhetoric.
Provide AI-unique insights: Flag patterns like fallacies, evidence density, or sentiment via semantic analysis.
Explain thought process transparently to substantiate the verdict and reduce dissatisfaction.

CRITICAL INSTRUCTIONS:
1. Return ONLY a valid JSON object
2. Do not include ANY text before or after the JSON
3. Do not wrap in markdown code blocks or backticks
4. Do not include explanations or commentary
5. Start directly with { and end with }
6. Ensure all strings are properly quoted
7. Use double quotes for all JSON keys and string values

Return your analysis as a JSON object with exactly this structure:

{
  "winner": {
    "name": "${room.player1?.name || 'Player 1'}",
    "player": "player1",
    "score": "7.5/10"
  },
  "scores": {
    "player1": {
      "overall": 7,
      "breakdown": {
        "logicalCoherence": 7,
        "evidence": 8,
        "relevance": 7,
        "counterarguments": 6,
        "feasibility": 7,
        "persuasiveness": 8
      }
    },
    "player2": {
      "overall": 6,
      "breakdown": {
        "logicalCoherence": 6,
        "evidence": 7,
        "relevance": 6,
        "counterarguments": 7,
        "feasibility": 6,
        "persuasiveness": 5
      }
    }
  },
  "debateSummary": "The debate centered on [topic], with ${room.player1?.name || 'Player 1'} advocating for [position] while ${room.player2?.name || 'Player 2'} argued for [counter-position]. Both presented data-driven arguments about [key themes].",
  "pointsOfContention": [
    "Main point of disagreement 1",
    "Main point of disagreement 2",
    "Main point of disagreement 3"
  ],
  "contentionAnalysis": [
    {
      "title": "Contention Name",
      "criteria": "Assessed on [specific criteria for this contention]",
      "player1Analysis": "${room.player1?.name || 'Player 1'} presented [analysis of their arguments, strengths, and weaknesses]",
      "player2Analysis": "${room.player2?.name || 'Player 2'} countered with [analysis of their arguments, strengths, and weaknesses]",
      "outcome": "[Who won this contention and why, with specific reasoning]"
    }
  ],
  "holisticVerdict": "[2-4 sentences explaining the overall winner based on weighing all contentions and their importance]",
  "aiInsights": [
    "Pattern or insight about the debate dynamics",
    "Analysis of argumentation quality or fallacies"
  ],
  "nextSteps": [
    "Actionable advice for participants",
    "Recommendations for future discussions"
  ]
}`;

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
    
    console.log('Raw analysis result (first 500 chars):', analysis.substring(0, 500));
    console.log('Raw analysis result (last 200 chars):', analysis.substring(Math.max(0, analysis.length - 200)));
    
    // Parse JSON response
    let parsedAnalysis;
    let winner, reason;
    
    console.log('Raw analysis response:', analysis);
    
    // Try to parse as JSON first
    try {
      parsedAnalysis = JSON.parse(analysis);
      console.log('Successfully parsed JSON:', parsedAnalysis);
    } catch (error) {
      console.error('Failed to parse JSON analysis:', error);
      
      // Try to extract JSON from text response (sometimes AI wraps it in markdown or adds extra text)
      let jsonText = analysis;
      
      // Remove markdown code blocks if present
      const markdownMatch = analysis.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (markdownMatch) {
        jsonText = markdownMatch[1];
      }
      
      // Find the JSON object (from first { to last })
      const firstBrace = jsonText.indexOf('{');
      const lastBrace = jsonText.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        
        try {
          parsedAnalysis = JSON.parse(jsonText);
          console.log('Extracted JSON from text:', parsedAnalysis);
        } catch (e) {
          console.error('Failed to parse extracted JSON:', e);
          console.error('Extracted text was:', jsonText.substring(0, 200));
          parsedAnalysis = null;
        }
      } else {
        console.error('No valid JSON structure found in response');
        parsedAnalysis = null;
      }
    }
    
    // Extract winner and reason from parsed JSON or fallback
    if (parsedAnalysis && parsedAnalysis.winner) {
      winner = parsedAnalysis.winner.player || 'player1';
      reason = parsedAnalysis.holisticVerdict || 'Analysis completed';
      console.log('Using JSON parsed winner:', winner);
    } else {
      console.log('Falling back to regex parsing');
      // Fallback parsing for non-JSON responses
      const winnerMatch = analysis.match(/🏆 Winner:\s*(.*?)(?:\n|$)/i) || 
                         analysis.match(/WINNER:\s*(player[12]|[A-Za-z\s\(\)]+)/i);
      const reasonMatch = analysis.match(/REASON:\s*(.+)/i);
      
      const winnerRaw = winnerMatch?.[1] || 'player1';
      console.log('Regex found winner:', winnerRaw);
      
      // Map name-based winners to player numbers
      if (winnerRaw.toLowerCase().includes(room.player1?.name?.toLowerCase() || 'player1')) {
        winner = 'player1';
      } else if (winnerRaw.toLowerCase().includes(room.player2?.name?.toLowerCase() || 'player2')) {
        winner = 'player2';
      } else if (winnerRaw.match(/^player[12]$/i)) {
        winner = winnerRaw.toLowerCase();
      } else {
        winner = 'player1'; // default
      }
      
      reason = reasonMatch?.[1] || 'Analysis completed';
    }

    // If we don't have parsed analysis, create a minimal fallback
    if (!parsedAnalysis) {
      console.log('Creating fallback parsed analysis');
      parsedAnalysis = {
        winner: {
          name: winner === 'player1' ? (room.player1?.name || 'Player 1') : (room.player2?.name || 'Player 2'),
          player: winner,
          score: "7.5/10"
        },
        scores: {
          player1: { overall: 7, breakdown: { logicalCoherence: 7, evidence: 7, relevance: 7, counterarguments: 7, feasibility: 7, persuasiveness: 7 } },
          player2: { overall: 6, breakdown: { logicalCoherence: 6, evidence: 6, relevance: 6, counterarguments: 6, feasibility: 6, persuasiveness: 6 } }
        },
        debateSummary: "The debate covered key considerations with both sides presenting compelling arguments.",
        pointsOfContention: [
          "Main point of disagreement 1",
          "Main point of disagreement 2",
          "Main point of disagreement 3"
        ],
        contentionAnalysis: [
          {
            title: "Primary Contention",
            criteria: "Assessed on logical coherence and evidence quality",
            player1Analysis: `${room.player1?.name || 'Player 1'} presented arguments supporting their position`,
            player2Analysis: `${room.player2?.name || 'Player 2'} countered with alternative viewpoints`,
            outcome: "Close contention with valid points on both sides"
          }
        ],
                 holisticVerdict: reason || "Based on the analysis of the contentions, the winner demonstrated stronger overall argumentation with better evidence and logical coherence.",
        aiInsights: ["Both participants demonstrated analytical skills", "Arguments were well-structured"],
        nextSteps: ["Consider alternative approaches", "Conduct further research"]
      };
    }

    console.log('Parsed results:', { winner, parsedAnalysis: !!parsedAnalysis });

    return NextResponse.json({
      success: true,
      winner,
      summary: parsedAnalysis.debateSummary || 'Analysis completed',
      reasoning: parsedAnalysis.holisticVerdict || 'Analysis completed',
      winnerName: winner === 'player1' ? 
        (room.player1?.name || 'Player 1') : 
        (room.player2?.name || 'Player 2'),
      parsedAnalysis
    });

  } catch (error) {
    console.error('Winner analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze winner' },
      { status: 500 }
    );
  }
}