'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageCarousel } from './ImageCarousel'
import { OrderNotifications } from './OrderNotifications'
import { SimpleCallNotificationPopup } from '@/components/ui/SimpleCallNotificationPopup'
import { Database } from '@/types/database'
import { useNotificationController } from '@/lib/hooks/useNotificationController'
import { useSpeechInit } from '@/lib/speech-init'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface DisplayScreenProps {
  storeId: string
}

export function DisplayScreen({ storeId }: DisplayScreenProps) {
  const [recentCalls, setRecentCalls] = useState<OrderCall[]>([])
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('')
  const cleanupTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const supabase = createClient()
  const { isReady: audioEnabled, initializeSpeech } = useSpeechInit()

  // 새로운 통합 알림 시스템 사용
  const {
    currentNotification,
    isVisible: isNotificationVisible,
    queueStatus,
    isConnected,
    debug
  } = useNotificationController({
    storeId,
    audioEnabled,
    debug: true
  })

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
        setRecentCalls(data)
        setLastUpdateTime(new Date().toLocaleTimeString())
      } else if (error) {
        console.error('[Display] Error loading initial calls:', error)
      }
    }

    loadInitialCalls()
  }, [storeId, supabase])

  // Display용 별도 realtime 구독 (표시 목적만)
  useEffect(() => {
    const subscription = supabase
      .channel(`display-calls-${storeId}`)
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
          if (!newCall.deleted_at) {
            console.log('[Display] Adding call to display list:', newCall)
            setRecentCalls(prev => {
              const filtered = prev.filter(call => call.id !== newCall.id)
              return [newCall, ...filtered].slice(0, 10)
            })
            setLastUpdateTime(new Date().toLocaleTimeString())

            // 2분 후 자동 제거
            const timerId = setTimeout(() => {
              console.log('[Display] Auto-removing call after 2 minutes:', newCall.id)
              setRecentCalls(prev => prev.filter(call => call.id !== newCall.id))
              cleanupTimersRef.current.delete(newCall.id)
            }, 2 * 60 * 1000)

            cleanupTimersRef.current.set(newCall.id, timerId)
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
          const updatedCall = payload.new as OrderCall
          if (updatedCall.deleted_at) {
            console.log('[Display] Removing deleted call from display:', updatedCall.id)
            setRecentCalls(prev => prev.filter(call => call.id !== updatedCall.id))
            const timer = cleanupTimersRef.current.get(updatedCall.id)
            if (timer) {
              clearTimeout(timer)
              cleanupTimersRef.current.delete(updatedCall.id)
            }
          }
          setLastUpdateTime(new Date().toLocaleTimeString())
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
          console.log('[Display] Removing deleted call from display:', deletedCall.id)
          setRecentCalls(prev => prev.filter(call => call.id !== deletedCall.id))
          const timer = cleanupTimersRef.current.get(deletedCall.id)
          if (timer) {
            clearTimeout(timer)
            cleanupTimersRef.current.delete(deletedCall.id)
          }
          setLastUpdateTime(new Date().toLocaleTimeString())
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [storeId, supabase])

  // Auto-initialize speech on component mount
  useEffect(() => {
    initializeSpeech()
    
    const handleGlobalInteraction = async () => {
      if (!audioEnabled) {
        await initializeSpeech()
      }
    }
    
    document.addEventListener('click', handleGlobalInteraction, { once: true })
    document.addEventListener('touchstart', handleGlobalInteraction, { once: true })
    document.addEventListener('keydown', handleGlobalInteraction, { once: true })
    
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

  // 연결 상태 계산
  const connectionStatus = isConnected ? 'connected' : 'disconnected'

  return (
    <div className="flex h-screen bg-black relative">
      {/* Left: Image Carousel (60%) */}
      <div className="w-4/5">
        <ImageCarousel storeId={storeId} />
      </div>

      {/* Right: Order Notifications (40%) */}
      <div className="w-1/5 bg-white relative">
        {/* Enhanced Connection Status Indicator */}
        <div className="absolute top-2 right-2 z-10">
          <div className="flex items-center space-x-2 bg-white/90 rounded px-2 py-1">
            <div className={`h-3 w-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`} />
            <div className="text-xs">
              <div className={`font-mono font-bold ${
                connectionStatus === 'connected' ? 'text-green-600' : 'text-red-600'
              }`}>
                {connectionStatus === 'connected' ? 'LIVE' : 'DISC'}
              </div>
              {lastUpdateTime && (
                <div className="text-gray-500 text-xs">{lastUpdateTime}</div>
              )}
            </div>
            <div className="text-xs text-gray-600">
              {recentCalls.length} calls
            </div>
            {/* Queue 상태 표시 */}
            {queueStatus.isProcessing && (
              <div className="text-xs text-orange-600 font-bold">
                Q:{queueStatus.queueSize + 1}
              </div>
            )}
          </div>
        </div>
        <OrderNotifications 
          calls={recentCalls} 
          key={`calls-${recentCalls.length}-${recentCalls.map(c => c.id).join(',')}`}
        />
      </div>

      {/* 새로운 통합 알림 팝업 */}
      <SimpleCallNotificationPopup
        notification={currentNotification}
        isVisible={isNotificationVisible}
      />

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
            
            {/* 디버그 정보 (개발 모드에서만) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-8 p-4 bg-gray-100 rounded text-left text-sm">
                <h3 className="font-bold mb-2">디버그 정보:</h3>
                <p>Queue 상태: {queueStatus.isProcessing ? '처리중' : '대기중'}</p>
                <p>Queue 크기: {queueStatus.queueSize}</p>
                <p>현재 알림: {currentNotification ? `${currentNotification.orderType} ${currentNotification.orderNumber}번` : '없음'}</p>
                <p>연결 상태: {connectionStatus}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}