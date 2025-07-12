'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { ChatMessage } from '@/hooks/use-realtime-chat'

export const useMessagesQuery = (roomName?: string) => {
  const [data, setData] = useState<ChatMessage[] | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true)
        // Since we're using broadcast, we don't have persistent storage
        // This is a placeholder that returns empty array
        // You can implement actual database storage if needed
        setData([])
        setError(null)
      } catch (err) {
        setError(err as Error)
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [roomName, supabase])

  return { data, error, loading }
}