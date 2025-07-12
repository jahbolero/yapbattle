'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Users, MessageSquare } from 'lucide-react';

export default function CreateDebatePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    rounds: 3,
    minutesPerTurn: 2,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/debate/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Create Debate Room
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Room Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Climate Change Debate"
                required
              />
            </div>

            <div>
              <Label htmlFor="topic">Debate Topic</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="What are you debating about?"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rounds" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Rounds
                </Label>
                <Input
                  id="rounds"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.rounds}
                  onChange={(e) => setFormData(prev => ({ ...prev, rounds: parseInt(e.target.value) }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="minutes" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Minutes/Turn
                </Label>
                <Input
                  id="minutes"
                  type="number"
                  min="1"
                  max="30"
                  value={formData.minutesPerTurn}
                  onChange={(e) => setFormData(prev => ({ ...prev, minutesPerTurn: parseInt(e.target.value) }))}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Room'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}