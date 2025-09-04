'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { createKoreanAnnouncement } from '@/lib/korean-number'

interface CallNotificationPopupProps {
  isVisible: boolean
  orderType: 'takeout' | 'dine_in'
  orderNumber: number
  onComplete: () => void
  audioEnabled?: boolean
}

type PopupState = 'calling' | 'completed' | 'hiding'

export function CallNotificationPopup({
  isVisible,
  orderType,
  orderNumber,
  onComplete,
  audioEnabled = false
}: CallNotificationPopupProps) {
  console.log('[CallNotificationPopup] 컴포넌트 렌더링됨, props:', { isVisible, orderType, orderNumber, audioEnabled })

  const [popupState, setPopupState] = useState<PopupState>('calling')
  const [mounted, setMounted] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<{orderType: 'takeout' | 'dine_in', orderNumber: number} | null>(null)
  const [notificationCount, setNotificationCount] = useState(0) // 0, 1, 2로 알림 횟수 추적
  const isExecutingRef = useRef(false) // 중복 실행 방지
  const timeoutRef = useRef<NodeJS.Timeout | null>(null) // 타이머 참조

  // ===== 새로운 알림 시스템 (정확히 2번 실행) =====
  
  // 단일 음성 재생 함수
  const playVoiceOnce = useCallback((
    orderType: 'takeout' | 'dine_in',
    orderNumber: number,
    notificationNumber: number
  ) => {
    if (!audioEnabled || !('speechSynthesis' in window)) {
      console.log('[CallNotificationPopup] 음성 합성 비활성화 또는 지원되지 않음')
      return
    }

    console.log(`[CallNotificationPopup] ${notificationNumber}번째 음성 안내 시작`)

    const announcementText = createKoreanAnnouncement(orderType, orderNumber)
    const utterance = new SpeechSynthesisUtterance(announcementText)
    utterance.lang = 'ko-KR'
    utterance.volume = 0.8
    utterance.rate = 0.9
    utterance.pitch = 1.0

    utterance.onend = () => {
      console.log(`[CallNotificationPopup] ${notificationNumber}번째 음성 재생 완료`)
    }

    utterance.onerror = () => {
      console.error(`[CallNotificationPopup] ${notificationNumber}번째 음성 재생 오류`)
    }

    window.speechSynthesis.speak(utterance)
  }, [audioEnabled])

  // 단일 알림 실행 함수 (팝업 + 음성)
  const executeNotification = useCallback((
    orderType: 'takeout' | 'dine_in',
    orderNumber: number,
    notificationNumber: number
  ) => {
    console.log(`[CallNotificationPopup] ${notificationNumber}번째 알림 실행`)
    
    // 팝업 상태 설정
    setPopupState('calling')
    
    // 음성 재생
    playVoiceOnce(orderType, orderNumber, notificationNumber)
    
    // 팝업 표시 시간 (3초)
    setTimeout(() => {
      setPopupState('completed')
      setTimeout(() => {
        setPopupState('hiding')
      }, 1000) // completed 상태를 1초간 표시
    }, 3000)
  }, [playVoiceOnce])

  // 컴포넌트 마운트 상태 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // 메인 알림 로직 - 정확히 2번 실행
  useEffect(() => {
    console.log('[CallNotificationPopup] 상태 변경:', { isVisible, notificationCount, isExecuting: isExecutingRef.current })

    // 숨김 상태일 때 초기화
    if (!isVisible) {
      console.log('[CallNotificationPopup] 팝업 숨김, 상태 초기화')
      setCurrentNotification(null)
      setPopupState('calling')
      setNotificationCount(0)
      isExecutingRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      return
    }

    // 이미 실행 중이거나 완료된 경우 중복 실행 방지
    if (isExecutingRef.current || notificationCount >= 2) {
      return
    }

    // 첫 번째 표시일 때만 알림 시퀀스 시작
    if (isVisible && notificationCount === 0) {
      console.log('[CallNotificationPopup] 알림 시퀀스 시작 - 2번 실행 예정')
      isExecutingRef.current = true
      setCurrentNotification({ orderType, orderNumber })
      
      // 첫 번째 알림 즉시 실행
      setNotificationCount(1)
      executeNotification(orderType, orderNumber, 1)
      
      // 두 번째 알림 4초 후 실행
      timeoutRef.current = setTimeout(() => {
        console.log('[CallNotificationPopup] 두 번째 알림 실행')
        setNotificationCount(2)
        executeNotification(orderType, orderNumber, 2)
        
        // 6초 후 완전 종료 (두 번째 알림의 팝업 시간 고려)
        timeoutRef.current = setTimeout(() => {
          console.log('[CallNotificationPopup] 알림 시퀀스 완료')
          onComplete()
        }, 6000)
      }, 4000)
    }
  }, [isVisible, notificationCount, orderType, orderNumber, executeNotification, onComplete])

  // 클린업
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // 표시 중이지만 큐에서 현재 알림이 없는 경우 props로부터 생성
  const displayNotification = currentNotification || (isVisible ? { orderType, orderNumber } : null)
  
  console.log('[CallNotificationPopup] 렌더링 체크:', { mounted, hasCurrentNotification: !!currentNotification, displayNotification, isVisible })
  if (!mounted || !displayNotification) {
    console.log('[CallNotificationPopup] 렌더링하지 않음 - 마운트됨:', mounted, '표시알림:', !!displayNotification)
    return null
  }

  const orderTypeText = displayNotification.orderType === 'takeout' ? '포장' : '매장'
  const orderColorClass = displayNotification.orderType === 'takeout' 
    ? 'from-emerald-500 to-emerald-600' 
    : 'from-indigo-500 to-indigo-600'

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-500 ${
        popupState === 'hiding' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className={`relative transform transition-all duration-500 ${
        popupState === 'hiding' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
      }`}>
        {popupState === 'calling' && (
          <div className={`flex items-center justify-center rounded-3xl bg-gradient-to-br ${orderColorClass} p-12 text-white shadow-2xl border-4 border-white/20 backdrop-blur-sm`}
               style={{ width: '600px', height: '400px' }}>
            <div className="text-center">
              {/* Calling Animation */}
              <div className="mb-8 flex justify-center relative">
                <div className="relative">
                  {/* Outer pulse ring */}
                  <div className="absolute h-24 w-24 animate-ping rounded-full bg-white/20 animation-delay-0"></div>
                  <div className="absolute h-20 w-20 animate-ping rounded-full bg-white/30 animation-delay-150"></div>
                  <div className="absolute h-16 w-16 animate-ping rounded-full bg-white/40 animation-delay-300"></div>
                  
                  {/* Center icon */}
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
                    <svg className="h-10 w-10 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="space-y-6">
                <div className="inline-block rounded-2xl bg-white/25 px-8 py-4 text-2xl font-semibold backdrop-blur-sm">
                  {orderTypeText}
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-8xl font-black tracking-tight">
                    {displayNotification.orderNumber}
                  </div>
                  <div className="text-4xl font-medium">번 고객님</div>
                </div>
              </div>

              {/* Calling Text with animation */}
              <div className="mt-8">
                <div className="text-2xl font-medium opacity-90 animate-pulse">
                  📢 호출 중입니다
                </div>
              </div>
            </div>
          </div>
        )}

        {popupState === 'completed' && (
          <div className={`flex items-center justify-center rounded-3xl bg-gradient-to-br ${orderColorClass} p-12 text-white shadow-2xl border-4 border-white/20 backdrop-blur-sm`}
               style={{ width: '600px', height: '400px' }}>
            <div className="text-center">
              {/* Success Animation */}
              <div className="mb-8 flex justify-center relative">
                <div className="relative">
                  {/* Success ring animation */}
                  <div className="absolute h-24 w-24 animate-ping rounded-full bg-white/20 animation-delay-0"></div>
                  <div className="absolute h-20 w-20 animate-ping rounded-full bg-white/30 animation-delay-150"></div>
                  <div className="absolute h-16 w-16 animate-ping rounded-full bg-white/40 animation-delay-300"></div>
                  
                  {/* Center checkmark */}
                  <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
                    <svg className="h-10 w-10 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Order Information */}
              <div className="space-y-6">
                <div className="inline-block rounded-2xl bg-white/25 px-8 py-4 text-2xl font-semibold backdrop-blur-sm">
                  {orderTypeText}
                </div>
                <div className="flex flex-col items-center justify-center">
                  <div className="text-8xl font-black tracking-tight">
                    {displayNotification.orderNumber}
                  </div>
                  <div className="text-4xl font-medium">번 고객님</div>
                </div>
              </div>

              {/* Completion Text with animation */}
              <div className="mt-8">
                <div className="text-2xl font-medium opacity-90 animate-pulse">
                  ✅ 픽업 준비 완료
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}