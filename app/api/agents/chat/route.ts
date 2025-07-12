import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, agentType = 'summary_agent' } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const response = await fetch('https://api.intelligence.io.solutions/api/v1/workflows/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.IONET_API_KEY}`
      },
      body: JSON.stringify({
        text: message,
        agent_names: [agentType],
        args: { 
          type: agentType === 'summary_agent' ? 'summarize_text' : 'analyze_text',
          max_words: 100
        }
      })
    });

    if (!response.ok) {
      throw new Error(`IO.NET API error: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      agent_response: data.result || data.summary || data.response,
      agent_type: agentType
    });

  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { error: 'Failed to process with AI agent', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}