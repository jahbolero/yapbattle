'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Play, Send, Copy, Check } from 'lucide-react';
import type { DebateRoom, DebatePlayer, DebateMessage } from '@/types/debate';

interface DebateRoomProps {
  room: DebateRoom;
  currentUser: any;
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
  const [winner, setWinner] = useState<{winner: string, summary: string, reasoning: string, winnerName: string} | null>(null);
  const [analyzingWinner, setAnalyzingWinner] = useState(false);
  const channelRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const supabase = createClient();

  const roomUrl = typeof window !== 'undefined' ? `${window.location.origin}/debate/room/${room.id}` : '';

  useEffect(() => {
    // Check for saved winner
    const savedWinner = localStorage.getItem(`winner-${room.id}`);
    if (savedWinner) {
      setWinner(JSON.parse(savedWinner));
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
        setRoom(updatedRoom);
        onRoomUpdate(updatedRoom);
        
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
    if ((room as any)._shouldBroadcast && channelRef.current) {
      // Remove the broadcast flag and broadcast the update
      const cleanRoom = { ...room };
      delete (cleanRoom as any)._shouldBroadcast;
      setRoom(cleanRoom);
      
      // Broadcast the room update to notify other players
      channelRef.current.send({
        type: 'broadcast',
        event: 'room-update',
        payload: cleanRoom,
      });
    }
  }, [room]);

  const initializeRoom = () => {
    // Determine if user is player1, player2, or spectator
    if (room.player1?.id === currentUser.id) {
      setPlayerRole('player1');
      setIsReady(room.player1.isReady);
    } else if (room.player2?.id === currentUser.id) {
      setPlayerRole('player2');
      setIsReady(room.player2.isReady);
    } else {
      setPlayerRole('spectator');
    }
  };

  const broadcastRoomUpdate = async (updatedRoom: DebateRoom) => {
    // Save room state to API first
    try {
      await fetch(`/api/debate/room/${room.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRoom),
      });
    } catch (error) {
      console.error('Error saving room state:', error);
    }

    // Broadcast to other clients
    channelRef.current?.send({
      type: 'broadcast',
      event: 'room-update',
      payload: updatedRoom,
    });
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
    const nextTurn = room.currentTurn === 'player1' ? 'player2' : 'player1';
    let updatedRoom = {
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
          status: 'finished',
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
        updatedRoom.currentTurn = 'player1'; // Player 1 starts each round
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

    const updatedRoom = { ...room };
    if (playerRole === 'player1' && updatedRoom.player1) {
      updatedRoom.player1.isReady = newReadyState;
    } else if (playerRole === 'player2' && updatedRoom.player2) {
      updatedRoom.player2.isReady = newReadyState;
    }

    // Check if both players exist and are ready (works even if one player isn't joined yet)
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
    broadcastRoomUpdate(updatedRoom);
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

    const message: DebateMessage = {
      id: `${Date.now()}-${Math.random()}`,
      content: newMessage.trim(),
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser.id,
        name: currentUser.email?.split('@')[0] || 'Player',
      },
      room: room.id,
      round: room.currentRound,
      turn: playerRole,
    };

    setNewMessage('');

    // Save message to API first
    try {
      await fetch(`/api/debate/messages/${room.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }

    // Broadcast message
    channelRef.current?.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    });

    // Switch turn after sending
    setTimeout(() => switchTurn(), 1000);
  };

  const canSendMessage = () => {
    return room.status === 'active' && 
           room.currentTurn === playerRole && 
           timeLeft > 0 &&
           room.status !== 'finished';
  };

  const canSkipTurn = () => {
    return room.status === 'active' && 
           room.currentTurn === playerRole &&
           room.status !== 'finished';
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

  return (
    <div className="min-h-screen p-4 space-y-4">
      {/* Room Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>{room.title}</CardTitle>
              <p className="text-muted-foreground mt-1">{room.topic}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={
                room.status === 'active' ? 'default' : 
                room.status === 'finished' ? 'destructive' : 
                'secondary'
              }>
                {room.status === 'finished' ? 'Debate Finished' : room.status}
              </Badge>
              <Button variant="outline" size="sm" onClick={copyRoomLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied!' : 'Share'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{room.currentRound}/{room.rounds}</div>
              <div className="text-sm text-muted-foreground">Round</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{formatTime(timeLeft)}</div>
              <div className="text-sm text-muted-foreground">Time Left</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{room.minutesPerTurn}m</div>
              <div className="text-sm text-muted-foreground">Per Turn</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{room.player1?.name || 'Waiting...'}</div>
                <div className="text-sm text-muted-foreground">Player 1</div>
              </div>
              <div className="flex items-center gap-2">
                {room.currentTurn === 'player1' && room.status === 'active' && (
                  <Badge variant="default">Your Turn</Badge>
                )}
                {room.player1?.isReady && (
                  <Badge variant="outline">Ready</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{room.player2?.name || 'Waiting...'}</div>
                <div className="text-sm text-muted-foreground">Player 2</div>
              </div>
              <div className="flex items-center gap-2">
                {room.currentTurn === 'player2' && room.status === 'active' && (
                  <Badge variant="default">Your Turn</Badge>
                )}
                {room.player2?.isReady && (
                  <Badge variant="outline">Ready</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      {playerRole !== 'spectator' && room.status !== 'finished' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 justify-center">
              {room.status === 'waiting' && (
                <Button onClick={handleReady} variant={isReady ? 'default' : 'outline'}>
                  {isReady ? 'Ready!' : 'Ready Up'}
                </Button>
              )}
              {room.status === 'ready' && playerRole === 'player1' && (
                <Button onClick={startDebate}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Debate
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Debate Finished Message */}
      {room.status === 'finished' && (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">🎉 Debate Complete!</h3>
            <p className="text-muted-foreground mb-4">
              The debate has finished after {room.rounds} rounds. 
              Thank you both for participating!
            </p>
            
            {!winner && !analyzingWinner && (
              <Button 
                onClick={analyzeWinner} 
                className="mt-4"
              >
                Get AI Winner Analysis
              </Button>
            )}
            
            {analyzingWinner && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">🤖 AI is analyzing the debate...</p>
              </div>
            )}
            
            {winner && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-lg mb-3">🏆 Winner: {winner.winnerName}</h4>
                
                <div className="mb-3">
                  <h5 className="font-medium text-sm mb-1">Summary:</h5>
                  <p className="text-sm text-muted-foreground">{winner.summary}</p>
                </div>
                
                <div>
                  <h5 className="font-medium text-sm mb-1">Reasoning:</h5>
                  <p className="text-sm text-muted-foreground">{winner.reasoning}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card>
        <CardHeader>
          <CardTitle>Debate Messages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.user.id === currentUser.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.user.id === currentUser.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">
                    {message.user.name} (Round {message.round})
                  </div>
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          {canSendMessage() && (
            <form onSubmit={sendMessage} className="flex gap-2 mt-4">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Your argument..."
                className="flex-1"
              />
              <Button type="submit" disabled={!newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}

          {/* Skip Turn Button - shown when it's player's turn but they can't send (timer expired, etc.) */}
          {canSkipTurn() && !canSendMessage() && (
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Time's up! You can skip your turn or wait for the system to auto-skip.
              </p>
              <Button variant="outline" onClick={skipTurn}>
                Skip Turn
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}