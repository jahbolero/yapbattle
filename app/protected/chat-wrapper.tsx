'use client';

import { RealtimeChat } from '@/components/realtime-chat';
import { storeMessages } from '@/lib/store-messages';
import type { ChatMessage } from '@/hooks/use-realtime-chat';

interface ChatWrapperProps {
  roomName: string;
  username: string;
}

export default function ChatWrapper({ roomName, username }: ChatWrapperProps) {
  const handleMessage = async (messages: ChatMessage[]) => {
    // Store messages in your database
    await storeMessages(messages);
  };

  return (
    <div className="h-[600px] border rounded-lg">
      <RealtimeChat 
        roomName={roomName}
        username={username}
        onMessage={handleMessage}
      />
    </div>
  );
}