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

// Get visitor identity from localStorage
function getVisitorHeaders(): Record<string, string> {
  try {
    const stored = localStorage.getItem('pluribus_visitor')
    if (stored) {
      const data = JSON.parse(stored)
      return {
        'X-Visitor-Id': data.id || 'anonymous',
        'X-Visitor-Name': data.name || '',
      }
    }
  } catch {
    // Ignore
  }
  return { 'X-Visitor-Id': 'anonymous' }
}

// Helper to make tRPC-style calls
async function trpcCall<T>(path: string, input?: unknown): Promise<T> {
  const url = input 
    ? `${API_URL}/${path}?input=${encodeURIComponent(JSON.stringify(input))}`
    : `${API_URL}/${path}`
  
  const response = await fetch(url, {
    method: input ? 'GET' : 'GET',
    headers: { 
      'Content-Type': 'application/json',
      ...getVisitorHeaders(),
    },
    credentials: 'include',
  })
  
  const data = await response.json()
  if (data.error) throw new Error(data.error.message)
  return data.result?.data ?? data.result
}

async function trpcMutate<T>(path: string, input: unknown): Promise<T> {
  const response = await fetch(`${API_URL}/${path}`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      ...getVisitorHeaders(),
    },
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

    // Convergence endpoints
    getConvergenceStats: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        const refetch = useCallback(async () => {
          try {
            const result = await trpcCall<any>('chat.getConvergenceStats')
            setData(result)
          } catch (e) {
            console.error('Failed to fetch convergence stats:', e)
          }
          return { data }
        }, [data])
        
        useEffect(() => {
          refetch().finally(() => setIsLoading(false))
        }, [])
        
        return { data, refetch, isLoading }
      },
    },

    getSemanticInvariants: {
      useQuery: () => {
        const [data, setData] = useState<any[]>([])
        const [isLoading, setIsLoading] = useState(true)
        
        useEffect(() => {
          trpcCall<any[]>('chat.getSemanticInvariants')
            .then(result => setData(result || []))
            .catch(console.error)
            .finally(() => setIsLoading(false))
        }, [])
        
        return { data, isLoading }
      },
    },

    triggerConvergence: {
      useMutation: (options?: { onSuccess?: (data: any) => void }) => {
        const [isPending, setIsPending] = useState(false)
        
        const mutate = useCallback(async (input: { threshold?: number }) => {
          setIsPending(true)
          try {
            const result = await trpcMutate<any>('chat.triggerConvergence', input)
            options?.onSuccess?.(result)
          } catch (e) {
            console.error('Failed to run convergence:', e)
          } finally {
            setIsPending(false)
          }
        }, [options])
        
        return { mutate, isPending }
      },
    },

    // Predictive Convergence
    getDriftForecast: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        useEffect(() => {
          trpcCall<any>('chat.getDriftForecast')
            .then(setData)
            .catch(console.error)
            .finally(() => setIsLoading(false))
        }, [])
        
        return { data, isLoading }
      },
    },

    // Identity
    getSwarmIdentity: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        useEffect(() => {
          trpcCall<any>('chat.getSwarmIdentity')
            .then(setData)
            .catch(console.error)
            .finally(() => setIsLoading(false))
        }, [])
        
        return { data, isLoading }
      },
    },

    // Teleonomic
    getTeleonomicStatus: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        useEffect(() => {
          trpcCall<any>('chat.getTeleonomicStatus')
            .then(setData)
            .catch(console.error)
            .finally(() => setIsLoading(false))
        }, [])
        
        return { data, isLoading }
      },
    },

    // Cognitive Metrics
    getCognitiveMetrics: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        const refetch = useCallback(async () => {
          setIsLoading(true)
          try {
            const result = await trpcCall<any>('chat.getCognitiveMetrics')
            setData(result)
          } catch (e) {
            console.error('Failed to fetch metrics:', e)
          } finally {
            setIsLoading(false)
          }
        }, [])
        
        useEffect(() => {
          refetch()
        }, [refetch])
        
        return { data, isLoading, refetch }
      },
    },

    // Knowledge Graph
    getConceptGraph: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        useEffect(() => {
          trpcCall<any>('chat.getConceptGraph')
            .then(setData)
            .catch(console.error)
            .finally(() => setIsLoading(false))
        }, [])
        
        return { data, isLoading }
      },
    },

    getSwarmStats: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        useEffect(() => {
          trpcCall<any>('chat.getSwarmStats')
            .then(setData)
            .catch(console.error)
            .finally(() => setIsLoading(false))
        }, [])
        
        return { data, isLoading }
      },
    },

    // Braille Kernel
    getBrailleKernel: {
      useQuery: () => {
        const [data, setData] = useState<any>(null)
        const [isLoading, setIsLoading] = useState(true)
        
        const refetch = useCallback(async () => {
          setIsLoading(true)
          try {
            const result = await trpcCall<any>('chat.getBrailleKernel')
            setData(result)
          } catch (e) {
            console.error('Failed to fetch braille kernel:', e)
          } finally {
            setIsLoading(false)
          }
        }, [])
        
        useEffect(() => {
          refetch()
        }, [refetch])
        
        return { data, isLoading, refetch }
      },
    },
  },
}
