'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { enhancedNotificationQueue, NotificationItem } from '../enhanced-notification-queue'
import { useOrderCallsRealtime } from './useOrderCallsRealtime'
import { Database } from '@/types/database'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface NotificationControllerState {
  currentNotification: NotificationItem | null
  isVisible: boolean
  queueStatus: {
    isProcessing: boolean
    queueSize: number
    currentItem: NotificationItem | null
    speech?: {
      isSpeaking: boolean
      hasCurrentUtterance: boolean
      browserSpeaking: boolean
    }
  }
}

interface UseNotificationControllerProps {
  storeId: string
  audioEnabled?: boolean
  debug?: boolean
}

export function useNotificationController({
  storeId,
  audioEnabled = true,
  debug = false
}: UseNotificationControllerProps) {
  const [state, setState] = useState<NotificationControllerState>({
    currentNotification: null,
    isVisible: false,
    queueStatus: {
      isProcessing: false,
      queueSize: 0,
      currentItem: null
    }
  })

  const isInitializedRef = useRef(false)

  const log = useCallback((message: string, data?: any) => {
    if (debug) {
      console.log(`[NotificationController] ${message}`, data || '')
    }
  }, [debug])

  // Queue callbacks 설정
  useEffect(() => {
    if (isInitializedRef.current) return

    log('컨트롤러 초기화 시작')

    enhancedNotificationQueue.setCallbacks({
      onShowPopup: (item: NotificationItem) => {
        log('팝업 표시:', item)
        setState(prev => ({
          ...prev,
          currentNotification: item,
          isVisible: true,
          queueStatus: enhancedNotificationQueue.getStatus()
        }))
      },

      onHidePopup: () => {
        log('팝업 숨김')
        setState(prev => ({
          ...prev,
          isVisible: false,
          queueStatus: enhancedNotificationQueue.getStatus()
        }))
      },

      onComplete: (item: NotificationItem) => {
        log('알림 완료:', item)
        setState(prev => ({
          ...prev,
          currentNotification: null,
          isVisible: false,
          queueStatus: enhancedNotificationQueue.getStatus()
        }))
      }
    })

    isInitializedRef.current = true
    log('컨트롤러 초기화 완료')
  }, [log])

  // Realtime 이벤트 처리
  const handleNewCall = useCallback((call: OrderCall) => {
    log('새 주문 호출 수신:', call)
    
    if (call.deleted_at) {
      // 삭제된 호출 - 큐에서 제거
      log('호출 삭제 - 큐에서 제거:', call)
      enhancedNotificationQueue.removeFromQueue(call.type, call.number)
    } else {
      // 새 호출 - 큐에 추가
      log('새 호출 - 큐에 추가:', call)
      enhancedNotificationQueue.enqueue(call.type, call.number)
    }

    // 상태 업데이트
    setState(prev => ({
      ...prev,
      queueStatus: enhancedNotificationQueue.getStatus()
    }))
  }, [log])

  const handleCallUpdate = useCallback((call: OrderCall) => {
    log('주문 호출 업데이트:', call)
    
    if (call.deleted_at) {
      // soft delete된 경우 큐에서 제거
      log('호출 soft delete - 큐에서 제거:', call)
      enhancedNotificationQueue.removeFromQueue(call.type, call.number)
      
      setState(prev => ({
        ...prev,
        queueStatus: enhancedNotificationQueue.getStatus()
      }))
    }
  }, [log])

  const handleCallDelete = useCallback((call: OrderCall) => {
    log('주문 호출 삭제:', call)
    enhancedNotificationQueue.removeFromQueue(call.type, call.number)
    
    setState(prev => ({
      ...prev,
      queueStatus: enhancedNotificationQueue.getStatus()
    }))
  }, [log])

  // Realtime 구독
  const { isConnected } = useOrderCallsRealtime({
    storeId,
    onInsert: handleNewCall,
    onUpdate: handleCallUpdate,
    onDelete: handleCallDelete,
    debug
  })

  // 컨트롤 함수들
  const forceComplete = useCallback(() => {
    log('강제 완료 실행')
    enhancedNotificationQueue.markCurrentCompleted()
    setState(prev => ({
      ...prev,
      queueStatus: enhancedNotificationQueue.getStatus()
    }))
  }, [log])

  const clearQueue = useCallback(() => {
    log('큐 전체 초기화')
    enhancedNotificationQueue.clear()
    setState({
      currentNotification: null,
      isVisible: false,
      queueStatus: enhancedNotificationQueue.getStatus()
    })
  }, [log])

  const addTestNotification = useCallback((
    orderType: 'takeout' | 'dine_in', 
    orderNumber: number
  ) => {
    log('테스트 알림 추가:', { orderType, orderNumber })
    enhancedNotificationQueue.enqueue(orderType, orderNumber)
    setState(prev => ({
      ...prev,
      queueStatus: enhancedNotificationQueue.getStatus()
    }))
  }, [log])

  // 정리
  useEffect(() => {
    return () => {
      log('컨트롤러 정리')
      enhancedNotificationQueue.clear()
    }
  }, [log])

  return {
    // 상태
    currentNotification: state.currentNotification,
    isVisible: state.isVisible,
    queueStatus: state.queueStatus,
    isConnected,
    audioEnabled,

    // 컨트롤 함수
    forceComplete,
    clearQueue,
    addTestNotification,

    // 디버그 정보
    debug: {
      log,
      queueStatus: state.queueStatus
    }
  }
}
