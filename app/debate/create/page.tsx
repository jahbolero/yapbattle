'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Clock, Users, MessageSquare, ArrowLeft } from 'lucide-react';

export default function CreateDebatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    rounds: 3,
    minutesPerTurn: 2,
  });

  useEffect(() => {
    // Get player name from localStorage
    const storedName = localStorage.getItem('playerName');
    if (!storedName) {
      router.push('/');
      return;
    }
    setPlayerName(storedName);
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/debate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          playerName, // Include player name in the request
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        router.push(`/debate/room/${data.roomId}`);
      }
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't render if player name is not set
  if (!playerName) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/')}
            className="rounded-xl border-purple-300 text-purple-700 hover:bg-purple-50 font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Create Debate Room</h1>
            <p className="text-gray-700">Set up a new debate with custom rules</p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl max-w-2xl border border-purple-200/50">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Room Details</h2>
              <p className="text-sm text-gray-600">Creating as: <span className="font-medium text-gray-700">{playerName}</span></p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm font-medium text-gray-700">Room Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Climate Change Debate"
                required
                className="rounded-xl border-purple-300 !bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic" className="text-sm font-medium text-gray-700">Debate Topic</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="What are you debating about?"
                required
                className="rounded-xl border-purple-300 !bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="rounds" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Number of Rounds
                </Label>
                <Input
                  id="rounds"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.rounds}
                  onChange={(e) => setFormData(prev => ({ ...prev, rounds: parseInt(e.target.value) }))}
                  required
                  className="rounded-xl border-purple-300 !bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minutes" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Minutes per Turn
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.minutesPerTurn}
                  onChange={(e) => setFormData(prev => ({ ...prev, minutesPerTurn: parseInt(e.target.value) }))}
                  required
                  className="rounded-xl border-purple-300 !bg-white text-gray-900 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="pt-6">
              <Button 
                type="submit" 
                className="w-full rounded-xl h-14 text-base font-medium bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg transform transition-all duration-200 hover:scale-105" 
                disabled={loading}
              >
                {loading ? 'Creating Room...' : 'Create Debate Room'}
              </Button>
            </div>
          </form>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Multiplayer</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">Invite opponents to join your debate room</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Timed Turns</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">Structured debate with timed responses</p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-xl border border-purple-200/50 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">AI Analysis</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">Get detailed analysis of the debate</p>
          </div>
        </div>
      </div>
    </div>
  );
}