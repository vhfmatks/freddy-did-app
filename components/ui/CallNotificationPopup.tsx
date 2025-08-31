'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createKoreanAnnouncement } from '@/lib/korean-number'
import { notificationQueue, type QueuedNotification } from '@/lib/notification-queue'

interface CallNotificationPopupProps {
  isVisible: boolean
  orderType: 'takeout' | 'dine_in'
  orderNumber: number
  onComplete: () => void
}

type PopupState = 'calling' | 'completed' | 'hiding'

export function CallNotificationPopup({ 
  isVisible, 
  orderType, 
  orderNumber, 
  onComplete 
}: CallNotificationPopupProps) {
  const [popupState, setPopupState] = useState<PopupState>('calling')
  const [mounted, setMounted] = useState(false)
  const [currentNotification, setCurrentNotification] = useState<QueuedNotification | null>(null)
  const isPlayingRef = useRef(false)
  const playCountRef = useRef(0)

  // Ensure component is mounted for portal
  useEffect(() => {
    setMounted(true)
  }, [])

  // Set up notification queue processor
  useEffect(() => {
    const processNotification = async (notification: QueuedNotification): Promise<void> => {
      return new Promise((resolve) => {
        setCurrentNotification(notification)
        setPopupState('calling')
        isPlayingRef.current = true
        playCountRef.current = 0

        // Start voice announcement with enhanced error handling
        const startVoiceAnnouncement = () => {
          const announcementText = createKoreanAnnouncement(notification.orderType, notification.orderNumber)
          
          try {
            // Check if speech synthesis is available and ready
            if ('speechSynthesis' in window && window.speechSynthesis) {
              // Wait for voices to load if not already loaded
              const voices = window.speechSynthesis.getVoices()
              
              const utterance = new SpeechSynthesisUtterance(announcementText)
              
              // Try to find a Korean voice, fallback to default
              const koreanVoice = voices.find(voice => 
                voice.lang.includes('ko') || voice.lang.includes('KR')
              )
              
              if (koreanVoice) {
                utterance.voice = koreanVoice
              }
              
              utterance.lang = 'ko-KR'
              utterance.volume = 0.8
              utterance.rate = 0.9
              utterance.pitch = 1.0

              // Set up event handlers
              const maxPlays = 2
              
              const handleCompletion = () => {
                playCountRef.current++
                
                if (playCountRef.current < maxPlays) {
                  // Play again after a short delay
                  setTimeout(() => {
                    window.speechSynthesis.speak(utterance)
                  }, 1000)
                } else {
                  // All plays completed, reset and show completion state
                  isPlayingRef.current = false
                  setPopupState('completed')
                  
                  // Keep popup visible for 2 more seconds after voice ends
                  setTimeout(() => {
                    setPopupState('hiding')
                    setTimeout(() => {
                      setCurrentNotification(null)
                      resolve() // Resolve promise to mark as completed
                    }, 500)
                  }, 2000)
                }
              }

              // Add timeout fallback in case speech gets stuck
              const timeoutId = setTimeout(() => {
                if (playCountRef.current < maxPlays) {
                  // Force completion
                  isPlayingRef.current = false
                  setPopupState('completed')
                  setTimeout(() => {
                    setPopupState('hiding')
                    setTimeout(() => {
                      setCurrentNotification(null)
                      resolve()
                    }, 500)
                  }, 2000)
                }
              }, 15000) // 15 second timeout for 2 plays

              utterance.onend = () => {
                clearTimeout(timeoutId)
                handleCompletion()
              }
              
              utterance.onerror = (event) => {
                clearTimeout(timeoutId)
                handleCompletion() // Still proceed to completion
              }

              // Speak the utterance
              window.speechSynthesis.speak(utterance)
              
              // Additional check - if speech synthesis queue is not working
              setTimeout(() => {
                if (!window.speechSynthesis.speaking && isPlayingRef.current) {
                  handleCompletion()
                }
              }, 1000)
              
            } else {
              throw new Error('Speech synthesis not supported')
            }
          } catch (error) {
            isPlayingRef.current = false
            // Fallback without voice
            setPopupState('completed')
            setTimeout(() => {
              setPopupState('hiding')
              setTimeout(() => {
                setCurrentNotification(null)
                resolve()
              }, 500)
            }, 3000)
          }
        }

        // Check if voices need to load
        if ('speechSynthesis' in window) {
          const voices = window.speechSynthesis.getVoices()
          if (voices.length === 0) {
            // Wait for voices to load
            window.speechSynthesis.onvoiceschanged = () => {
              startVoiceAnnouncement()
            }
            
            // Fallback if voices don't load within 2 seconds
            setTimeout(() => {
              if (window.speechSynthesis.getVoices().length === 0) {
              }
              startVoiceAnnouncement()
            }, 2000)
          } else {
            startVoiceAnnouncement()
          }
        } else {
          startVoiceAnnouncement()
        }
      })
    }

    // Set the processor for the notification queue
    notificationQueue.setProcessor(processNotification)

    // Cleanup function
    return () => {
      if (isPlayingRef.current) {
        window.speechSynthesis.cancel()
        isPlayingRef.current = false
        playCountRef.current = 0
      }
    }
  }, [])

  // Handle new notifications by adding to queue
  useEffect(() => {
    if (!isVisible) return
    
    // Add to queue instead of processing immediately
    notificationQueue.enqueue({
      orderType,
      orderNumber
    })
  }, [isVisible, orderType, orderNumber])

  if (!mounted || !currentNotification) return null

  const orderTypeText = currentNotification.orderType === 'takeout' ? '포장' : '매장'
  const orderColorClass = currentNotification.orderType === 'takeout' 
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
                    {currentNotification.orderNumber}
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
                    {currentNotification.orderNumber}
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