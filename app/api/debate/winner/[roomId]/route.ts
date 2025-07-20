import { NextRequest, NextResponse } from 'next/server';
import { DebateDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    console.log('Fetching winner analysis for room:', roomId);

    const db = new DebateDatabase();
    const winnerAnalysis = await db.getWinnerAnalysis(roomId);

    if (!winnerAnalysis) {
      return NextResponse.json({ 
        error: 'No winner analysis found for this room' 
      }, { status: 404 });
    }

    // Convert database format to frontend format
    const analysisData = winnerAnalysis.analysis_data as Record<string, unknown>;
    
    return NextResponse.json({
      success: true,
      winner: winnerAnalysis.winner_player,
      summary: winnerAnalysis.summary || 'Analysis completed',
      reasoning: winnerAnalysis.reasoning || 'Analysis completed',
      winnerName: winnerAnalysis.winner_name,
      isTie: analysisData?.isTie || false,
      parsedAnalysis: analysisData || null
    });

  } catch (error) {
    console.error('Error fetching winner analysis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch winner analysis' },
      { status: 500 }
    );
  }
} 