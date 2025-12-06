/**
 * tRPC Client - connects to the Pluribus Swarm backend
 */

import { useState, useCallback, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/trpc'

interface Message {
  id: number
  role: 'user' | 'assistant'
  content: string
  displayText?: string
}

interface ContextStats {
  usagePercent: number
  totalTokens: number
  maxTokens: number
  messageCount: number
}

// Helper to make tRPC-style calls
async function trpcCall<T>(path: string, input?: unknown): Promise<T> {
  const url = input 
    ? `${API_URL}/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `${API_URL}/${path}`
  
  const response = await fetch(url, {
    method: input ? 'GET' : 'GET',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.result?.data ?? data.result
}

async function trpcMutate<T>(path: string, input: unknown): Promise<T> {
  const response = await fetch(`${API_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  })
  
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.result?.data ?? data.result
}

// React hooks that mimic tRPC behavior
export const trpc = {
  chat: {
    getHistory: {
      useQuery: () => {
        const [data, setData] = useState<Message[]>([])
        const [isLoading, setIsLoading] = useState(true)
        
        const refetch = useCallback(async () => {
          try {
            const result = await trpcCall<Message[]>('chat.getHistory')
            setData(result || [])
          } catch (e) {
            console.error('Failed to fetch history:', e)
          }
          return { data }
        }, [data])
        
        useEffect(() => {
          refetch().finally(() => setIsLoading(false))
        }, [])
        
        return { data, refetch, isLoading }
      },
    },
    
    getContextStats: {
      useQuery: () => {
        const [data, setData] = useState<ContextStats>({
          usagePercent: 0,
          totalTokens: 0,
          maxTokens: 8000,
          messageCount: 0,
        })
        
        useEffect(() => {
          trpcCall<ContextStats>('chat.getContextStats')
            .then(setData)
            .catch(console.error)
        }, [])
        
        return { data }
      },
    },
    
    sendMessage: {
      useMutation: (options?: { onSuccess?: (data: { displayText?: string; message?: string }) => void }) => {
        const [isPending, setIsPending] = useState(false)
        
        const mutate = useCallback(async (input: { message: string }) => {
          setIsPending(true)
          try {
            const result = await trpcMutate<{ message: string; displayText: string }>(
              'chat.sendMessage',
              input
            )
            options?.onSuccess?.(result)
          } catch (e) {
            console.error('Failed to send message:', e)
          } finally {
            setIsPending(false)
          }
        }, [options])
        
        return { mutate, isPending }
      },
    },
    
    clearHistory: {
      useMutation: (options?: { onSuccess?: () => void }) => {
        const [isPending, setIsPending] = useState(false)
        
        const mutate = useCallback(async () => {
          setIsPending(true)
          try {
            await trpcMutate('chat.clearHistory', {})
            options?.onSuccess?.()
          } catch (e) {
            console.error('Failed to clear history:', e)
          } finally {
            setIsPending(false)
          }
        }, [options])
        
        return { mutate, isPending }
      },
    },
  },
}
