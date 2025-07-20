import { createClient } from '@/lib/supabase/server';
import type { DebateRoom, DebateMessage } from '@/types/debate';

export interface DatabaseRoom {
  id: string;
  title: string;
  topic: string;
  status: 'waiting' | 'ready' | 'active' | 'finished';
  rounds: number;
  current_round: number;
  current_turn: 'player1' | 'player2' | null;
  minutes_per_turn: number;
  started_at: string | null;
  turn_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseParticipant {
  id: string;
  room_id: string;
  player_name: string;
  player_role: 'player1' | 'player2' | 'spectator';
  is_ready: boolean;
  joined_at: string;
}

export interface DatabaseMessage {
  id: string;
  room_id: string;
  player_name: string;
  content: string;
  round: number;
  turn: 'player1' | 'player2';
  created_at: string;
}

export interface DatabaseWinner {
  id: string;
  room_id: string;
  winner_name: string;
  winner_player: 'player1' | 'player2';
  score: string | null;
  summary: string | null;
  reasoning: string | null;
  analysis_data: Record<string, unknown> | null;
  created_at: string;
}

export class DebateDatabase {
  // Room operations
  async createRoom(room: Omit<DatabaseRoom, 'created_at' | 'updated_at'>): Promise<DatabaseRoom> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_rooms')
      .insert(room)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getRoom(roomId: string): Promise<DatabaseRoom | null> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  }

  async updateRoom(roomId: string, updates: Partial<DatabaseRoom>): Promise<DatabaseRoom> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_rooms')
      .update(updates)
      .eq('id', roomId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const client = await createClient();
    const { error } = await client
      .from('debate_rooms')
      .delete()
      .eq('id', roomId);

    if (error) throw error;
  }

  // Participant operations
  async addParticipant(participant: Omit<DatabaseParticipant, 'id' | 'joined_at'>): Promise<DatabaseParticipant> {
    const client = await createClient();
    const participantId = `participant-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const { data, error } = await client
      .from('debate_participants')
      .insert({
        ...participant,
        id: participantId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getParticipants(roomId: string): Promise<DatabaseParticipant[]> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async updateParticipant(participantId: string, updates: Partial<DatabaseParticipant>): Promise<DatabaseParticipant> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_participants')
      .update(updates)
      .eq('id', participantId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeParticipant(participantId: string): Promise<void> {
    const client = await createClient();
    const { error } = await client
      .from('debate_participants')
      .delete()
      .eq('id', participantId);

    if (error) throw error;
  }

  // Message operations
  async addMessage(message: Omit<DatabaseMessage, 'id' | 'created_at'>): Promise<DatabaseMessage> {
    const client = await createClient();
    const messageId = `message-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const { data, error } = await client
      .from('debate_messages')
      .insert({
        ...message,
        id: messageId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getMessages(roomId: string): Promise<DatabaseMessage[]> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async deleteMessages(roomId: string): Promise<void> {
    const client = await createClient();
    const { error } = await client
      .from('debate_messages')
      .delete()
      .eq('room_id', roomId);

    if (error) throw error;
  }

  // Winner analysis operations
  async saveWinnerAnalysis(analysis: Omit<DatabaseWinner, 'id' | 'created_at'>): Promise<DatabaseWinner> {
    const client = await createClient();
    const winnerId = `winner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    
    const { data, error } = await client
      .from('debate_winners')
      .insert({
        ...analysis,
        id: winnerId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getWinnerAnalysis(roomId: string): Promise<DatabaseWinner | null> {
    const client = await createClient();
    const { data, error } = await client
      .from('debate_winners')
      .select('*')
      .eq('room_id', roomId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data;
  }

  // Helper methods to convert between database and application types
  static convertToDebateRoom(dbRoom: DatabaseRoom, participants: DatabaseParticipant[]): DebateRoom {
    const player1 = participants.find(p => p.player_role === 'player1');
    const player2 = participants.find(p => p.player_role === 'player2');

    return {
      id: dbRoom.id,
      title: dbRoom.title,
      topic: dbRoom.topic,
      status: dbRoom.status,
      rounds: dbRoom.rounds,
      currentRound: dbRoom.current_round,
      currentTurn: dbRoom.current_turn,
      minutesPerTurn: dbRoom.minutes_per_turn,
      startedAt: dbRoom.started_at || undefined,
      finishedAt: undefined, // Not in your schema
      turnStartedAt: dbRoom.turn_started_at || undefined,
      createdAt: dbRoom.created_at,
      player1: player1 ? {
        id: player1.id,
        name: player1.player_name,
        isReady: player1.is_ready,
        joinedAt: player1.joined_at
      } : undefined,
      player2: player2 ? {
        id: player2.id,
        name: player2.player_name,
        isReady: player2.is_ready,
        joinedAt: player2.joined_at
      } : undefined
    };
  }

  static convertToDebateMessage(dbMessage: DatabaseMessage): DebateMessage {
    return {
      id: dbMessage.id,
      content: dbMessage.content,
      createdAt: dbMessage.created_at,
      user: {
        id: dbMessage.id, // Using message id as user id for now
        name: dbMessage.player_name
      },
      room: dbMessage.room_id,
      round: dbMessage.round,
      turn: dbMessage.turn
    };
  }

  static convertToDatabaseRoom(debateRoom: DebateRoom): Omit<DatabaseRoom, 'id' | 'created_at' | 'updated_at'> {
    return {
      title: debateRoom.title,
      topic: debateRoom.topic,
      status: debateRoom.status,
      rounds: debateRoom.rounds,
      current_round: debateRoom.currentRound,
      current_turn: debateRoom.currentTurn,
      minutes_per_turn: debateRoom.minutesPerTurn,
      started_at: debateRoom.startedAt || null,
      turn_started_at: debateRoom.turnStartedAt || null
    };
  }
} 