'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DebateRoomComponent } from '@/components/debate-room';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DebateRoom } from '@/types/debate';

export default function DebateRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<DebateRoom | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | 'spectator'>('spectator');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempPlayerName, setTempPlayerName] = useState('');

  useEffect(() => {
    const initRoom = async () => {
      try {
        setError(null);
        setLoading(true);
        
        // Get player name from localStorage
        const storedName = localStorage.getItem('playerName');
        if (!storedName) {
          // Show name input modal instead of redirecting
          setShowNameInput(true);
          setLoading(false);
          return;
        }
        setPlayerName(storedName);

        // Fetch room data from API
        const response = await fetch(`/api/debate/room/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: storedName }),
        });
        const data = await response.json();

        if (data.success) {
          setRoom(data.room);
          setPlayerRole(data.playerRole);
          
          // If room was updated (new player joined), we should broadcast this change
          if (data.roomUpdated) {
            // We'll handle this in the DebateRoomComponent
            setRoom({ ...data.room, _shouldBroadcast: true });
          }
        } else {
          setError(data.error || 'Failed to load room');
        }
      } catch (error) {
        console.error('Error initializing room:', error);
        setError('Failed to connect to room. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (roomId) {
      initRoom();
    }
  }, [roomId, router]);

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempPlayerName.trim()) {
      localStorage.setItem('playerName', tempPlayerName);
      setPlayerName(tempPlayerName);
      setShowNameInput(false);
      setLoading(true);
      setError(null);
      
      // Now fetch room data with the player name
      try {
        const response = await fetch(`/api/debate/room/${roomId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: tempPlayerName }),
        });
        const data = await response.json();

        if (data.success) {
          setRoom(data.room);
          setPlayerRole(data.playerRole);
          
          if (data.roomUpdated) {
            setRoom({ ...data.room, _shouldBroadcast: true });
          }
        } else {
          setError(data.error || 'Failed to join room');
        }
      } catch (error) {
        console.error('Error joining room:', error);
        setError('Failed to connect to room. Please check your internet connection and try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-medium">Loading room...</p>
          <p className="text-sm text-gray-500 mt-2">Please wait while we connect you to the debate</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Join Room</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => {
                setError(null);
                setLoading(true);
                // Retry loading the room
                setTimeout(() => {
                  const initRoom = async () => {
                    try {
                      const storedName = localStorage.getItem('playerName');
                      if (storedName) {
                        const response = await fetch(`/api/debate/room/${roomId}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ playerName: storedName }),
                        });
                        const data = await response.json();
                        if (data.success) {
                          setRoom(data.room);
                          setPlayerRole(data.playerRole);
                          if (data.roomUpdated) {
                            setRoom({ ...data.room, _shouldBroadcast: true });
                          }
                          setError(null);
                        } else {
                          setError(data.error || 'Failed to load room');
                        }
                      }
                    } catch (error) {
                      console.log(error);
                      setError('Failed to connect to room. Please check your internet connection and try again.');
                    } finally {
                      setLoading(false);
                    }
                  };
                  initRoom();
                }, 500); // Increased delay to 500ms to prevent rapid retries
              }}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl px-6 py-2 font-medium"
            >
              Try Again
            </Button>
            <Button 
              variant="outline"
              onClick={() => router.push('/')}
              className="border-purple-300 text-purple-700 hover:bg-purple-50 rounded-xl px-6 py-2 font-medium"
            >
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show name input modal if no player name is set
  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-purple-200/50">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Join Debate Room</h2>
              <p className="text-sm text-gray-600">Enter your name to join the debate</p>
            </div>
          </div>
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="playerName" className="text-sm font-medium text-gray-700">Your Name</Label>
              <Input
                id="playerName"
                value={tempPlayerName}
                onChange={(e) => setTempPlayerName(e.target.value)}
                placeholder="Enter your name"
                required
                autoFocus
                className="rounded-lg border-gray-300 !bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500 h-12 text-base"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg transform transition-all duration-200 hover:scale-105 h-12 text-base"
              >
                Join Room
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => router.push('/')}
                className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium h-12 text-base"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (!room || !playerName || error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Room</h2>
          <p className="text-gray-600 mb-6">The room could not be loaded. Please check the room URL and try again.</p>
          <Button 
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white rounded-xl px-6 py-2 font-medium"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DebateRoomComponent
      room={room}
      currentUser={{ id: `player-${Date.now()}`, name: playerName }}
      playerRole={playerRole}
      onRoomUpdate={setRoom}
    />
  );
}