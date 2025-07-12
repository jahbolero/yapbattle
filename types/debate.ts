import type { ChatMessage } from '@/hooks/use-realtime-chat';

export interface DebateRoom {
  id: string;
  title: string;
  topic: string;
  rounds: number;
  minutesPerTurn: number;
  currentRound: number;
  currentTurn: 'player1' | 'player2' | null;
  status: 'waiting' | 'ready' | 'active' | 'finished';
  player1?: DebatePlayer;
  player2?: DebatePlayer;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  turnStartedAt?: string;
}

export interface DebatePlayer {
  id: string;
  name: string;
  isReady: boolean;
  joinedAt: string;
}

export interface DebateMessage extends ChatMessage {
  round: number;
  turn: 'player1' | 'player2';
}

export interface DebateState {
  timeLeft: number;
  isMyTurn: boolean;
  canSendMessage: boolean;
}