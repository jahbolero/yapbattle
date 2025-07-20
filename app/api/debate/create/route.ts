import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/room-store';
import type { DebateRoom } from '@/types/debate';

export async function POST(request: NextRequest) {
  try {
    const { title, topic, rounds, minutesPerTurn, playerName } = await request.json();
    
    // Validate required fields
    if (!title || !topic || !playerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create room ID without user ID dependency
    const roomId = `debate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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
        id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: playerName,
        isReady: false,
        joinedAt: new Date().toISOString(),
      },
    };

    // Save the room to the room store so it persists
    if (roomStore) {
      roomStore.set(roomId, debateRoom);
    }
    
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