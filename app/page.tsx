'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon, MessageSquare, Plus, Users, ArrowRight, Clock, Calendar, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Logo from '@/components/logo';

export default function LandingPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [action, setAction] = useState<'create' | 'join' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [debateHistory, setDebateHistory] = useState<Array<{
    id: string;
    title: string;
    topic: string;
    createdAt: string;
    participants: string[];
    status: 'active' | 'completed';
    winner?: string;
  }>>([]);

  // Load debate history from localStorage on component mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('debateHistory');
    if (storedHistory) {
      try {
        setDebateHistory(JSON.parse(storedHistory));
      } catch (error) {
        console.error('Error parsing debate history:', error);
      }
    } else {
      // Add some sample data for demonstration
      const sampleHistory = [
        {
          id: 'sample-1',
          title: 'Climate Change Debate',
          topic: 'Should governments implement stricter carbon emission regulations?',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          participants: ['Jake', 'Sarah', 'Mike'],
          status: 'completed' as const,
          winner: 'Sarah'
        },
        {
          id: 'sample-2',
          title: 'Remote Work Policy',
          topic: 'Is remote work more productive than office work?',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          participants: ['Jake', 'Alex', 'Emma'],
          status: 'active' as const
        }
      ];
      setDebateHistory(sampleHistory);
      localStorage.setItem('debateHistory', JSON.stringify(sampleHistory));
    }
  }, []);

  // Function to add a debate to history (will be used when integrating with debate creation)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const addToHistory = (debate: {
    id: string;
    title: string;
    topic: string;
    createdAt: string;
    participants: string[];
    status: 'active' | 'completed';
    winner?: string;
  }) => {
    const newHistory = [debate, ...debateHistory];
    setDebateHistory(newHistory);
    localStorage.setItem('debateHistory', JSON.stringify(newHistory));
  };

  // Function to format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-purple-200/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo width={96} height={96} />
          <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-2xl flex gap-3 items-center shadow-lg">
            <InfoIcon size="18" strokeWidth={2} />
            <span className="text-sm font-medium">Welcome to YapBattle - Create or join debate rooms</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="flex justify-center mb-6">
              <Logo width={480} height={480} className="text-center" />
            </div>
            <p className="text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
              Engage in structured debates with AI-powered analysis and real-time feedback
            </p>
          </div>
        </div>

        {/* Name Input Modal */}
        {showNameInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-purple-200/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Enter Your Name</h2>
                  <p className="text-sm text-gray-600">This will be displayed to other participants</p>
                </div>
              </div>
              <form onSubmit={handleNameSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="playerName" className="text-sm font-medium text-gray-700">Your Name</Label>
                                      <Input
                      id="playerName"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your name"
                      required
                      autoFocus
                      className="rounded-lg border-gray-300 !bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
                    />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-medium shadow-lg transform transition-all duration-200 hover:scale-105">
                    Continue
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowNameInput(false);
                      setAction(null);
                    }}
                    className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Room Input Modal */}
        {showRoomInput && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-purple-200/50">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Join Debate Room</h2>
                  <p className="text-sm text-gray-600">Enter the room code or paste the room URL</p>
                </div>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); handleRoomJoin(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roomCode" className="text-sm font-medium text-gray-700">Room Code or URL</Label>
                                        <Input
                        id="roomCode"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="Enter room code or paste room URL"
                        required
                        autoFocus
                        className="rounded-lg border-gray-300 !bg-white text-gray-900 focus:border-green-500 focus:ring-green-500"
                      />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium shadow-lg transform transition-all duration-200 hover:scale-105">
                    Join Room
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowRoomInput(false);
                      setRoomCode('');
                    }}
                    className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-200/50 hover:border-purple-300/50">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Plus className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Create Debate Room</h3>
                <p className="text-sm text-gray-600">Start a new debate with custom rules</p>
              </div>
            </div>
            <p className="text-gray-700 mb-8 leading-relaxed">
              Set up a new debate room with custom rules, invite opponents, and engage in structured discussions with AI-powered analysis.
            </p>
            <Button 
              className="w-full rounded-xl h-14 text-base font-medium bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg transform transition-all duration-200 hover:scale-105" 
              onClick={() => handleAction('create')}
            >
              Create New Room
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 border border-purple-200/50 hover:border-purple-300/50">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-7 w-7 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Join Existing Room</h3>
                <p className="text-sm text-gray-600">Use a room link to join an ongoing debate</p>
              </div>
            </div>
            <p className="text-gray-700 mb-8 leading-relaxed">
              Join an existing debate room using a room code or URL. Participate in ongoing discussions and contribute to the debate.
            </p>
            <Button 
              variant="outline" 
              className="w-full rounded-xl h-14 text-base font-medium border-purple-300 text-purple-700 hover:bg-purple-50 shadow-lg transform transition-all duration-200 hover:scale-105" 
              onClick={() => handleAction('join')}
            >
              Enter Room Code
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Real-time Debates</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Engage in live debates with turn-based messaging and real-time updates. See responses as they happen.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">AI Analysis</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Get detailed analysis of arguments, winner determination, and insights into debate quality and structure.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <InfoIcon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Structured Format</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">
              Follow debate rules with timed turns, structured arguments, and organized rounds for better discussions.
            </p>
          </div>
        </div>

        {/* Debate History Section */}
        {debateHistory.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">Your Debate History</h2>
                <p className="text-sm text-gray-600">Recent debates you&apos;ve participated in</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {debateHistory.map((debate) => (
                <div key={debate.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm mb-2">{debate.title}</h3>
                      <p className="text-xs text-gray-600 mb-3">{debate.topic}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      debate.status === 'active' 
                        ? 'bg-gradient-to-r from-green-400 to-green-600 text-white' 
                        : 'bg-gradient-to-r from-blue-400 to-blue-600 text-white'
                    }`}>
                      {debate.status === 'active' ? 'Active' : 'Completed'}
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(debate.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Users className="h-3 w-3" />
                      <span>{debate.participants.length} participants</span>
                    </div>
                    {debate.winner && (
                      <div className="flex items-center gap-2 text-xs text-green-600">
                        <Trophy className="h-3 w-3" />
                        <span>Winner: {debate.winner}</span>
                      </div>
                    )}
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full text-xs rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
                    onClick={() => router.push(`/debate/room/${debate.id}`)}
                  >
                    View Debate
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 