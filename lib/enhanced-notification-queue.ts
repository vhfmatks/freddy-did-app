/**
 * Enhanced Notification Queue System
 * 단일 queue로 관리하며 각 알림을 정확히 2번씩 안내 후 완료
 */

import { createKoreanAnnouncement } from './korean-number'

export interface NotificationItem {
  id: string
  orderType: 'takeout' | 'dine_in'
  orderNumber: number
  timestamp: number
  status: 'pending' | 'first_call' | 'second_call' | 'completed'
  callCount: number
  lastCallTime?: number
}

export interface NotificationCallbacks {
  onShowPopup: (item: NotificationItem) => void
  onHidePopup: () => void
  onComplete: (item: NotificationItem) => void
}

class EnhancedNotificationQueue {
  private queue: NotificationItem[] = []
  private currentItem: NotificationItem | null = null
  private isProcessing = false
  private callbacks: NotificationCallbacks | null = null
  private callTimer: NodeJS.Timeout | null = null
  private hideTimer: NodeJS.Timeout | null = null
  
  // 음성 재생 상태 관리
  private isSpeaking = false
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private speechCancelTimer: NodeJS.Timeout | null = null

  // 설정값
  private readonly CALL_DURATION = 3000 // 각 호출 표시 시간 (3초)
  private readonly CALL_INTERVAL = 4000 // 호출 간격 (4초)
  private readonly HIDE_DELAY = 1000 // 숨김 지연 시간 (1초)
  private readonly SPEECH_CANCEL_DELAY = 200 // 음성 중단 후 대기 시간 (200ms)

  /**
   * 콜백 설정
   */
  setCallbacks(callbacks: NotificationCallbacks): void {
    console.log('[EnhancedNotificationQueue] 콜백 설정됨')
    this.callbacks = callbacks
  }

  /**
   * 새 알림을 큐에 추가
   */
  enqueue(orderType: 'takeout' | 'dine_in', orderNumber: number): void {
    // 중복 확인 (같은 타입, 번호의 미완료 알림이 있는지)
    const existingItem = this.queue.find(
      item => item.orderType === orderType && 
               item.orderNumber === orderNumber && 
               item.status !== 'completed'
    ) || (this.currentItem && 
           this.currentItem.orderType === orderType &&
           this.currentItem.orderNumber === orderNumber &&
           this.currentItem.status !== 'completed' ? this.currentItem : null)

    if (existingItem) {
      console.log('[EnhancedNotificationQueue] 중복 알림 무시:', { orderType, orderNumber })
      return
    }

    const newItem: NotificationItem = {
      id: crypto.randomUUID(),
      orderType,
      orderNumber,
      timestamp: Date.now(),
      status: 'pending',
      callCount: 0
    }

    console.log('[EnhancedNotificationQueue] 새 알림 추가:', newItem)
    this.queue.push(newItem)
    
    // 처리 중이 아니면 즉시 시작
    if (!this.isProcessing) {
      this.processNext()
    }
  }

  /**
   * 다음 알림 처리
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    this.isProcessing = true
    this.currentItem = this.queue.shift()!
    
    console.log('[EnhancedNotificationQueue] 알림 처리 시작:', this.currentItem)
    
    // 첫 번째 호출 실행
    await this.executeCall(1)
    
    // 두 번째 호출 스케줄링
    this.callTimer = setTimeout(async () => {
      if (this.currentItem && this.currentItem.status !== 'completed') {
        await this.executeCall(2)
        
        // 완료 처리
        this.completeCurrentItem()
      }
    }, this.CALL_INTERVAL)
  }

  /**
   * 단일 호출 실행 (팝업 + 음성)
   */
  private async executeCall(callNumber: 1 | 2): Promise<void> {
    if (!this.currentItem || !this.callbacks) return

    console.log(`[EnhancedNotificationQueue] ${callNumber}번째 호출 실행:`, this.currentItem)

    // 상태 업데이트
    this.currentItem.status = callNumber === 1 ? 'first_call' : 'second_call'
    this.currentItem.callCount = callNumber
    this.currentItem.lastCallTime = Date.now()

    // 팝업 표시
    this.callbacks.onShowPopup(this.currentItem)

    // 음성 안내 (안전하게 처리)
    try {
      await this.playVoiceAnnouncement(this.currentItem)
    } catch (error) {
      console.error(`[EnhancedNotificationQueue] ${callNumber}번째 호출 음성 재생 실패:`, error)
    }

    // 팝업 숨김 스케줄링
    this.hideTimer = setTimeout(() => {
      if (this.callbacks) {
        this.callbacks.onHidePopup()
      }
    }, this.CALL_DURATION)
  }

  /**
   * 음성 안내 재생 (안전한 버전)
   */
  private async playVoiceAnnouncement(item: NotificationItem): Promise<void> {
    if (!('speechSynthesis' in window)) {
      console.log('[EnhancedNotificationQueue] 음성 합성 지원되지 않음')
      return
    }

    try {
      // 기존 음성 안전하게 중단
      await this.stopCurrentSpeech()

      const announcementText = createKoreanAnnouncement(item.orderType, item.orderNumber)
      const utterance = new SpeechSynthesisUtterance(announcementText)
      
      utterance.lang = 'ko-KR'
      utterance.volume = 0.8
      utterance.rate = 0.9
      utterance.pitch = 1.0

      // 음성 재생 상태 관리
      this.currentUtterance = utterance
      this.isSpeaking = true

      utterance.onstart = () => {
        console.log(`[EnhancedNotificationQueue] ${item.callCount}번째 음성 재생 시작`)
      }

      // 음성 재생 타임아웃 설정 (10초 후 강제 종료)
      const speechTimeout = setTimeout(() => {
        if (this.isSpeaking && this.currentUtterance === utterance) {
          console.warn('[EnhancedNotificationQueue] 음성 재생 타임아웃, 강제 중단')
          this.stopCurrentSpeech()
        }
      }, 10000)

      utterance.onend = () => {
        console.log(`[EnhancedNotificationQueue] ${item.callCount}번째 음성 재생 완료`)
        clearTimeout(speechTimeout)
        this.isSpeaking = false
        this.currentUtterance = null
      }

      utterance.onerror = (event) => {
        console.error(`[EnhancedNotificationQueue] 음성 재생 오류:`, {
          error: event.error,
          callCount: item.callCount,
          orderType: item.orderType,
          orderNumber: item.orderNumber
        })
        clearTimeout(speechTimeout)
        this.isSpeaking = false
        this.currentUtterance = null
      }

      utterance.onboundary = () => {
        // 음성 재생 중 상태 확인
        if (!this.isSpeaking || this.currentUtterance !== utterance) {
          console.log('[EnhancedNotificationQueue] 음성 재생 중단됨')
          clearTimeout(speechTimeout)
          return
        }
      }

      // 음성 재생 실행
      console.log(`[EnhancedNotificationQueue] ${item.callCount}번째 음성 재생 요청:`, announcementText)
      window.speechSynthesis.speak(utterance)

    } catch (error) {
      console.error('[EnhancedNotificationQueue] 음성 재생 설정 오류:', error)
      this.isSpeaking = false
      this.currentUtterance = null
    }
  }

  /**
   * 현재 음성 안전하게 중단
   */
  private stopCurrentSpeech(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSpeaking && !window.speechSynthesis.speaking) {
        resolve()
        return
      }

      console.log('[EnhancedNotificationQueue] 기존 음성 중단 중...')

      // 기존 utterance 무효화
      if (this.currentUtterance) {
        this.currentUtterance.onend = null
        this.currentUtterance.onerror = null
        this.currentUtterance = null
      }

      // 음성 중단
      window.speechSynthesis.cancel()
      this.isSpeaking = false

      // 중단 후 안전한 대기 시간
      if (this.speechCancelTimer) {
        clearTimeout(this.speechCancelTimer)
      }

      this.speechCancelTimer = setTimeout(() => {
        console.log('[EnhancedNotificationQueue] 음성 중단 완료')
        resolve()
      }, this.SPEECH_CANCEL_DELAY)
    })
  }

  /**
   * 현재 아이템 완료 처리
   */
  private completeCurrentItem(): void {
    if (!this.currentItem || !this.callbacks) return

    console.log('[EnhancedNotificationQueue] 알림 완료:', this.currentItem)

    // 상태 완료로 변경
    this.currentItem.status = 'completed'
    
    // 완료 콜백 호출
    this.callbacks.onComplete(this.currentItem)

    // 정리
    this.currentItem = null
    this.isProcessing = false
    this.clearTimers()

    // 다음 알림 처리
    setTimeout(() => {
      this.processNext()
    }, this.HIDE_DELAY)
  }

  /**
   * 강제 완료 (긴급 상황용)
   */
  markCurrentCompleted(): void {
    if (this.currentItem) {
      console.log('[EnhancedNotificationQueue] 현재 알림 강제 완료')
      this.completeCurrentItem()
    }
  }

  /**
   * 타이머 정리
   */
  private clearTimers(): void {
    if (this.callTimer) {
      clearTimeout(this.callTimer)
      this.callTimer = null
    }
    if (this.hideTimer) {
      clearTimeout(this.hideTimer)
      this.hideTimer = null
    }
    if (this.speechCancelTimer) {
      clearTimeout(this.speechCancelTimer)
      this.speechCancelTimer = null
    }
  }

  /**
   * 현재 상태 조회
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.queue.length,
      currentItem: this.currentItem,
      queue: [...this.queue], // 복사본 반환
      speech: {
        isSpeaking: this.isSpeaking,
        hasCurrentUtterance: this.currentUtterance !== null,
        browserSpeaking: typeof window !== 'undefined' && 'speechSynthesis' in window 
          ? window.speechSynthesis.speaking 
          : false
      }
    }
  }

  /**
   * 큐 전체 초기화
   */
  clear(): void {
    console.log('[EnhancedNotificationQueue] 큐 초기화')
    
    // 음성 안전하게 중단
    this.stopCurrentSpeech().then(() => {
      console.log('[EnhancedNotificationQueue] 음성 중단 완료됨')
    }).catch((error) => {
      console.error('[EnhancedNotificationQueue] 음성 중단 중 오류:', error)
    })

    // 타이머 정리
    this.clearTimers()

    // 팝업 숨김
    if (this.callbacks) {
      this.callbacks.onHidePopup()
    }

    // 상태 초기화
    this.queue = []
    this.currentItem = null
    this.isProcessing = false
    this.isSpeaking = false
    this.currentUtterance = null
  }

  /**
   * 큐에서 특정 알림 제거
   */
  removeFromQueue(orderType: 'takeout' | 'dine_in', orderNumber: number): void {
    const initialLength = this.queue.length
    this.queue = this.queue.filter(
      item => !(item.orderType === orderType && item.orderNumber === orderNumber)
    )
    
    if (this.queue.length < initialLength) {
      console.log('[EnhancedNotificationQueue] 큐에서 알림 제거:', { orderType, orderNumber })
    }

    // 현재 처리 중인 아이템이 해당 알림이면 중단
    if (this.currentItem && 
        this.currentItem.orderType === orderType && 
        this.currentItem.orderNumber === orderNumber) {
      console.log('[EnhancedNotificationQueue] 현재 처리 중인 알림 중단:', { orderType, orderNumber })
      this.completeCurrentItem()
    }
  }
}

// 싱글톤 인스턴스 생성
export const enhancedNotificationQueue = new EnhancedNotificationQueue()
