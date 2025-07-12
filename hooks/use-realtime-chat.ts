'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  content: string
  createdAt: string
  user: {
    id: string
    name: string
  }
  room: string
  agent_response?: string
}

interface UseRealtimeChatProps {
  roomName: string
  username: string
}

export const useRealtimeChat = ({ roomName, username }: UseRealtimeChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase.channel(`chat-${roomName}`, {
      config: {
        broadcast: { self: true },
      },
    })

    channelRef.current = channel

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const message = payload as ChatMessage
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === message.id)) return prev
          return [...prev, message]
        })
      })
      .on('presence', { event: 'sync' }, () => {
        setIsConnected(true)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true)
          // Track presence
          await channel.track({
            user: username,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      channel.unsubscribe()
      setIsConnected(false)
    }
  }, [roomName, username, supabase])

  const sendMessage = async (content: string) => {
    if (!channelRef.current || !content.trim()) return

    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random()}`,
      content: content.trim(),
      createdAt: new Date().toISOString(),
      user: {
        id: `user-${username}`,
        name: username,
      },
      room: roomName,
    }

    // Broadcast the message
    await channelRef.current.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    })
  }

  return {
    messages,
    sendMessage,
    isConnected,
  }
}