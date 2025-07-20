'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DebateRoomComponent } from '@/components/debate-room';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DebateRoom } from '@/types/debate';

export default function DebateRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<DebateRoom | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | 'spectator'>('spectator');
  const [loading, setLoading] = useState(true);
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempPlayerName, setTempPlayerName] = useState('');

  useEffect(() => {
    const initRoom = async () => {
      try {
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
          console.error('Room not found');
        }
      } catch (error) {
        console.error('Error initializing room:', error);
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
        }
      } catch (error) {
        console.error('Error joining room:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading room...</div>
      </div>
    );
  }

  // Show name input modal if no player name is set
  if (showNameInput) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Join Debate Room</CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your name to join the debate
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  value={tempPlayerName}
                  onChange={(e) => setTempPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Join Room
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => router.push('/')}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!room || !playerName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Room not found or player name not set</div>
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