'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NotificationItem } from '@/lib/enhanced-notification-queue'

interface SimpleCallNotificationPopupProps {
  notification: NotificationItem | null
  isVisible: boolean
}

type AnimationState = 'enter' | 'show' | 'exit'

export function SimpleCallNotificationPopup({
  notification,
  isVisible
}: SimpleCallNotificationPopupProps) {
  const [mounted, setMounted] = useState(false)
  const [animationState, setAnimationState] = useState<AnimationState>('enter')

  // 컴포넌트 마운트 상태
  useEffect(() => {
    setMounted(true)
  }, [])

  // 가시성 변경에 따른 애니메이션 상태 관리
  useEffect(() => {
    if (isVisible && notification) {
      setAnimationState('enter')
      // 입장 애니메이션 후 표시 상태로 전환
      const timer = setTimeout(() => {
        setAnimationState('show')
      }, 100)
      return () => clearTimeout(timer)
    } else if (!isVisible) {
      setAnimationState('exit')
    }
  }, [isVisible, notification])

  // 마운트되지 않았거나 알림이 없으면 렌더링하지 않음
  if (!mounted || !notification) {
    return null
  }

  const orderTypeText = notification.orderType === 'takeout' ? '포장' : '매장'
  const orderColorClass = notification.orderType === 'takeout' 
    ? 'from-emerald-500 to-emerald-600' 
    : 'from-indigo-500 to-indigo-600'

  // 애니메이션 클래스 결정
  const getAnimationClasses = () => {
    switch (animationState) {
      case 'enter':
        return 'opacity-0 scale-90'
      case 'show':
        return 'opacity-100 scale-100'
      case 'exit':
        return 'opacity-0 scale-95'
      default:
        return 'opacity-100 scale-100'
    }
  }

  // 호출 횟수에 따른 아이콘과 메시지
  const getCallDisplay = () => {
    if (notification.status === 'first_call') {
      return {
        icon: (
          <svg className="h-10 w-10 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        ),
        message: '📢 첫 번째 호출',
        pulseCount: 3
      }
    } else if (notification.status === 'second_call') {
      return {
        icon: (
          <svg className="h-10 w-10 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        ),
        message: '🔔 마지막 호출',
        pulseCount: 4
      }
    } else {
      return {
        icon: (
          <svg className="h-10 w-10 animate-bounce" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        ),
        message: '📢 호출 중입니다',
        pulseCount: 3
      }
    }
  }

  const callDisplay = getCallDisplay()

  return createPortal(
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md transition-all duration-500 ${getAnimationClasses()}`}
    >
      <div className={`relative transform transition-all duration-500 ${getAnimationClasses()}`}>
        <div 
          className={`flex items-center justify-center rounded-3xl bg-gradient-to-br ${orderColorClass} p-12 text-white shadow-2xl border-4 border-white/20 backdrop-blur-sm`}
          style={{ width: '600px', height: '400px' }}
        >
          <div className="text-center">
            {/* 호출 애니메이션 */}
            <div className="mb-8 flex justify-center relative">
              <div className="relative">
                {/* 동적 펄스 링 */}
                {Array.from({ length: callDisplay.pulseCount }).map((_, index) => (
                  <div
                    key={index}
                    className={`absolute rounded-full bg-white/20 animate-ping`}
                    style={{
                      width: `${96 - index * 16}px`,
                      height: `${96 - index * 16}px`,
                      animationDelay: `${index * 150}ms`,
                      top: `${index * 8}px`,
                      left: `${index * 8}px`
                    }}
                  />
                ))}
                
                {/* 중앙 아이콘 */}
                <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-white/30 backdrop-blur-sm">
                  {callDisplay.icon}
                </div>
              </div>
            </div>

            {/* 주문 정보 */}
            <div className="space-y-6">
              <div className="inline-block rounded-2xl bg-white/25 px-8 py-4 text-2xl font-semibold backdrop-blur-sm">
                {orderTypeText}
              </div>
              <div className="flex flex-col items-center justify-center">
                <div className="text-8xl font-black tracking-tight">
                  {notification.orderNumber}
                </div>
                <div className="text-4xl font-medium">번 고객님</div>
              </div>
            </div>

            {/* 호출 메시지 */}
            <div className="mt-8">
              <div className="text-2xl font-medium opacity-90 animate-pulse">
                {callDisplay.message}
              </div>
              {notification.status === 'second_call' && (
                <div className="text-lg font-medium opacity-75 mt-2">
                  픽업 준비가 완료되었습니다
                </div>
              )}
            </div>

            {/* 호출 횟수 표시 */}
            <div className="mt-6 flex justify-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${notification.callCount >= 1 ? 'bg-white' : 'bg-white/30'}`} />
              <div className={`w-3 h-3 rounded-full ${notification.callCount >= 2 ? 'bg-white' : 'bg-white/30'}`} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
