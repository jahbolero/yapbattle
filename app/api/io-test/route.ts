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

  const prompt = `You are an impartial AI arbiter tasked with analyzing a debate between two participants on any topic, drawing from parliamentary debate judging principles. Evaluate arguments solely on their merit, using only the content in the transcript—no bias, personal preferences, emotions, or external knowledge. Determine the winner holistically by identifying points of contention, assessing how well each side argues and rebuts on each, and weighing their importance and performance. Delve deeply into nuances, such as subtle assumptions, implicit biases in reasoning, logical fallacies, evidence depth, rebuttal specificity, and how arguments evolve across rounds.

DEBATE TOPIC: ${room.topic}

DEBATE TRANSCRIPT:
${debateText}

Process:

Summarize the key points and overall flow of the debate in detail, tracing how arguments build, clash, and resolve (or fail to) across rounds.
Identify 4-6 main points of contention (battlegrounds where arguments clash deeply, e.g., timing, costs, ethics, assumptions, implications), ensuring they capture both explicit clashes and subtle divergences.
For each contention, establish 3-5 tailored criteria adapted to the topic (e.g., logical coherence, evidence use and quality, rebuttal effectiveness and specificity, relevance and depth, feasibility and practicality, persuasiveness and nuance-handling).
Analyze per contention: Extract and cite exact key arguments/rebuttals from each side across all rounds; evaluate strengths (e.g., data-backed with specifics, anticipates and preempts counters, addresses nuances) and weaknesses (e.g., unsupported claims, ignored objections, fallacies like ad hominem or strawman, oversimplifications); explain interactions in depth (how one side's point directly relates to, undermines, or fails to engage the other's, including evolution over rounds); justify who "won" that contention based on criteria, with nuanced reasoning on why specific elements tip the scale.
Score each participant out of 10 overall (weighted average of criteria like Logical Coherence, Evidence Use, Relevance, Counterarguments, Feasibility, Persuasiveness), and provide per-contention mini-scores (e.g., 7/10 for ${room.player1} on this battleground) with breakdowns.
Compare holistically: Weigh contentions by importance (e.g., core to topic > peripheral; assign explicit weights like 40% for central issues); factor in overall debate dynamics like consistency, adaptability, and engagement; declare a tie only if performances are truly indistinguishable after granular review.
Remain neutral: Base on substantive content only—no favoritism to style, rhetoric, or superficial elements; highlight any unaddressed nuances fairly.
Provide AI-unique insights: Use semantic analysis to flag patterns like fallacy frequency, evidence density, sentiment shifts, argument evolution, or rhetorical strategies; quantify where possible (e.g., "${room.player1} used 3 fallacies vs. ${room.player2}'s 1").
Explain thought process transparently throughout to substantiate the verdict, reduce dissatisfaction, and build trust—treat this as a detailed judicial opinion.
When explaining whether an argument was strong or weak, cite the exact argument verbatim from the transcript, dissect its components (e.g., premise, evidence, conclusion), and explain why it succeeds/fails in context, including any nuances like contextual relevance or round-specific adaptations. Similar to how a judge would explain their decision in a court case with granular detail.
When referring to clashing arguments between the two players, cite exact quotes from both, explain why one was stronger or weaker (e.g., better evidence, more direct rebuttal, handling of nuances), how it was countered (or not), and any ripple effects on the debate flow.
THERE SHOULD ABSOLUTELY BE NO BIAS VS ${room.player1} OR ${room.player2}. THEY WILL BE ASSESSED FAIRLY, REGARDLESS WHO THEY ARE. 
Should it be absolutely necessary, declare a tie.

CRITICAL INSTRUCTIONS:

Return ONLY a valid JSON object
Do not include ANY text before or after the JSON
Do not wrap in markdown code blocks or backticks
Do not include explanations or commentary
Start directly with { and end with }
Ensure all strings are properly quoted
Use double quotes for all JSON keys and string values
Return your analysis as a JSON object with exactly this structure:

{
"winner": {
"name": "${room.player1}",
"player": "player1",
"score": "X/10"
},
"scores": {
"player1": {
"overall": X,
"breakdown": {
"logicalCoherence": X,
"evidence": X,
"relevance": X,
"counterarguments": X,
"feasibility": X,
"persuasiveness": X
}
},
"player2": {
"overall": X,
"breakdown": {
"logicalCoherence": X,
"evidence": X,
"relevance": X,
"counterarguments": X,
"feasibility": X,
"persuasiveness": X
}
}
},
"debateSummary": "The debate centered on [topic], with ${room.player1} advocating for [position] while ${room.player2} argued for [counter-position]. Both presented data-driven arguments about [key themes]. The debate flow evolved as [detailed tracing of rounds and shifts].The debate was [high/medium/low] quality, [brutally honest assessment: e.g., strong in engagement but weak in depth due to unaddressed nuances; or superficial with poor rebuttal specificity, leading to unresolved clashes]. Provide a 100-150 word comprehensive assessment of debate quality, focusing on structure, engagement depth, argument sophistication, nuance handling, and overall informativeness for a third party—be critical and specific without hinting at winner.",
"pointsOfContention": [
"Main point of disagreement 1",
"Main point of disagreement 2",
"Main point of disagreement 3",
"Main point of disagreement 4"
],
"contentionAnalysis": [
{
"title": "Contention Name",
"criteria": "Assessed on [3-5 specific criteria for this contention, e.g., logical coherence, evidence quality, rebuttal specificity]",
"player1Analysis": "${room.player1} presented [detailed analysis with verbatim cites, strengths/weaknesses dissection, nuances; 150-250 words for depth]",
"player2Analysis": "${room.player2} countered with [detailed analysis with verbatim cites, strengths/weaknesses dissection, nuances; 150-250 words for depth]",
"outcome": "[Who won this contention and why, with granular reasoning citing exact arguments, interactions, and criteria application; include mini-scores like ${room.player1}: 8/10, ${room.player2}: 6/10; 100-150 words]",
"miniScores": {
"player1": X,
"player2": X
}
}
],
"holisticVerdict": "[400-500 word detailed summary explaining the overall winner: weigh contentions with explicit percentages (e.g., Contention 1: 30% weight), discuss interplay, unaddressed nuances, overall dynamics; transparent thought process on why the scales tip, ensuring satisfaction through depth]",
"aiInsights": [
"Insight 1: [e.g., Semantic analysis shows ${room.player1}'s evidence density at 40% higher; flag specific fallacies with cites]",
"Insight 2: [e.g., Pattern of sentiment shifts from assertive to defensive in Round 2]",
"Insight 3: [Additional unique analysis]"
],
"nextSteps": [
"Specific actionable advice for ${room.player1}: [e.g., Strengthen rebuttals by addressing X nuance]",
"Specific actionable advice for ${room.player2}: [e.g., Bolster evidence with more verifiable cites]",
"General recommendations for future debates: [e.g., Focus on round-to-round adaptation]"
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
      model: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      messages: [
        {
          role: "system",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_completion_tokens: 3000
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
      const rawWinner = parsedAnalysis.winner.player || 'player1';
      reason = parsedAnalysis.holisticVerdict || 'Analysis completed';
      console.log('Using JSON parsed winner:', rawWinner);
      
      // Handle tie cases - map 'tie' to a valid database value
      if (rawWinner.toLowerCase() === 'tie') {
        winner = 'player1'; // Default to player1 for database constraint, but mark as tie in analysis
        console.log('Detected tie, mapping to player1 for database constraint');
      } else {
        winner = rawWinner;
      }
    } else {
    console.log('Falling back to regex parsing');
    // Fallback parsing for non-JSON responses
    const winnerMatch = analysis.match(/🏆 Winner:\s*(.*?)(?:\n|$)/i) || 
                       analysis.match(/WINNER:\s*(player[12]|[A-Za-z\s\(\)]+)/i);
    const reasonMatch = analysis.match(/REASON:\s*(.+)/i);
    
    const winnerRaw = winnerMatch?.[1] || 'player1';
    console.log('Regex found winner:', winnerRaw);
    
    // Map name-based winners to player numbers
    if (winnerRaw.toLowerCase().includes(room.player1.toLowerCase()) || winnerRaw.toLowerCase().includes('marcus') || winnerRaw.toLowerCase().includes('chen') || winnerRaw.toLowerCase().includes('ceo')) {
      winner = 'player1';
    } else if (winnerRaw.toLowerCase().includes(room.player2.toLowerCase()) || winnerRaw.toLowerCase().includes('diana') || winnerRaw.toLowerCase().includes('rodriguez') || winnerRaw.toLowerCase().includes('cfo')) {
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
        score: "X/10"
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
          player1Analysis: `${room.player1} argued for immediate expansion to capture market opportunities`,
          player2Analysis: `${room.player2} advocated for domestic consolidation before international expansion`,
          outcome: "Close contention with valid points on both sides",
          miniScores: {
            player1: 7,
            player2: 6
          }
        }
      ],
      holisticVerdict: reason || "Based on the analysis of the contentions, the winner demonstrated stronger overall argumentation with better evidence and logical coherence.",
      aiInsights: ["Both participants demonstrated strong analytical skills", "Arguments were well-supported with data"],
      nextSteps: ["Consider hybrid approach", "Conduct deeper market analysis"]
    };
  }

  console.log('Parsed results:', { winner, parsedAnalysis: !!parsedAnalysis });

  // Check if this was actually a tie
  const isTie = parsedAnalysis?.winner?.player?.toLowerCase() === 'tie';

  return NextResponse.json({
    success: true,
    room,
    rawResponse: analysis,
    parsedAnalysis: {
      ...parsedAnalysis,
      isTie: isTie
    },
    winner,
    reason,
    winnerName: winner === 'player1' ? room.player1 : room.player2,
    isTie: isTie
  });
}