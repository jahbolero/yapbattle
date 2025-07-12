'use client'

import { useCallback, useEffect, useRef } from 'react'

export const useChatScroll = () => {
  const containerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  useEffect(() => {
    // Auto-scroll on mount
    scrollToBottom()
  }, [scrollToBottom])

  return {
    containerRef,
    scrollToBottom,
  }
}