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
  const [hasExecuted, setHasExecuted] = useState(false) // 알림 실행 여부 추적
  const isPlayingRef = useRef(false)

  // ===== 모듈화된 함수들 =====
  // 1. 음성 재생 모듈: 주문 호출 음성을 재생
  // 2. 팝업 제어 모듈: 팝업의 전체 생명주기를 관리

  // 음성 재생 모듈
  const playVoiceAnnouncement = useCallback((
    orderType: 'takeout' | 'dine_in',
    orderNumber: number,
    onVoiceComplete?: () => void
  ) => {
    if (!audioEnabled || !('speechSynthesis' in window)) {
      console.log('[CallNotificationPopup] 음성 합성 비활성화 또는 지원되지 않음')
      onVoiceComplete?.()
      return
    }

    console.log('[CallNotificationPopup] 음성 안내 시작')

    // 브라우저에서 음성 합성 API가 지원되는지 확인
    if ('speechSynthesis' in window) {
      // 주문 유형과 번호를 기반으로 한국어 발표문 생성
      const announcementText = createKoreanAnnouncement(orderType, orderNumber)

      // 음성 재생 횟수 및 최대 재생 횟수 설정 (단 1회)
      let playCount = 0
      const maxPlays = 1

      // 음성 재생 함수 정의
      const playVoice = () => {
        // 최대 재생 횟수에 도달하면 재생 중단
        if (playCount >= maxPlays) {
          onVoiceComplete?.()
          return
        }

        // 재생 시도 횟수 표시 (실제 성공 횟수 + 1)
        const attemptCount = playCount + 1
        console.log(`[CallNotificationPopup] 음성 재생 시도 ${attemptCount}회 / ${maxPlays}회`)

        // SpeechSynthesisUtterance 객체 생성 및 설정
        const utterance = new SpeechSynthesisUtterance(announcementText)
        utterance.lang = 'ko-KR'        // 한국어 설정
        utterance.volume = 0.8          // 볼륨 설정 (0.0 ~ 1.0)
        utterance.rate = 0.9            // 속도 설정 (0.1 ~ 10.0)
        utterance.pitch = 1.0           // 피치 설정 (0 ~ 2)

        // 음성 재생 완료 이벤트 핸들러 (단 1회 재생 후 즉시 종료)
        utterance.onend = () => {
          playCount++
          console.log(`[CallNotificationPopup] 음성 재생 성공 ${playCount}회 완료`)
          console.log('[CallNotificationPopup] 음성 안내 완료 - 즉시 종료')
          onVoiceComplete?.()
        }

        // 음성 재생 오류 이벤트 핸들러 (재시도 없이 즉시 종료)
        utterance.onerror = () => {
          console.error('[CallNotificationPopup] 음성 오류 - 즉시 종료')
          onVoiceComplete?.()
        }

        // 음성 재생 시작
        window.speechSynthesis.speak(utterance)
      }

      // 지연 없이 즉시 음성 재생 시작 (단 1회)
      playVoice()
    }
  }, [audioEnabled])

  // 팝업 제어 모듈 (타임아웃 없이 단일 실행)
  const startPopupSequence = useCallback((
    orderType: 'takeout' | 'dine_in',
    orderNumber: number
  ) => {
    console.log('[CallNotificationPopup] 팝업 시퀀스 시작:', { orderType, orderNumber })

    // 팝업을 calling 상태로 설정
    setPopupState('calling')

    // 음성 재생 시작 (동시에)
    playVoiceAnnouncement(orderType, orderNumber, () => {
      console.log('[CallNotificationPopup] 음성 재생 완료 콜백 - 팝업 종료 진행')
      // 음성 재생 완료 즉시 완료 단계로 전환하고 종료
      setPopupState('completed')
      setPopupState('hiding')
      setHasExecuted(false)
      onComplete()
    })
  }, [playVoiceAnnouncement, onComplete])

  // 포털 렌더링을 위한 컴포넌트 마운트 상태 확인
  useEffect(() => {
    setMounted(true)
  }, [])

  // 충돌 방지를 위해 비활성화된 기존 큐 프로세서
  useEffect(() => {
    // 직접 처리와의 충돌 방지를 위해 큐 시스템 비활성화
    console.log('[CallNotificationPopup] 충돌 방지를 위해 큐 프로세서 비활성화됨')
    return () => {
      // 정리 작업만 수행
      if (isPlayingRef.current) {
        window.speechSynthesis.cancel()
        isPlayingRef.current = false
      }
    }
  }, [])

    // 충돌 방지를 위해 제거된 기존 코드

  // 팝업 표시 상태 변경 감지 - 단 한 번만 실행 (타임아웃 제거)
  useEffect(() => {
    console.log('[CallNotificationPopup] 팝업 표시 상태 변경:', { isVisible, hasExecuted })

    if (!isVisible) {
      console.log('[CallNotificationPopup] 팝업 숨김, 상태 초기화')
      setCurrentNotification(null)
      setPopupState('calling')
      setHasExecuted(false)
      return
    }

    if (isVisible && !hasExecuted) {
      console.log('[CallNotificationPopup] 새 알림 실행 시작 (타임아웃 없이 1회 실행)')
      setHasExecuted(true)
      setCurrentNotification({ orderType, orderNumber })
      startPopupSequence(orderType, orderNumber)
    }
  }, [isVisible, hasExecuted, orderType, orderNumber, startPopupSequence])

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