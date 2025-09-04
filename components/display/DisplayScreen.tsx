'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageCarousel } from './ImageCarousel'
import { OrderNotifications } from './OrderNotifications'
import { CallNotificationPopup } from '@/components/ui/CallNotificationPopup'
import { Database } from '@/types/database'
import { useOrderCallsRealtime } from '@/lib/hooks/useOrderCallsRealtime'
import { useSpeechInit } from '@/lib/speech-init'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface DisplayScreenProps {
  storeId: string
}

export function DisplayScreen({ storeId }: DisplayScreenProps) {
  const [recentCalls, setRecentCalls] = useState<OrderCall[]>([])
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const [showNotification, setShowNotification] = useState(false)
  const [currentCall, setCurrentCall] = useState<OrderCall | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const cleanupTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const supabase = createClient()
  const { isReady: audioEnabled, initializeSpeech } = useSpeechInit()

  // Load initial data on mount
  useEffect(() => {
    const loadInitialCalls = async () => {
      console.log('[Display] Loading initial calls for store:', storeId)
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - 2) // Show calls from last 2 minutes
      
      const { data, error } = await supabase
        .from('order_calls')
        .select('*')
        .eq('store_id', storeId)
        .is('deleted_at', null) // Only non-deleted calls
        .gte('called_at', cutoffTime.toISOString())
        .order('called_at', { ascending: false })
        .limit(10)
      
      if (data && !error) {
        console.log('[Display] Initial calls loaded:', data.length, 'calls')
        console.log('[Display] Initial calls:', data.map(c => `${c.id}:${c.number}`))
        setRecentCalls(data)
      } else if (error) {
        console.error('[Display] Error loading initial calls:', error)
      }
    }

    loadInitialCalls()
  }, [storeId, supabase])

  // Memoized callback functions to prevent unnecessary subscription resets
  const handleInsert = useCallback((newCall: OrderCall) => {
    console.log('[Display] New call received:', newCall)
    console.log('[Display] Call details:', { id: newCall.id, number: newCall.number, type: newCall.type, deleted_at: newCall.deleted_at })
    
    // Only process non-deleted calls
    if (newCall.deleted_at) {
      console.log('[Display] Skipping deleted call:', newCall.id)
      return
    }

    // 1. First update the display list to ensure immediate UI response
    console.log('[Display] Adding call to display list:', newCall.id, newCall.number)
    setRecentCalls(prev => {
      const filtered = prev.filter(call => call.id !== newCall.id)
      const updated = [newCall, ...filtered].slice(0, 10)
      console.log('[Display] Updated calls list:', updated.map(c => `${c.id}:${c.number}`))
      return updated
    })

    // 2. Show notification popup immediately
    console.log('[Display] About to show notification popup for:', newCall.number)
    setCurrentCall(newCall)
    setShowNotification(true)

    // 3. Set up automatic removal after 2 minutes
    const timerId = setTimeout(() => {
      console.log('[Display] Auto-removing call after 2 minutes:', newCall.id, newCall.number)
      setRecentCalls(prev => {
        const filtered = prev.filter(call => call.id !== newCall.id)
        console.log('[Display] After auto-removal:', filtered.map(c => `${c.id}:${c.number}`))
        return filtered
      })
      cleanupTimersRef.current.delete(newCall.id)
    }, 2 * 60 * 1000)

    // Clear existing timer if any
    const existingTimer = cleanupTimersRef.current.get(newCall.id)
    if (existingTimer) {
      clearTimeout(existingTimer)
      console.log('[Display] Cleared existing timer for:', newCall.id)
    }
    cleanupTimersRef.current.set(newCall.id, timerId)
    console.log('[Display] Set auto-removal timer for:', newCall.id)
  }, [])

  const handleUpdate = useCallback((updatedCall: OrderCall) => {
    console.log('[Display] Call updated:', updatedCall)
    
    if (updatedCall.deleted_at) {
      console.log('[Display] Call marked as deleted, removing:', updatedCall.id)
      setRecentCalls(prev => {
        const filtered = prev.filter(call => call.id !== updatedCall.id)
        console.log('[Display] After removing deleted call:', filtered.map(c => `${c.id}:${c.number}`))
        return filtered
      })
      
      // Clear the auto-removal timer
      const timer = cleanupTimersRef.current.get(updatedCall.id)
      if (timer) {
        clearTimeout(timer)
        cleanupTimersRef.current.delete(updatedCall.id)
      }
    } else {
      // Update the call in the list
      console.log('[Display] Updating call in list:', updatedCall.id)
      setRecentCalls(prev => {
        const updated = prev.map(call =>
          call.id === updatedCall.id ? updatedCall : call
        )
        console.log('[Display] After update:', updated.map(c => `${c.id}:${c.number}`))
        return updated
      })
    }
  }, [])

  const handleDelete = useCallback((deletedCall: OrderCall) => {
    console.log('[Display] Call deleted:', deletedCall)
    setRecentCalls(prev => {
      const filtered = prev.filter(call => call.id !== deletedCall.id)
      console.log('[Display] After hard delete:', filtered.map(c => `${c.id}:${c.number}`))
      return filtered
    })
    
    // Clear the auto-removal timer
    const timer = cleanupTimersRef.current.get(deletedCall.id)
    if (timer) {
      clearTimeout(timer)
      cleanupTimersRef.current.delete(deletedCall.id)
    }
  }, [])

  const handleConnectionChange = useCallback((status: 'connecting' | 'connected' | 'disconnected') => {
    console.log('[Display] Connection status changed:', status)
    setConnectionStatus(status)
    setLastUpdateTime(new Date().toLocaleTimeString())
  }, [])

  // Setup realtime subscription with memoized callbacks
  useOrderCallsRealtime({
    storeId,
    onInsert: handleInsert,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    onConnectionChange: handleConnectionChange,
    debug: true
  })

  // Auto-initialize speech on component mount
  useEffect(() => {
    // Try to initialize immediately (might work in some cases)
    initializeSpeech()
    
    // Set up global click handler to initialize audio
    const handleGlobalInteraction = async () => {
      if (!audioEnabled) {
        await initializeSpeech()
      }
    }
    
    // Add listeners for any user interaction
    document.addEventListener('click', handleGlobalInteraction, { once: true })
    document.addEventListener('touchstart', handleGlobalInteraction, { once: true })
    document.addEventListener('keydown', handleGlobalInteraction, { once: true })
    
    // Also try after a short delay
    const timer = setTimeout(() => {
      if (!audioEnabled) {
        initializeSpeech()
      }
    }, 1000)
    
    return () => {
      document.removeEventListener('click', handleGlobalInteraction)
      document.removeEventListener('touchstart', handleGlobalInteraction)
      document.removeEventListener('keydown', handleGlobalInteraction)
      clearTimeout(timer)
    }
  }, [audioEnabled, initializeSpeech])

  // Cleanup timers on unmount
  useEffect(() => {
    const timersAtMount = cleanupTimersRef.current
    return () => {
      timersAtMount.forEach(timer => clearTimeout(timer))
      timersAtMount.clear()
    }
  }, [])

  // Handle popup completion - useCallback to prevent function recreation
  const handleNotificationComplete = useCallback(() => {
    setShowNotification(false)
    setCurrentCall(null)
  }, [])

  return (
    <div className="flex h-screen bg-black relative">
      {/* Left: Image Carousel (60%) */}
      <div className="w-4/5">
        <ImageCarousel storeId={storeId} />
      </div>

      {/* Right: Order Notifications (40%) */}
      <div className="w-1/5 bg-white relative">
        {/* Connection Status Indicator */}
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center space-x-2 bg-white/90 rounded px-2 py-1">
            <div className={`h-3 w-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <div className="text-xs">
              <div className={`font-mono font-bold ${
                connectionStatus === 'connected' ? 'text-green-600' : 
                connectionStatus === 'connecting' ? 'text-yellow-600' : 
                'text-red-600'
              }`}>
                {connectionStatus === 'connected' ? 'LIVE' : 
                 connectionStatus === 'connecting' ? 'CONN...' : 'DISC'}
              </div>
              {lastUpdateTime && (
                <div className="text-gray-500 text-xs">{lastUpdateTime}</div>
              )}
            </div>
            <div className="text-xs text-gray-600">
              {recentCalls.length} calls
            </div>
          </div>
        </div>
        <OrderNotifications 
          calls={recentCalls} 
          key={`calls-${recentCalls.length}-${recentCalls.map(c => c.id).join(',')}`}
        />
      </div>

      {/* Call Notification Popup */}
      {showNotification && currentCall && (
        <CallNotificationPopup
          isVisible={showNotification}
          orderType={currentCall.type}
          orderNumber={currentCall.number}
          onComplete={handleNotificationComplete}
          audioEnabled={audioEnabled}
        />
      )}

      {/* Audio Enable Prompt - Shows if audio not enabled */}
      {!audioEnabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-12 text-center max-w-2xl shadow-2xl">
            <div className="mb-6">
              <div className="h-24 w-24 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="h-12 w-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-gray-800">🔊 음성 알림 설정</h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              주문 호출 시 음성 안내를 위해<br/>
              <strong className="text-blue-600">화면을 터치</strong>해주세요
            </p>
            <button
              onClick={initializeSpeech}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-12 py-4 rounded-xl text-2xl font-bold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              ✅ 음성 활성화
            </button>
            <p className="text-sm text-gray-500 mt-6">
              브라우저 정책상 첫 터치 후 음성이 활성화됩니다
            </p>
          </div>
        </div>
      )}
    </div>
  )
}