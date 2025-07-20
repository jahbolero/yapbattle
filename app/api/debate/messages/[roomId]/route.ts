import { NextRequest, NextResponse } from 'next/server';
import { DebateDatabase } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    // Get messages from database
    const db = new DebateDatabase();
    const dbMessages = await db.getMessages(roomId);
    const messages = dbMessages.map(DebateDatabase.convertToDebateMessage);

    return NextResponse.json({
      success: true,
      messages,
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const message = await request.json();

    // Save message to database
    const db = new DebateDatabase();
    const dbMessage = await db.addMessage({
      room_id: roomId,
      player_name: message.user.name,
      content: message.content,
      round: message.round,
      turn: message.turn
    });

    const savedMessage = DebateDatabase.convertToDebateMessage(dbMessage);

    return NextResponse.json({
      success: true,
      message: savedMessage,
    });

  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}