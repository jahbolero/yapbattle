import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { roomStore } from '@/lib/room-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient();
    const roomId = params.roomId;

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get room from store or create default
    let room = roomStore.get(roomId);
    
    if (!room) {
      // Check if this is the room creator by checking the roomId pattern
      const isCreator = roomId.includes(user.id);
      
      // If room doesn't exist and user isn't the creator, return error
      if (!isCreator) {
        return NextResponse.json({ error: 'Room not found' }, { status: 404 });
      }

      room = {
        id: roomId,
        title: 'Debate Room',
        topic: 'General Discussion',
        rounds: 3,
        minutesPerTurn: 2,
        currentRound: 1,
        currentTurn: null,
        status: 'waiting',
        createdAt: new Date().toISOString(),
      };

      if (isCreator) {
        room.player1 = {
          id: user.id,
          name: user.email?.split('@')[0] || 'Player 1',
          isReady: false,
          joinedAt: new Date().toISOString(),
        };
      }

      roomStore.set(roomId, room);
    }

    // Determine player role
    let playerRole = 'spectator';
    let roomUpdated = false;
    
    if (room.player1?.id === user.id) {
      playerRole = 'player1';
    } else if (room.player2?.id === user.id) {
      playerRole = 'player2';
    } else if (!room.player2) {
      // Join as player2
      room.player2 = {
        id: user.id,
        name: user.email?.split('@')[0] || 'Player 2',
        isReady: false,
        joinedAt: new Date().toISOString(),
      };
      playerRole = 'player2';
      roomUpdated = true;
      roomStore.set(roomId, room);
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
  { params }: { params: { roomId: string } }
) {
  try {
    const supabase = await createClient();
    const roomId = params.roomId;
    const updatedRoom = await request.json();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update room in store
    roomStore.set(roomId, updatedRoom);

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