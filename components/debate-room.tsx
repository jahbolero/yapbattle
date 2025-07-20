'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [winner, setWinner] = useState<{winner: string, summary: string, reasoning: string, winnerName: string, parsedAnalysis?: ParsedAnalysis} | null>(null);
  const [analyzingWinner, setAnalyzingWinner] = useState(false);
  // Store locked-in participant names that persist even if someone leaves
  const [lockedParticipants, setLockedParticipants] = useState<{
    player1Name?: string;
    player2Name?: string;
  }>({});
  const [hasDebateStarted, setHasDebateStarted] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
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
                <div className="font-medium">
                  {lockedParticipants.player1Name || room.player1?.name || 'Waiting...'}
                  {winner?.parsedAnalysis?.winner?.player === 'player1' && ' 👑'}
                </div>
                <div className="text-sm text-muted-foreground">Player 1</div>
              </div>
              <div className="flex items-center gap-2">
                {room.currentTurn === 'player1' && room.status === 'active' && (
                  <Badge variant="default">Your Turn</Badge>
                )}
                {!hasDebateStarted && room.player1?.isReady && (
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
                <div className="font-medium">
                  {lockedParticipants.player2Name || room.player2?.name || 'Waiting...'}
                  {winner?.parsedAnalysis?.winner?.player === 'player2' && ' 👑'}
                </div>
                <div className="text-sm text-muted-foreground">Player 2</div>
              </div>
              <div className="flex items-center gap-2">
                {room.currentTurn === 'player2' && room.status === 'active' && (
                  <Badge variant="default">Your Turn</Badge>
                )}
                {!hasDebateStarted && room.player2?.isReady && (
                  <Badge variant="outline">Ready</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      {playerRole !== 'spectator' && room.status === 'waiting' && !hasDebateStarted && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 justify-center">
              <Button onClick={handleReady} variant={isReady ? 'default' : 'outline'}>
                {isReady ? 'Ready!' : 'Ready Up'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Start Debate Button */}
      {playerRole === 'player1' && room.status === 'ready' && !hasDebateStarted && (
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-2 justify-center">
              <Button onClick={startDebate}>
                <Play className="h-4 w-4 mr-2" />
                Start Debate
              </Button>
            </div>
          </CardContent>
        </Card>
      )}


      {/* Winner Analysis - Show whenever we have winner data, regardless of room status */}
      {winner && (
        <Card>
          <CardContent className="p-6 text-center">
            {!room.status || room.status !== 'finished' ? (
              <>
                <h3 className="text-lg font-semibold mb-2">🏆 Analysis Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  AI analysis has been completed for this debate.
                </p>
                <Button 
                  onClick={analyzeWinner} 
                  variant="outline"
                  size="sm"
                  disabled={analyzingWinner}
                  className="mb-4"
                >
                  {analyzingWinner ? 'Re-analyzing...' : 'Re-analyze Debate'}
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">🎉 Debate Complete!</h3>
                <p className="text-muted-foreground mb-4">
                  The debate has finished after {room.rounds} rounds. 
                  Thank you both for participating!
                </p>
                <Button 
                  onClick={analyzeWinner} 
                  variant="outline"
                  size="sm"
                  disabled={analyzingWinner}
                  className="mb-4"
                >
                  {analyzingWinner ? 'Re-analyzing...' : 'Re-analyze Debate'}
                </Button>
              </>
            )}
            
            {analyzingWinner && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">🤖 AI is analyzing the debate...</p>
              </div>
            )}
            
            {winner && (
              <div className="mt-6 max-w-6xl mx-auto space-y-6">
                {/* Winner Card */}
                <div className="bg-white border border-gray-200 p-6 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Winner</div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {winner.parsedAnalysis?.winner?.name || winner.winnerName}
                      </h2>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Score</div>
                      <div className="text-lg font-semibold text-gray-900">
                        {winner.parsedAnalysis?.winner?.score || 'Analysis completed'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Debate Summary */}
                {winner.parsedAnalysis?.debateSummary && (
                  <div className="bg-white border border-gray-200 p-6 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Debate Summary</div>
                    <p className="text-gray-900 leading-relaxed">{winner.parsedAnalysis.debateSummary}</p>
                  </div>
                )}

                {/* Points of Contention */}
                {winner.parsedAnalysis?.pointsOfContention && winner.parsedAnalysis.pointsOfContention.length > 0 && (
                  <div className="bg-white border border-gray-200 p-6 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Points of Contention</div>
                    <div className="space-y-2">
                      {winner.parsedAnalysis.pointsOfContention.map((contention, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                          <p className="text-gray-700 leading-relaxed">{contention}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contention Analysis */}
                {winner.parsedAnalysis?.contentionAnalysis && winner.parsedAnalysis.contentionAnalysis.length > 0 && (
                  <div className="space-y-6">
                    {/* Main Contention Analysis Header */}
                    <div className="bg-white border border-gray-200 p-6 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Contention Analysis</div>
                      <p className="text-sm text-gray-600 mt-2">Detailed breakdown of each major argument battleground</p>
                    </div>
                    
                    {/* Individual Contention Cards Grid */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {winner.parsedAnalysis.contentionAnalysis.map((contention, index) => (
                        <div key={index} className="bg-white border border-gray-200 p-5 rounded-lg">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900 text-sm">{contention.title}</h4>
                            </div>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            <div className="text-gray-700 leading-relaxed">
                              <strong>Criteria:</strong> {contention.criteria}
                            </div>
                            <div className="text-gray-700 leading-relaxed">
                              <strong>{lockedParticipants.player1Name || 'Player 1'}:</strong> {contention.player1Analysis}
                            </div>
                            <div className="text-gray-700 leading-relaxed">
                              <strong>{lockedParticipants.player2Name || 'Player 2'}:</strong> {contention.player2Analysis}
                            </div>
                            <div className="text-gray-700 leading-relaxed">
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
                  <div className="bg-white border border-gray-200 p-6 rounded-lg">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Holistic Verdict</div>
                    <p className="text-gray-900 leading-relaxed">{winner.parsedAnalysis.holisticVerdict}</p>
                  </div>
                )}

                {/* AI Insights & Recommendations */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* AI Insights */}
                  {winner.parsedAnalysis?.aiInsights && winner.parsedAnalysis.aiInsights.length > 0 && (
                    <div className="bg-white border border-gray-200 p-6 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">AI Insights</div>
                      <div className="space-y-2">
                        {winner.parsedAnalysis.aiInsights.map((insight, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Next Steps */}
                  {winner.parsedAnalysis?.nextSteps && winner.parsedAnalysis.nextSteps.length > 0 && (
                    <div className="bg-white border border-gray-200 p-6 rounded-lg">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Next Steps</div>
                      <div className="space-y-2">
                        {winner.parsedAnalysis.nextSteps.map((step, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                            <p className="text-sm text-gray-700 leading-relaxed">{step}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Fallback for old format */}
                {!winner.parsedAnalysis && (
                  <div className="bg-white border border-gray-200 p-6 rounded-lg">
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
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Analyze Debate Button - Show when debate is active/finished but no analysis yet */}
      {!winner && (room.status === 'active' || room.status === 'finished' || messages.length > 0) && (
        <Card>
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-2">🤖 AI Analysis</h3>
            <p className="text-muted-foreground mb-4">
              {room.status === 'finished' 
                ? 'The debate has finished! Get AI analysis of the discussion.'
                : 'Get AI analysis of the current debate progress.'
              }
            </p>
            <Button 
              onClick={analyzeWinner} 
              disabled={analyzingWinner}
              className="mb-4"
            >
              {analyzingWinner ? 'Analyzing...' : 'Analyze Debate'}
            </Button>
            
            {analyzingWinner && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">🤖 AI is analyzing the debate...</p>
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
                  message.user.name === currentUser.name ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${
                    message.user.name === currentUser.name
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
                Time is up! You can skip your turn or wait for the system to auto-skip.
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