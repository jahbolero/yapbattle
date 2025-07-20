import { NextRequest, NextResponse } from 'next/server';
import { DebateDatabase } from '@/lib/database';

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

    const db = new DebateDatabase();
    
    // Get room from database
    const dbRoom = await db.getRoom(roomId);
    if (!dbRoom) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Get existing participants
    const participants = await db.getParticipants(roomId);
    const player1 = participants.find(p => p.player_role === 'player1');
    const player2 = participants.find(p => p.player_role === 'player2');

    // Determine player role
    let playerRole = 'spectator';
    let roomUpdated = false;
    
    // Check if player is already in the room
    if (player1?.player_name === playerName) {
      playerRole = 'player1';
    } else if (player2?.player_name === playerName) {
      playerRole = 'player2';
    } else if (!player2) {
      // Join as player2
      await db.addParticipant({
        room_id: roomId,
        player_name: playerName,
        player_role: 'player2',
        is_ready: false
      });
      playerRole = 'player2';
      roomUpdated = true;
    } else {
      // Room is full, join as spectator
      playerRole = 'spectator';
    }

    // Get updated room data
    const updatedParticipants = await db.getParticipants(roomId);
    const room = DebateDatabase.convertToDebateRoom(dbRoom, updatedParticipants);

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

    // Update room in database
    const db = new DebateDatabase();
    const dbRoomUpdate = DebateDatabase.convertToDatabaseRoom(updatedRoom);
    await db.updateRoom(roomId, dbRoomUpdate);

    // Update participants if needed
    if (updatedRoom.player1) {
      const participants = await db.getParticipants(roomId);
      const player1 = participants.find(p => p.player_role === 'player1');
      if (player1) {
        await db.updateParticipant(player1.id, {
          is_ready: updatedRoom.player1.isReady
        });
      }
    }

    if (updatedRoom.player2) {
      const participants = await db.getParticipants(roomId);
      const player2 = participants.find(p => p.player_role === 'player2');
      if (player2) {
        await db.updateParticipant(player2.id, {
          is_ready: updatedRoom.player2.isReady
        });
      }
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