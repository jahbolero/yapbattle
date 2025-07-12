import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { roomStore } from '@/lib/room-store';
import type { DebateRoom } from '@/types/debate';

export async function POST(request: NextRequest) {
  try {
    const { title, topic, rounds, minutesPerTurn } = await request.json();
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create room ID with creator ID to identify the creator
    const roomId = `debate-${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const debateRoom: Partial<DebateRoom> = {
      id: roomId,
      title,
      topic,
      rounds,
      minutesPerTurn,
      currentRound: 1,
      currentTurn: null,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      player1: {
        id: user.id,
        name: user.email?.split('@')[0] || 'Player 1',
        isReady: false,
        joinedAt: new Date().toISOString(),
      },
    };

    // Save the room to the room store so it persists
    roomStore.set(roomId, debateRoom);
    
    return NextResponse.json({
      success: true,
      roomId,
      room: debateRoom,
    });

  } catch (error) {
    console.error('Error creating debate room:', error);
    return NextResponse.json(
      { error: 'Failed to create room' },
      { status: 500 }
    );
  }
}