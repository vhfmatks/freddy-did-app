'use client'

import { useEffect, useRef, useCallback } from 'react'
import { RealtimeChannel } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface UseOrderCallsRealtimeProps {
  storeId: string
  onInsert?: (call: OrderCall) => void
  onUpdate?: (call: OrderCall) => void
  onDelete?: (call: OrderCall) => void
  onConnectionChange?: (status: 'connecting' | 'connected' | 'disconnected') => void
  debug?: boolean
}

export function useOrderCallsRealtime({
  storeId,
  onInsert,
  onUpdate,
  onDelete,
  onConnectionChange,
  debug = false
}: UseOrderCallsRealtimeProps) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Use refs to store the latest callback functions
  const onInsertRef = useRef(onInsert)
  const onUpdateRef = useRef(onUpdate)
  const onDeleteRef = useRef(onDelete)
  const onConnectionChangeRef = useRef(onConnectionChange)
  
  // Update refs when callbacks change
  onInsertRef.current = onInsert
  onUpdateRef.current = onUpdate
  onDeleteRef.current = onDelete
  onConnectionChangeRef.current = onConnectionChange

  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[OrderCallsRealtime] ${message}`, data || '')
    }
  }, [debug])

  useEffect(() => {
    const setupSubscription = () => {
      // Clean up existing channel
      if (channelRef.current) {
        log('Removing existing channel')
        supabase.removeChannel(channelRef.current)
      }

      // Clear reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }

      log('Setting up new subscription', { storeId })
      onConnectionChangeRef.current?.('connecting')

      // Use consistent channel name across all components
      const channelName = `order-calls-store-${storeId}`
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_calls',
            filter: `store_id=eq.${storeId}`
          },
          (payload) => {
            log('INSERT event received', payload)
            const newCall = payload.new as OrderCall
            // Only process calls without deleted_at
            if (!newCall.deleted_at) {
              onInsertRef.current?.(newCall)
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'order_calls',
            filter: `store_id=eq.${storeId}`
          },
          (payload) => {
            log('UPDATE event received', payload)
            const updatedCall = payload.new as OrderCall
            onUpdateRef.current?.(updatedCall)
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'order_calls',
            filter: `store_id=eq.${storeId}`
          },
          (payload) => {
            log('DELETE event received', payload)
            const deletedCall = payload.old as OrderCall
            onDeleteRef.current?.(deletedCall)
          }
        )
        .subscribe((status) => {
          log('Subscription status changed', status)
          
          if (status === 'SUBSCRIBED') {
            onConnectionChangeRef.current?.('connected')
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onConnectionChangeRef.current?.('disconnected')
            // Retry connection after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
              log('Attempting to reconnect...')
              setupSubscription()
            }, 5000)
          } else if (status === 'CLOSED') {
            onConnectionChangeRef.current?.('disconnected')
          }
        })

      channelRef.current = channel
    }

    setupSubscription()

    // Cleanup on unmount
    return () => {
      if (channelRef.current) {
        log('Cleaning up subscription')
        supabase.removeChannel(channelRef.current)
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [storeId, log, supabase]) // include supabase for eslint rule; createClient() returns stable singleton

  return {
    isConnected: channelRef.current !== null
  }
}