/**
 * Speech Synthesis Initialization Utility
 * Handles Chrome's autoplay policy and audio context initialization
 */

import { useState, useEffect, useCallback } from 'react'

class SpeechInitManager {
  private isInitialized = false
  private initPromise: Promise<boolean> | null = null
  private listeners: (() => void)[] = []

  /**
   * Initialize speech synthesis with user interaction
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true
    }

    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve) => {
      const attemptInit = () => {
        try {
          if ('speechSynthesis' in window) {
            // Cancel any existing speech
            window.speechSynthesis.cancel()
            
            // Pre-load voices
            const voices = window.speechSynthesis.getVoices()
            
            // Create a silent utterance to "unlock" the speech synthesis
            const testUtterance = new SpeechSynthesisUtterance('')
            testUtterance.volume = 0
            testUtterance.rate = 1
            testUtterance.pitch = 1
            
            // Set up completion handler
            let completed = false
            const complete = () => {
              if (!completed) {
                completed = true
                this.isInitialized = true
                this.notifyListeners()
                resolve(true)
              }
            }

            // Set event handlers
            testUtterance.onend = complete
            testUtterance.onerror = complete
            
            // Speak the silent utterance
            window.speechSynthesis.speak(testUtterance)
            
            // Fallback timeout
            setTimeout(complete, 1000)
          } else {
            resolve(false)
          }
        } catch (error) {
          console.warn('Speech synthesis initialization failed:', error)
          resolve(false)
        }
      }

      // If voices are already loaded, initialize immediately
      const voices = window.speechSynthesis?.getVoices() || []
      if (voices.length > 0) {
        attemptInit()
      } else {
        // Wait for voices to load
        const handleVoicesChanged = () => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged)
          attemptInit()
        }
        
        window.speechSynthesis?.addEventListener('voiceschanged', handleVoicesChanged)
        
        // Fallback timeout
        setTimeout(() => {
          window.speechSynthesis?.removeEventListener('voiceschanged', handleVoicesChanged)
          attemptInit()
        }, 2000)
      }
    })

    return this.initPromise
  }

  /**
   * Check if speech synthesis is initialized
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Add listener for initialization completion
   */
  onReady(callback: () => void): () => void {
    if (this.isInitialized) {
      callback()
      return () => {}
    }

    this.listeners.push(callback)
    return () => {
      const index = this.listeners.indexOf(callback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback()
      } catch (error) {
        console.error('Speech init listener error:', error)
      }
    })
    this.listeners = []
  }

  /**
   * Reset initialization state (for testing)
   */
  reset() {
    this.isInitialized = false
    this.initPromise = null
    this.listeners = []
  }
}

// Singleton instance
export const speechInitManager = new SpeechInitManager()

/**
 * Hook for React components to handle speech initialization
 */
export function useSpeechInit() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (speechInitManager.isReady()) {
      setIsReady(true)
      return
    }

    const unsubscribe = speechInitManager.onReady(() => {
      setIsReady(true)
    })

    return unsubscribe
  }, [])

  const initializeSpeech = useCallback(async () => {
    const success = await speechInitManager.initialize()
    if (success) {
      setIsReady(true)
    }
    return success
  }, [])

  return {
    isReady,
    initializeSpeech
  }
}