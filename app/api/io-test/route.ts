import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log("Testing business expansion debate");
    // Complex 5-round business expansion debate
    const room = {
      topic: "Should TechCorp expand internationally to Asia-Pacific markets now, or focus on consolidating domestic market share first?",
      player1: "Marcus Chen (CEO)",
      player2: "Diana Rodriguez (CFO)",
      messages: [
        "Marcus Chen (CEO): We need to strike while the iron is hot in the Asia-Pacific region. Our competitors are already establishing footholds in Singapore, Tokyo, and Sydney, and every quarter we delay costs us market share that will be exponentially harder to reclaim. The smartphone penetration rates in these markets have grown 340% in the past three years, creating an unprecedented window for our fintech solutions. Our Q3 revenue growth of 23% gives us the capital runway to fund international operations, and our cloud infrastructure can scale globally with minimal additional overhead costs.",
        
        "Diana Rodriguez (CFO): Marcus, that 23% growth is exactly why we should consolidate domestically first. We're sitting on a goldmine here - our customer acquisition cost has dropped 31% while lifetime value increased 45% in our core markets. Rushing into Asia-Pacific would require $12-15 million in upfront investments for regulatory compliance, localization, and market entry, plus ongoing operational costs of $2-3 million quarterly. Our domestic market penetration is only at 8% - we could realistically capture another 15-20% market share by doubling down on marketing and product development here, generating higher ROI with lower risk.",
        
        "Marcus Chen (CEO): Diana's numbers don't account for the velocity factor. Yes, domestic expansion is safer, but it's also saturated competition. We're fighting seven established players for scraps, while Asia-Pacific markets have 2-3 major competitors maximum. The regulatory hurdles she mentions are actually advantages - once we navigate them, they become barriers protecting us from new entrants. Singapore's fintech sandbox program offers expedited regulatory approval, and our partnerships with HSBC and Standard Chartered already give us banking infrastructure access. The $15 million investment will pay for itself within 18 months if we capture just 5% market share in three key cities.",
        
        "Diana Rodriguez (CFO): Marcus is romanticizing the opportunity while ignoring execution risks. Those 'partnerships' with HSBC and Standard Chartered are preliminary discussions, not signed contracts. Cultural localization alone will consume 6-8 months and require hiring 40-50 local employees per market. Our current team is already stretched thin managing our domestic growth trajectory - our customer support response times have increased 23% and our engineering velocity has slowed 15% due to technical debt. Spreading our resources across continents will dilute our core competency and potentially damage our domestic foundation, which still generates 89% of our revenue.",
        
        "Marcus Chen (CEO): Diana's missing the strategic chess game here. Our domestic competitors are also eyeing international expansion - if we don't move now, we'll face them in Asia-Pacific with their increased scale and resources in 12-18 months, making entry infinitely harder. The operational challenges she cites are solvable with proper planning and phased rollouts. We start with Singapore as a testing ground - English-speaking market, friendly regulatory environment, and serves as a gateway to Southeast Asia. The hiring concerns are valid, but we can leverage remote talent and establish regional offices gradually. Most importantly, international revenue streams provide crucial diversification against domestic economic volatility and regulatory changes."
      ]
    };

    return await analyzeDebate(room);
  } catch (error) {
    console.error('IO test error:', error);
    return NextResponse.json({
      error: 'Failed to test io.net API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { topic, player1, player2, messages } = body;

    if (!topic || !player1 || !player2 || !messages || !Array.isArray(messages)) {
      return NextResponse.json({
        error: 'Invalid request data',
        details: 'Missing required fields: topic, player1, player2, messages'
      }, { status: 400 });
    }

    const room = {
      topic,
      player1,
      player2,
      messages
    };

    return await analyzeDebate(room);
  } catch (error) {
    console.error('IO test POST error:', error);
    return NextResponse.json({
      error: 'Failed to test io.net API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function analyzeDebate(room: {
  topic: string;
  player1: string;
  player2: string;
  messages: string[];
}) {
  const debateText = room.messages.join('\n\n');

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

CRITICAL: Return ONLY valid JSON. Do not include any text before or after the JSON. Do not wrap in markdown code blocks. Start with { and end with }.

Return your analysis as a JSON object with exactly this structure:

{
  "winner": {
    "name": "Marcus Chen (CEO)",
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
  "debateSummary": "The debate centered on TechCorp's expansion strategy, with Marcus advocating for immediate international expansion to Asia-Pacific markets while Diana argued for domestic consolidation first. Both presented data-driven arguments about market timing, resource allocation, and competitive positioning.",
  "pointsOfContention": [
    "Timing of international expansion vs domestic consolidation",
    "Resource allocation and operational capacity",
    "Market opportunity assessment and competitive positioning"
  ],
  "contentionAnalysis": [
    {
      "title": "Expansion Timing",
      "criteria": "Assessed on market readiness evidence and competitive urgency arguments",
      "player1Analysis": "Marcus presented strong data on Asia-Pacific market growth (340% smartphone penetration) and competitive threats, arguing for immediate action to capture market share before competitors establish dominance.",
      "player2Analysis": "Diana countered with domestic opportunity data (8% current penetration vs 15-20% potential) and resource constraint concerns, advocating for consolidation before expansion to maximize ROI.",
      "outcome": "Marcus won this contention with more compelling urgency arguments and specific market data, though Diana raised valid resource concerns."
    }
  ],
  "holisticVerdict": "Marcus Chen prevailed by presenting more compelling evidence for market urgency and competitive positioning, while effectively addressing Diana's resource concerns with phased expansion proposals. His strategic vision outweighed Diana's risk-averse approach.",
  "aiInsights": [
    "Marcus used 23% more specific data points and statistics to support arguments",
    "Diana's arguments focused heavily on risk mitigation but lacked counter-proposals for competitive threats"
  ],
  "nextSteps": [
    "Develop detailed phased expansion plan addressing Diana's resource concerns",
    "Conduct deeper competitive analysis of Asia-Pacific market timing"
  ]
}`;

  console.log('Sending to io.net:', {
    prompt: prompt.substring(0, 200) + '...',
    apiKey: process.env.IONET_API_KEY ? 'Present' : 'Missing'
  });

  // Call io.net Chat Completions API directly
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
    
    // Try to extract JSON from text response (sometimes AI wraps it in markdown)
    const jsonMatch = analysis.match(/```json\s*([\s\S]*?)\s*```/) || analysis.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsedAnalysis = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        console.log('Extracted JSON from text:', parsedAnalysis);
      } catch (e) {
        console.error('Failed to parse extracted JSON:', e);
        parsedAnalysis = null;
      }
    } else {
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
    if (winnerRaw.toLowerCase().includes('marcus') || winnerRaw.toLowerCase().includes('chen') || winnerRaw.toLowerCase().includes('ceo')) {
      winner = 'player1';
    } else if (winnerRaw.toLowerCase().includes('diana') || winnerRaw.toLowerCase().includes('rodriguez') || winnerRaw.toLowerCase().includes('cfo')) {
      winner = 'player2';
    } else if (winnerRaw.match(/^player[12]$/i)) {
      winner = winnerRaw.toLowerCase();
    } else {
      winner = 'player1'; // default
    }
    
    reason = reasonMatch?.[1] || analysis || 'Analysis completed';
  }

  // If we don't have parsed analysis, create a minimal fallback
  if (!parsedAnalysis) {
    console.log('Creating fallback parsed analysis');
    parsedAnalysis = {
      winner: {
        name: winner === 'player1' ? room.player1 : room.player2,
        player: winner,
        score: "7.5/10"
      },
      scores: {
        player1: { overall: 7, breakdown: { logicalCoherence: 7, evidence: 7, relevance: 7, counterarguments: 7, feasibility: 7, persuasiveness: 7 } },
        player2: { overall: 6, breakdown: { logicalCoherence: 6, evidence: 6, relevance: 6, counterarguments: 6, feasibility: 6, persuasiveness: 6 } }
      },
      debateSummary: "The debate covered key strategic considerations for business expansion, with both sides presenting compelling arguments.",
      pointsOfContention: [
        "Timing of international expansion",
        "Resource allocation and risk management",
        "Market opportunity vs. domestic consolidation"
      ],
      contentionAnalysis: [
        {
          title: "Expansion Timing",
          criteria: "Assessed on market readiness and competitive positioning",
          player1Analysis: "Argued for immediate expansion to capture market opportunities",
          player2Analysis: "Advocated for domestic consolidation before international expansion",
          outcome: "Close contention with valid points on both sides"
        }
      ],
      holisticVerdict: reason,
      aiInsights: ["Both participants demonstrated strong analytical skills", "Arguments were well-supported with data"],
      nextSteps: ["Consider hybrid approach", "Conduct deeper market analysis"]
    };
  }

  return NextResponse.json({
    success: true,
    room,
    rawResponse: analysis,
    parsedAnalysis,
    winner,
    reason,
    winnerName: winner === 'player1' ? room.player1 : room.player2
  });
}