'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageCarousel } from './ImageCarousel'
import { OrderNotifications } from './OrderNotifications'
import { CallNotificationPopup } from '@/components/ui/CallNotificationPopup'
import { Database } from '@/types/database'
import { RealtimeChannel } from '@supabase/supabase-js'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface DisplayScreenProps {
  storeId: string
}

export function DisplayScreen({ storeId }: DisplayScreenProps) {
  const [recentCalls, setRecentCalls] = useState<OrderCall[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [showNotification, setShowNotification] = useState(false)
  const [currentCall, setCurrentCall] = useState<OrderCall | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const supabase = createClient()

  useEffect(() => {
    
    // Fetch recent calls
    const fetchCalls = async () => {
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 2) // Display for 2 minutes

      const { data, error } = await supabase
        .from('order_calls')
        .select('*')
        .eq('store_id', storeId)
        .is('deleted_at', null)
        .gte('called_at', cutoffTime.toISOString())
        .order('called_at', { ascending: false })
        .limit(10)

      if (!error && data) setRecentCalls(data)
    }

    fetchCalls()

    // Subscribe to realtime updates with better error handling
    const setupRealtimeSubscription = () => {
      // Remove existing channel if any
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      const channel = supabase
        .channel(`order-calls-${storeId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'order_calls',
            filter: `store_id=eq.${storeId}`
          },
          (payload) => {
            const newCall = payload.new as OrderCall
            
            // Show notification popup for each new order
            setCurrentCall(newCall)
            setShowNotification(true)

            // Add to display regardless
            setRecentCalls(prev => {
              const filtered = prev.filter(call => call.id !== newCall.id)
              return [newCall, ...filtered].slice(0, 10)
            })
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
            const deletedCall = payload.old as OrderCall
            setRecentCalls(prev => prev.filter(call => call.id !== deletedCall.id))
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
            const updatedCall = payload.new as OrderCall
            // Update the call in the list
            setRecentCalls(prev => prev.map(call => 
              call.id === updatedCall.id ? updatedCall : call
            ))
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnectionStatus('connected')
          } else if (status === 'CHANNEL_ERROR') {
            setConnectionStatus('disconnected')
            // Retry after 5 seconds
            setTimeout(setupRealtimeSubscription, 5000)
          } else if (status === 'TIMED_OUT') {
            setConnectionStatus('disconnected')
            // Retry after 5 seconds
            setTimeout(setupRealtimeSubscription, 5000)
          }
        })

      channelRef.current = channel
    }

    setupRealtimeSubscription()

    // Refresh every minute to remove old calls
    const interval = setInterval(fetchCalls, 60000)

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      clearInterval(interval)
    }
  }, [storeId, supabase])

  // Handle popup completion - useCallback to prevent function recreation
  const handleNotificationComplete = useCallback(() => {
    setShowNotification(false)
    setCurrentCall(null)
  }, [])

  return (
    <div className="flex h-screen bg-black">
      {/* Left: Image Carousel (60%) */}
      <div className="w-4/5">
        <ImageCarousel storeId={storeId} />
      </div>

      {/* Right: Order Notifications (40%) */}
      <div className="w-1/5 bg-white relative">
        {/* Connection Status Indicator */}
        <div className="absolute top-2 right-2 z-10">
          <div className={`h-2 w-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-green-500' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`} />
        </div>
        <OrderNotifications calls={recentCalls} />
      </div>

      {/* Call Notification Popup */}
      {showNotification && currentCall && (
        <CallNotificationPopup
          isVisible={showNotification}
          orderType={currentCall.type}
          orderNumber={currentCall.number}
          onComplete={handleNotificationComplete}
        />
      )}
    </div>
  )
}