import { NextRequest, NextResponse } from 'next/server';
import { roomStore } from '@/lib/room-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const { playerName } = await request.json();

    if (!playerName) {
      return NextResponse.json({ error: 'Player name required' }, { status: 400 });
    }

    // Get room from store or create default
    const room = roomStore?.get(roomId);
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Determine player role
    let playerRole = 'spectator';
    let roomUpdated = false;
    
    // Check if player is already in the room
    if (room.player1?.name === playerName) {
      playerRole = 'player1';
    } else if (room.player2?.name === playerName) {
      playerRole = 'player2';
    } else if (!room.player2) {
      // Join as player2
      room.player2 = {
        id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: playerName,
        isReady: false,
        joinedAt: new Date().toISOString(),
      };
      playerRole = 'player2';
      roomUpdated = true;
      if (roomStore) {
        roomStore.set(roomId, room);
      }
    } else {
      // Room is full, join as spectator
      playerRole = 'spectator';
    }

    return NextResponse.json({
      success: true,
      room,
      playerRole,
      roomUpdated, // Signal if room was updated so client can broadcast
    });

  } catch (error) {
    console.error('Error getting room:', error);
    return NextResponse.json(
      { error: 'Failed to get room' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const updatedRoom = await request.json();

    // Update room in store
    if (roomStore) {
      roomStore.set(roomId, updatedRoom);
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { error: 'Failed to update room' },
      { status: 500 }
    );
  }
}