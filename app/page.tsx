'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon, MessageSquare, Plus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LandingPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [action, setAction] = useState<'create' | 'join' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [showRoomInput, setShowRoomInput] = useState(false);

  const handleAction = (actionType: 'create' | 'join') => {
    if (!playerName.trim()) {
      setAction(actionType);
      setShowNameInput(true);
      return;
    }
    
    // Store player name in localStorage
    localStorage.setItem('playerName', playerName);
    
    if (actionType === 'create') {
      router.push('/debate/create');
    } else {
      setShowRoomInput(true);
    }
  };

  const handleRoomJoin = () => {
    if (roomCode.trim()) {
      // Extract room ID from URL or use the code directly
      let roomId = roomCode.trim();
      
      // If it's a full URL, extract the room ID
      if (roomCode.includes('/debate/room/')) {
        roomId = roomCode.split('/debate/room/')[1];
      }
      
      router.push(`/debate/room/${roomId}`);
    }
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      localStorage.setItem('playerName', playerName);
      setShowNameInput(false);
      
      if (action === 'create') {
        router.push('/debate/create');
      } else if (action === 'join') {
        // For join, you can implement room code input later
        alert('Join feature coming soon!');
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="w-full p-6">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          Welcome to YapBattle - Create or join debate rooms
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">YapBattle</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Engage in structured debates with AI-powered analysis
            </p>
          </div>

          {/* Name Input Modal */}
          {showNameInput && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Enter Your Name</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleNameSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="playerName">Your Name</Label>
                      <Input
                        id="playerName"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Enter your name"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="flex-1">
                        Continue
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setShowNameInput(false);
                          setAction(null);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Room Input Modal */}
          {showRoomInput && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <Card className="w-full max-w-md mx-4">
                <CardHeader>
                  <CardTitle>Join Debate Room</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => { e.preventDefault(); handleRoomJoin(); }} className="space-y-4">
                    <div>
                      <Label htmlFor="roomCode">Room Code or URL</Label>
                      <Input
                        id="roomCode"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="Enter room code or paste room URL"
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
                        onClick={() => {
                          setShowRoomInput(false);
                          setRoomCode('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Main Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Debate Room
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Start a new debate with custom rules and invite opponents
                </p>
                <Button 
                  className="w-full" 
                  onClick={() => handleAction('create')}
                >
                  Create New Room
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Join Existing Room
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Use a room link to join an ongoing or scheduled debate
                </p>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => handleAction('join')}
                >
                  Enter Room Code
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Features Section */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Real-time Debates</h3>
                <p className="text-sm text-muted-foreground">
                  Engage in live debates with turn-based messaging
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <MessageSquare className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Get detailed analysis of arguments and winner determination
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <InfoIcon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h3 className="font-semibold mb-2">Structured Format</h3>
                <p className="text-sm text-muted-foreground">
                  Follow debate rules with timed turns and structured arguments
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
} 