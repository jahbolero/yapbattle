import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log("Testing business expansion debate");
    // Complex 5-round business expansion debate
    const testDebate = {
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

    const debateText = testDebate.messages.join('\n\n');

    const prompt = `Analyze this corporate strategy debate between two executives and determine the winner based on business merit.

DEBATE TOPIC: ${testDebate.topic}

DEBATE TRANSCRIPT:
${debateText}

Based on the arguments presented, determine which executive makes a stronger business case. Consider factors like financial data, risk management, market opportunity, and strategic thinking.

Format your response exactly as follows:
WINNER: Marcus Chen (CEO) OR Diana Rodriguez (CFO)
REASON: [Explain in 2-3 sentences why this executive's argument was more compelling, citing specific points from their debate]`;

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
    let analysis, winner, reason;
    
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
    
    // Parse winner and reason from analysis
    const winnerMatch = analysis.match(/WINNER:\s*(player[12]|[A-Za-z]+)/i);
    const reasonMatch = analysis.match(/REASON:\s*(.+)/i);
    
    let winnerRaw = winnerMatch?.[1] || 'player1';
    
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

    return NextResponse.json({
      success: true,
      testDebate,
      rawResponse: analysis,
      winner,
      reason,
      winnerName: winner === 'player1' ? testDebate.player1 : testDebate.player2
    });

  } catch (error) {
    console.error('IO test error:', error);
    return NextResponse.json({
      error: 'Failed to test io.net API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}