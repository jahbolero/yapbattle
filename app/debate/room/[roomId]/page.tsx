'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { DebateRoomComponent } from '@/components/debate-room';
import type { DebateRoom } from '@/types/debate';
import type { User } from '@supabase/supabase-js';

export default function DebateRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [room, setRoom] = useState<DebateRoom | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [playerRole, setPlayerRole] = useState<'player1' | 'player2' | 'spectator'>('spectator');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const initRoom = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);

        if (!user) {
          // Redirect to login if not authenticated
          window.location.href = '/auth/login';
          return;
        }

        // Fetch room data from API
        const response = await fetch(`/api/debate/room/${roomId}`);
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
  }, [roomId, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Loading room...</div>
      </div>
    );
  }

  if (!room || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>Room not found</div>
      </div>
    );
  }

  return (
    <DebateRoomComponent
      room={room}
      currentUser={currentUser}
      playerRole={playerRole}
      onRoomUpdate={setRoom}
    />
  );
}