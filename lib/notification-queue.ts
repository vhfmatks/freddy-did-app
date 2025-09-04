/**
 * Notification Queue System
 * Manages sequential processing of order notifications to prevent overlapping
 */

export interface QueuedNotification {
  id: string
  orderType: 'takeout' | 'dine_in'
  orderNumber: number
  timestamp: number
}

class NotificationQueue {
  private queue: QueuedNotification[] = []
  private isProcessing = false
  private currentNotification: QueuedNotification | null = null
  private onProcessCallback: ((notification: QueuedNotification) => Promise<void>) | null = null

  /**
   * Add a notification to the queue
   */
  enqueue(notification: Omit<QueuedNotification, 'id' | 'timestamp'>): void {
    const queuedNotification: QueuedNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    }

    console.log('[NotificationQueue] Enqueuing notification:', queuedNotification)
    this.queue.push(queuedNotification)
    console.log('[NotificationQueue] Queue size:', this.queue.length, 'isProcessing:', this.isProcessing)

    // Start processing if not already processing
    if (!this.isProcessing) {
      console.log('[NotificationQueue] Starting processing')
      this.processNext()
    }
  }

  /**
   * Set the callback function that will process each notification
   */
  setProcessor(callback: (notification: QueuedNotification) => Promise<void>): void {
    console.log('[NotificationQueue] Setting processor callback')
    this.onProcessCallback = callback
  }

  /**
   * Process the next notification in the queue
   */
  private async processNext(): Promise<void> {
    console.log('[NotificationQueue] processNext called - isProcessing:', this.isProcessing, 'queue length:', this.queue.length)
    
    if (this.isProcessing || this.queue.length === 0) {
      console.log('[NotificationQueue] Skipping processing - already processing or empty queue')
      return
    }

    this.isProcessing = true
    this.currentNotification = this.queue.shift()!
    console.log('[NotificationQueue] Processing notification:', this.currentNotification)

    if (this.onProcessCallback) {
      console.log('[NotificationQueue] Calling processor callback')
      try {
        await this.onProcessCallback(this.currentNotification)
        console.log('[NotificationQueue] Processor callback completed successfully')
      } catch (error) {
        console.error('[NotificationQueue] Processor callback error:', error)
      }
    } else {
      console.warn('[NotificationQueue] No processor callback set!')
    }

    // Mark as completed
    this.currentNotification = null
    this.isProcessing = false
    console.log('[NotificationQueue] Notification processing completed')

    // Process next notification if available
    if (this.queue.length > 0) {
      console.log('[NotificationQueue] Processing next notification in 500ms')
      // Small delay to prevent overwhelming
      setTimeout(() => this.processNext(), 500)
    }
  }

  /**
   * Mark current notification as completed and process next
   */
  markCompleted(): void {
    if (this.isProcessing) {
      this.currentNotification = null
      this.isProcessing = false
      
      // Process next notification if available
      if (this.queue.length > 0) {
        setTimeout(() => this.processNext(), 500)
      }
    }
  }

  /**
   * Get current queue status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.queue.length,
      currentNotification: this.currentNotification
    }
  }

  /**
   * Clear the queue (emergency stop)
   */
  clear(): void {
    this.queue = []
    this.isProcessing = false
    this.currentNotification = null
  }
}

// Create singleton instance
export const notificationQueue = new NotificationQueue()