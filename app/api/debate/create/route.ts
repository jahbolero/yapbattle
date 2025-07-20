import { NextRequest, NextResponse } from 'next/server';
import { DebateDatabase } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { title, topic, rounds, minutesPerTurn, playerName } = await request.json();
    
    // Validate required fields
    if (!title || !topic || !playerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create room ID
    const roomId = `debate-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    // Create room in database
    const db = new DebateDatabase();
    const dbRoom = await db.createRoom({
      id: roomId,
      title,
      topic,
      status: 'waiting',
      rounds: rounds || 3,
      current_round: 1,
      current_turn: null,
      minutes_per_turn: minutesPerTurn || 5,
      started_at: null,
      turn_started_at: null
    });

    // Add player1 as participant
    await db.addParticipant({
      room_id: roomId,
      player_name: playerName,
      player_role: 'player1',
      is_ready: false
    });

    // Convert to DebateRoom format
    const participants = await db.getParticipants(roomId);
    const debateRoom = DebateDatabase.convertToDebateRoom(dbRoom, participants);
    
    return NextResponse.json({
      success: true,
      roomId: dbRoom.id,
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