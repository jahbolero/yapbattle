'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {  Play, Send, Copy, Check } from 'lucide-react';
import type { DebateRoom, DebateMessage } from '@/types/debate';

interface ParsedAnalysis {
  winner: {
    name: string;
    player: string;
    score: string;
  };
  scores: {
    player1: {
      overall: number;
      breakdown: {
        logicalCoherence: number;
        evidence: number;
        relevance: number;
        counterarguments: number;
        feasibility: number;
        persuasiveness: number;
      };
    };
    player2: {
      overall: number;
      breakdown: {
        logicalCoherence: number;
        evidence: number;
        relevance: number;
        counterarguments: number;
        feasibility: number;
        persuasiveness: number;
      };
    };
  };
  debateSummary: string;
  pointsOfContention: string[];
  contentionAnalysis: {
    title: string;
    criteria: string;
    player1Analysis: string;
    player2Analysis: string;
    outcome: string;
  }[];
  holisticVerdict: string;
  aiInsights: string[];
  nextSteps: string[];
}

interface DebateRoomProps {
  room: DebateRoom;
  currentUser: { id: string; name: string };
  playerRole: 'player1' | 'player2' | 'spectator';
  onRoomUpdate: (room: DebateRoom) => void;
}

export function DebateRoomComponent({ room: initialRoom, currentUser, playerRole: initialPlayerRole, onRoomUpdate }: DebateRoomProps) {
  const [room, setRoom] = useState<DebateRoom>(initialRoom);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | 'spectator'>(initialPlayerRole);
  const [winner, setWinner] = useState<{winner: string, summary: string, reasoning: string, winnerName: string, isTie?: boolean, parsedAnalysis?: ParsedAnalysis} | null>(null);
  const [analyzingWinner, setAnalyzingWinner] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  // Store locked-in participant names that persist even if someone leaves
  const [lockedParticipants, setLockedParticipants] = useState<{
    player1Name?: string;
    player2Name?: string;
  }>({});
  const [hasDebateStarted, setHasDebateStarted] = useState(false);
  const [showTurnNotification, setShowTurnNotification] = useState(false);
  const turnNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/debate/room/${room.id}` : '';

  useEffect(() => {
    // Check for saved winner
    const savedWinner = localStorage.getItem(`winner-${room.id}`);
    if (savedWinner) {
      setWinner(JSON.parse(savedWinner));
    }
    
    // Check if debate has started (active, finished, or has messages)
    const debateStarted = initialRoom.status === 'active' || initialRoom.status === 'finished' || !!initialRoom.startedAt;
    setHasDebateStarted(debateStarted);
    
    // Lock in participant names if debate has started
    if (debateStarted) {
      setLockedParticipants({
        player1Name: initialRoom.player1?.name,
        player2Name: initialRoom.player2?.name
      });
    }
    
    // Initialize room state and determine player role
    initializeRoom();
    
    // Load existing messages
    loadMessages();
    
    // Set up realtime connection
    const channel = supabase.channel(`debate-${room.id}`, {
      config: { broadcast: { self: true } },
    });

    channelRef.current = channel;

    channel
      .on('broadcast', { event: 'room-update' }, ({ payload }) => {
        const updatedRoom = payload as DebateRoom;
        
        // Preserve local ready state when receiving room updates
        const currentRoom = room;
        if (playerRole === 'player1' && currentRoom.player1?.isReady !== updatedRoom.player1?.isReady) {
          // Only update if the ready state actually changed
          setIsReady(updatedRoom.player1?.isReady || false);
        } else if (playerRole === 'player2' && currentRoom.player2?.isReady !== updatedRoom.player2?.isReady) {
          // Only update if the ready state actually changed
          setIsReady(updatedRoom.player2?.isReady || false);
        }
        
        setRoom(updatedRoom);
        onRoomUpdate(updatedRoom);
        
        // Lock in participant names once debate starts
        if ((updatedRoom.status === 'active' || updatedRoom.status === 'finished' || updatedRoom.startedAt) && !hasDebateStarted) {
          setHasDebateStarted(true);
          setLockedParticipants({
            player1Name: updatedRoom.player1?.name,
            player2Name: updatedRoom.player2?.name
          });
        }
        
        // Preserve winner data when room updates - don't let room changes clear the analysis
        const savedWinner = localStorage.getItem(`winner-${room.id}`);
        if (savedWinner && !winner) {
          setWinner(JSON.parse(savedWinner));
        }
        
        // Don't auto-trigger analysis anymore
      })
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const message = payload as DebateMessage;
        setMessages(prev => {
          if (prev.some(m => m.id === message.id)) return prev;
          return [...prev, message];
        });
      })
      .on('broadcast', { event: 'timer-start' }, ({ payload }) => {
        const { duration } = payload;
        startTimer(duration);
      })
      .on('broadcast', { event: 'winner-analyzing' }, ({ payload }) => {
        setAnalyzingWinner(payload.analyzing);
      })
      .on('broadcast', { event: 'winner-result' }, ({ payload }) => {
        setWinner(payload);
        localStorage.setItem(`winner-${room.id}`, JSON.stringify(payload));
      })
      .subscribe();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      channel.unsubscribe();
    };
  }, [room.id]);

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/debate/messages/${room.id}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const calculateRemainingTime = () => {
    if (!room.turnStartedAt || room.status !== 'active') return 0;
    
    const turnStartTime = new Date(room.turnStartedAt).getTime();
    const now = new Date().getTime();
    const elapsed = Math.floor((now - turnStartTime) / 1000);
    const totalTime = room.minutesPerTurn * 60;
    const remaining = Math.max(0, totalTime - elapsed);
    
    return remaining;
  };

  // Restore timer state when rejoining
  useEffect(() => {
    if (room.status === 'active' && room.turnStartedAt) {
      const remaining = calculateRemainingTime();
      
      if (remaining > 0) {
        // Timer is still running, restore it
        setTimeLeft(remaining);
        startTimer(remaining);
      } else if (remaining === 0 && room.currentTurn) {
        // Timer expired, force switch turn
        setTimeLeft(0);
        setTimeout(() => switchTurn(), 1000);
      }
    }
  }, [room.status, room.turnStartedAt, room.currentTurn]);

  // Handle broadcasting when a new player joins
  useEffect(() => {
    if ((room as DebateRoom & { _shouldBroadcast?: boolean })._shouldBroadcast && channelRef.current) {
      // Remove the broadcast flag and broadcast the update
      const cleanRoom = { ...room };
      delete (cleanRoom as DebateRoom & { _shouldBroadcast?: boolean })._shouldBroadcast;
      setRoom(cleanRoom);
      
      // Broadcast the room update to notify other players
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-update',
        payload: cleanRoom,
      });
    }
  }, [room]);

  // Check if it's the user's turn and show notification
  useEffect(() => {
    if (room.status === 'active' && room.currentTurn === playerRole) {
      // Clear any existing timeout
      if (turnNotificationTimeoutRef.current) {
        clearTimeout(turnNotificationTimeoutRef.current);
      }
      
      // Show turn notification
      setShowTurnNotification(true);
      
      // Auto-hide after 5 seconds
      const timeout = setTimeout(() => {
        setShowTurnNotification(false);
      }, 5000);
      
      turnNotificationTimeoutRef.current = timeout;
      
      // Cleanup timeout on unmount
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    } else {
      // Hide notification if it's not user's turn
      setShowTurnNotification(false);
      if (turnNotificationTimeoutRef.current) {
        clearTimeout(turnNotificationTimeoutRef.current);
        turnNotificationTimeoutRef.current = null;
      }
    }
  }, [room.currentTurn, room.status, playerRole]);

  const initializeRoom = () => {
    // Determine if user is player1, player2, or spectator based on name
    if (room.player1?.name === currentUser.name) {
      setPlayerRole('player1');
      setIsReady(room.player1?.isReady || false);
    } else if (room.player2?.name === currentUser.name) {
      setPlayerRole('player2');
      setIsReady(room.player2?.isReady || false);
    } else {
      setPlayerRole('spectator');
    }
  };

  const broadcastRoomUpdate = async (updatedRoom: DebateRoom, immediate = false) => {
    // For ready state changes, broadcast immediately
    if (immediate) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'room-update',
        payload: updatedRoom,
      });
    }

    // Save room state to API (can be async)
    try {
      await fetch(`/api/debate/room/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRoom),
      });
    } catch (error) {
      console.error('Error saving room state:', error);
    }

    // If not immediate, broadcast after API save
    if (!immediate) {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'room-update',
        payload: updatedRoom,
      });
    }
  };

  const startTimer = (duration: number) => {
    setTimeLeft(duration);
    if (timerRef.current) clearInterval(timerRef.current);
    
    // Don't start timer if duration is 0 or less
    if (duration <= 0) {
      setTimeLeft(0);
      return;
    }
    
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Time's up, auto-switch turns
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => switchTurn(), 100);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const switchTurn = () => {
    const nextTurn: 'player1' | 'player2' = room.currentTurn === 'player1' ? 'player2' : 'player1';
    let updatedRoom: DebateRoom = {
      ...room,
      currentTurn: nextTurn,
      turnStartedAt: new Date().toISOString(),
    };

    // Check if we've completed a full round (both players have spoken)
    console.log('switchTurn - currentTurn:', room.currentTurn, 'currentRound:', room.currentRound, 'maxRounds:', room.rounds);
    if (room.currentTurn === 'player2') {
      // Player 2 just finished, so we completed a round
      const nextRound = room.currentRound + 1;
      console.log('Player 2 finished, nextRound would be:', nextRound);
      
      if (nextRound > room.rounds) {
        // Debate is finished
        updatedRoom = {
          ...updatedRoom,
          status: 'finished' as const,
          currentTurn: null,
          finishedAt: new Date().toISOString(),
        };
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        setTimeLeft(0);
        
        setRoom(updatedRoom);
        broadcastRoomUpdate(updatedRoom);
        return;
      } else {
        // Move to next round
        updatedRoom.currentRound = nextRound;
        updatedRoom.currentTurn = 'player1' as const; // Player 1 starts each round
      }
    }
    
    setRoom(updatedRoom);
    broadcastRoomUpdate(updatedRoom);
    
    // Start timer for next player (only if debate isn't finished)
    if (updatedRoom.status !== 'finished') {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'timer-start',
        payload: { duration: room.minutesPerTurn * 60 },
      });
    }
  };

  const handleReady = () => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);

    // Create a new room object, being careful to preserve existing player states
    const updatedRoom = { 
      ...room,
      player1: room.player1 ? { ...room.player1 } : undefined,
      player2: room.player2 ? { ...room.player2 } : undefined
    };
    
    // Only update the current player's ready state
    if (playerRole === 'player1' && updatedRoom.player1) {
      updatedRoom.player1.isReady = newReadyState;
    } else if (playerRole === 'player2' && updatedRoom.player2) {
      updatedRoom.player2.isReady = newReadyState;
    }

    // Check if both players exist and are ready
    const bothPlayersExist = updatedRoom.player1 && updatedRoom.player2;
    const bothPlayersReady = updatedRoom.player1?.isReady && updatedRoom.player2?.isReady;
    
    if (bothPlayersExist && bothPlayersReady) {
      updatedRoom.status = 'ready';
    } else if (bothPlayersExist) {
      updatedRoom.status = 'waiting';
    } else {
      // Keep current status if not both players joined yet
      updatedRoom.status = room.status;
    }

    setRoom(updatedRoom);
    broadcastRoomUpdate(updatedRoom, true); // Immediate broadcast for ready state changes
  };

  const startDebate = () => {
    const updatedRoom = {
      ...room,
      status: 'active' as const,
      currentTurn: 'player1' as const,
      startedAt: new Date().toISOString(),
      turnStartedAt: new Date().toISOString(),
    };

    setRoom(updatedRoom);
    broadcastRoomUpdate(updatedRoom);

    // Start timer for player1
    channelRef.current?.send({
      type: 'broadcast',
      event: 'timer-start',
      payload: { duration: room.minutesPerTurn * 60 },
    });
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !canSendMessage()) return;

    // Only player1 and player2 can send messages
    if (playerRole !== 'player1' && playerRole !== 'player2') return;

    const message: DebateMessage = {
      id: `${Date.now()}-${Math.random()}`,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser.id,
        name: currentUser.name || 'Player',
      },
      room: room.id,
      round: room.currentRound,
      turn: playerRole as 'player1' | 'player2',
    };

    setNewMessage('');

    // Broadcast message immediately for instant feedback
    channelRef.current?.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });

    // Save message to API in background
    try {
      await fetch(`/api/debate/messages/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }

    // Switch turn after sending
    setTimeout(() => switchTurn(), 1000);
  };

  const canSendMessage = () => {
    return room.status === 'active' && 
           (playerRole === 'player1' || playerRole === 'player2') &&
           room.currentTurn === playerRole && 
           timeLeft > 0;
  };

  const canSkipTurn = () => {
    return room.status === 'active' && 
           (playerRole === 'player1' || playerRole === 'player2') &&
           room.currentTurn === playerRole;
  };

  const skipTurn = () => {
    if (!canSkipTurn()) return;
    
    // Clear timer and switch turn
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(0);
    switchTurn();
  };

  const analyzeWinner = async () => {
    console.log('analyzeWinner called');
    setAnalyzingWinner(true);
    
    // Broadcast that analysis is starting
    console.log('Broadcasting analysis start');
    channelRef.current?.send({
      type: 'broadcast',
      event: 'winner-analyzing',
      payload: { analyzing: true },
    });
    
    try {
      const response = await fetch('/api/debate/winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id })
      });
      
      const data = await response.json();
      if (data.success) {
        setWinner(data);
        
        // Save to localStorage
        localStorage.setItem(`winner-${room.id}`, JSON.stringify(data));
        
        // Broadcast winner result to all players
        channelRef.current?.send({
          type: 'broadcast',
          event: 'winner-result',
          payload: data,
        });
      }
    } catch (error) {
      console.error('Error analyzing winner:', error);
    } finally {
      setAnalyzingWinner(false);
      
      // Broadcast that analysis is complete
      channelRef.current?.send({
        type: 'broadcast',
        event: 'winner-analyzing',
        payload: { analyzing: false },
      });
    }
  };

  const copyRoomLink = async () => {
    await navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fake progress bar for AI analysis
  useEffect(() => {
    if (analyzingWinner) {
      setAnalysisProgress(0);
      const interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 95) {
            return prev; // Stop at 95% to never complete
          }
          // Start fast, then slow down
          const remaining = 95 - prev;
          const increment = Math.max(0.5, remaining * 0.02);
          return Math.min(95, prev + increment);
        });
      }, 100);

      return () => clearInterval(interval);
    } else {
      setAnalysisProgress(0);
    }
  }, [analyzingWinner]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      {/* Room Header */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">{room.title}</h1>
            <p className="text-gray-700 text-xl font-medium leading-relaxed">{room.topic}</p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant={
              room.status === 'active' ? 'default' : 
              room.status === 'finished' ? 'destructive' : 
              'secondary'
            } className="px-4 py-2 rounded-xl font-medium">
              {room.status === 'finished' ? 'Debate Finished' : room.status}
            </Badge>
            <Button variant="outline" size="sm" onClick={copyRoomLink} className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          </div>
        </div>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {(lockedParticipants.player1Name || room.player1?.name || 'P1').charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">
                  {lockedParticipants.player1Name || room.player1?.name || 'Waiting...'}
                  {winner?.parsedAnalysis?.winner?.player === 'player1' && ' 👑'}
                </div>
                <div className="text-sm text-gray-700">Player 1</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {room.currentTurn === 'player1' && room.status === 'active' && (
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl">Your Turn</Badge>
              )}
              {!hasDebateStarted && room.player1?.isReady && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 px-4 py-2 rounded-xl">Ready</Badge>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-200/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-xl">
                  {(lockedParticipants.player2Name || room.player2?.name || 'P2').charAt(0)}
                </span>
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-lg">
                  {lockedParticipants.player2Name || room.player2?.name || 'Waiting...'}
                  {winner?.parsedAnalysis?.winner?.player === 'player2' && ' 👑'}
                </div>
                <div className="text-sm text-gray-700">Player 2</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {room.currentTurn === 'player2' && room.status === 'active' && (
                <Badge variant="default" className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-xl">Your Turn</Badge>
              )}
              {!hasDebateStarted && room.player2?.isReady && (
                <Badge variant="outline" className="border-purple-300 text-purple-700 px-4 py-2 rounded-xl">Ready</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      {playerRole !== 'spectator' && room.status === 'waiting' && !hasDebateStarted && room.player1 && room.player2 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50 text-center">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Ready Up</h3>
          <Button 
            onClick={handleReady} 
            size="lg" 
            className={isReady 
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl h-14 text-lg font-medium shadow-lg transform transition-all duration-200 hover:scale-105' 
              : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl h-14 text-lg font-medium shadow-lg transform transition-all duration-200 hover:scale-105'
            }
          >
            {isReady ? 'Ready!' : 'Ready Up'}
          </Button>
        </div>
      )}

      {/* Start Debate Button */}
      {playerRole === 'player1' && !hasDebateStarted && room.player1 && room.player2 && room.player1.isReady && room.player2.isReady && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50 text-center">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Start Debate</h3>
          <Button onClick={startDebate} size="lg" className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl h-14 text-lg font-medium shadow-lg transform transition-all duration-200 hover:scale-105">
            <Play className="h-5 w-5 mr-3" />
            Start Debate
          </Button>
        </div>
      )}

      {/* Analyze Debate Button - Only show when debate is finished */}
      {!winner && room.status === 'finished' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50 text-center">
          <h3 className="text-xl font-semibold mb-3 text-gray-900">🤖 AI Analysis</h3>
          <p className="text-gray-700 mb-6">
            The debate has finished! Get AI analysis of the discussion.
          </p>
          <Button 
            onClick={analyzeWinner} 
            disabled={analyzingWinner}
            className="mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl h-12 text-base font-medium shadow-lg transform transition-all duration-200 hover:scale-105"
          >
            {analyzingWinner ? 'Analyzing...' : 'Analyze Debate'}
          </Button>
          
          {analyzingWinner && (
            <div className="mt-6 p-6 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl border border-purple-300/50">
              <p className="text-sm text-gray-700 mb-4">🤖 AI is analyzing the debate...</p>
              <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {Math.round(analysisProgress)}% complete
              </p>
            </div>
          )}
        </div>
      )}

      {/* Winner Analysis */}
      {winner && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-8 shadow-xl border border-purple-200/50 text-center">
          {!room.status || room.status !== 'finished' ? (
            <>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">🏆 Analysis Complete!</h3>
              <p className="text-gray-700 mb-6">
                AI analysis has been completed for this debate.
              </p>
              <Button 
                onClick={analyzeWinner} 
                variant="outline"
                size="sm"
                disabled={analyzingWinner}
                className="mb-4 border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl font-medium"
              >
                {analyzingWinner ? 'Re-analyzing...' : 'Re-analyze Debate'}
              </Button>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">🎉 Debate Complete!</h3>
              <p className="text-gray-700 mb-6">
                The debate has finished after {room.rounds} rounds. 
                Thank you both for participating!
              </p>
              <Button 
                onClick={analyzeWinner} 
                variant="outline"
                size="sm"
                disabled={analyzingWinner}
                className="mb-4 border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl font-medium"
              >
                {analyzingWinner ? 'Re-analyzing...' : 'Re-analyze Debate'}
              </Button>
            </>
          )}
          
          {analyzingWinner && (
            <div className="mt-6 p-6 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl border border-purple-300/50">
              <p className="text-sm text-gray-700 mb-4">🤖 AI is analyzing the debate...</p>
              <div className="w-full bg-white/50 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-300 ease-out"
                  style={{ width: `${analysisProgress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-2 text-center">
                {Math.round(analysisProgress)}% complete
              </p>
            </div>
          )}
          
          {winner && (
            <div className="mt-8 max-w-6xl mx-auto space-y-6">
              {/* Winner Card */}
              <div className={`rounded-2xl p-8 shadow-xl ${
                winner.isTie 
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white' 
                  : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">
                      {winner.isTie ? 'Result' : 'Winner'}
                    </div>
                    <h2 className="text-2xl font-semibold">
                      {winner.isTie ? '🏆 Tie' : (winner.parsedAnalysis?.winner?.name || winner.winnerName)}
                    </h2>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-white/80 uppercase tracking-wide mb-2">Score</div>
                    <div className="text-xl font-semibold">
                      {winner.parsedAnalysis?.winner?.score || 'Analysis completed'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Debate Summary */}
              {winner.parsedAnalysis?.debateSummary && (
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4">Debate Summary</div>
                  <p className="text-gray-900 leading-relaxed">{winner.parsedAnalysis.debateSummary}</p>
                </div>
              )}

              {/* Points of Contention */}
              {winner.parsedAnalysis?.pointsOfContention && winner.parsedAnalysis.pointsOfContention.length > 0 && (
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-6">Points of Contention</div>
                  <div className="space-y-4">
                    {winner.parsedAnalysis.pointsOfContention.map((contention, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className="w-3 h-3 bg-gradient-to-r from-orange-400 to-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                        <p className="text-gray-800 leading-relaxed">{contention}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contention Analysis */}
              {winner.parsedAnalysis?.contentionAnalysis && winner.parsedAnalysis.contentionAnalysis.length > 0 && (
                <div className="space-y-6">
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide">Contention Analysis</div>
                    <p className="text-sm text-gray-700 mt-3">Detailed breakdown of each major argument battleground</p>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {winner.parsedAnalysis.contentionAnalysis.map((contention, index) => (
                      <div key={index} className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-6 shadow-xl">
                        <div className="flex items-start gap-4 mb-6">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl flex items-center justify-center text-sm font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900 text-base">{contention.title}</h4>
                          </div>
                        </div>
                        
                        <div className="space-y-4 text-sm">
                          <div className="text-gray-800 leading-relaxed">
                            <strong>Criteria:</strong> {contention.criteria}
                          </div>
                          <div className="text-gray-800 leading-relaxed">
                            <strong>{lockedParticipants.player1Name || 'Player 1'}:</strong> {contention.player1Analysis}
                          </div>
                          <div className="text-gray-800 leading-relaxed">
                            <strong>{lockedParticipants.player2Name || 'Player 2'}:</strong> {contention.player2Analysis}
                          </div>
                          <div className="text-gray-800 leading-relaxed">
                            <strong>Outcome:</strong> {contention.outcome}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Holistic Verdict */}
              {winner.parsedAnalysis?.holisticVerdict && (
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-4">Holistic Verdict</div>
                  <p className="text-gray-900 leading-relaxed">{winner.parsedAnalysis.holisticVerdict}</p>
                </div>
              )}

              {/* AI Insights & Recommendations */}
              <div className="grid md:grid-cols-2 gap-6">
                {winner.parsedAnalysis?.aiInsights && winner.parsedAnalysis.aiInsights.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-6">AI Insights</div>
                    <div className="space-y-4">
                      {winner.parsedAnalysis.aiInsights.map((insight, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-800 leading-relaxed">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {winner.parsedAnalysis?.nextSteps && winner.parsedAnalysis.nextSteps.length > 0 && (
                  <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                    <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-6">Next Steps</div>
                    <div className="space-y-4">
                      {winner.parsedAnalysis.nextSteps.map((step, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-sm text-gray-800 leading-relaxed">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fallback for old format */}
              {!winner.parsedAnalysis && (
                <div className="bg-white/80 backdrop-blur-sm border border-purple-200/50 rounded-2xl p-8 shadow-xl">
                  <h4 className="font-semibold text-xl mb-6 text-gray-900">🏆 Winner: {winner.winnerName}</h4>
                  
                  <div className="mb-6">
                    <h5 className="font-medium text-base mb-3 text-gray-900">Summary:</h5>
                    <p className="text-sm text-gray-700 leading-relaxed">{winner.summary}</p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-base mb-3 text-gray-900">Reasoning:</h5>
                    <p className="text-sm text-gray-700 leading-relaxed">{winner.reasoning}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Debate Area with Timer Cards */}
      <div className="space-y-6">
        {/* Timer Cards - Show debate info before and during debate */}
        {!hasDebateStarted || room.status === 'active' ? (
          <div className="flex justify-center gap-4">
            <div className="bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl p-4 border border-purple-300/50 shadow-lg">
              <div className="text-2xl font-bold text-purple-700 text-center">
                {!hasDebateStarted ? '1' : room.currentRound}/{room.rounds}
              </div>
              <div className="text-xs text-purple-600 mt-1 font-medium text-center">Round</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl p-4 border border-indigo-300/50 shadow-lg">
              <div className="text-2xl font-bold text-indigo-700 text-center">
                {!hasDebateStarted ? '--:--' : formatTime(timeLeft)}
              </div>
              <div className="text-xs text-indigo-600 mt-1 font-medium text-center">
                {!hasDebateStarted ? 'Time Left' : 'Time Left'}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 border border-blue-300/50 shadow-lg">
              <div className="text-2xl font-bold text-blue-700 text-center">{room.minutesPerTurn}m</div>
              <div className="text-xs text-blue-600 mt-1 font-medium text-center">Per Turn</div>
            </div>
          </div>
        ) : null}

        {/* Messages - Bigger debate box */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-purple-200/50">
          <h3 className="text-xl font-semibold mb-6 text-gray-900">Debate Messages</h3>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.user.name === currentUser.name ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-6 py-4 rounded-2xl ${
                    message.user.name === currentUser.name
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                      : 'bg-white/80 backdrop-blur-sm text-gray-900 border border-purple-200/50 shadow-lg'
                  }`}
                >
                  <div className="text-xs font-medium mb-2">
                    {message.user.name} (Round {message.round})
                  </div>
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {canSendMessage() && (
            <form onSubmit={sendMessage} className="flex gap-4 mt-8">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Your argument..."
                className="flex-1 rounded-xl border-purple-300 !bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
              />
              <Button type="submit" disabled={!newMessage.trim()} className="rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg transform transition-all duration-200 hover:scale-105">
                <Send className="h-5 w-5" />
              </Button>
            </form>
          )}

          {/* Skip Turn Button */}
          {canSkipTurn() && !canSendMessage() && (
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-700 mb-4">
                Time is up! You can skip your turn or wait for the system to auto-skip.
              </p>
              <Button variant="outline" onClick={skipTurn} className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium">
                Skip Turn
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Turn Notification Popup */}
      {showTurnNotification && (
        <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-bottom duration-300">
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-purple-200/50 max-w-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg animate-pulse flex-shrink-0">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-1">🎤 Your Turn!</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Round {room.currentRound} • {formatTime(timeLeft)} remaining
                </p>
                <Button 
                  onClick={() => setShowTurnNotification(false)}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg px-3 py-1 text-xs font-medium"
                >
                  Got it
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}