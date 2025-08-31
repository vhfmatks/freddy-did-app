/**
 * Image utility functions for upload, resize, and optimization
 */

export interface ResizeOptions {
  maxWidth: number
  maxHeight: number
  quality: number // 0-1
  format: 'jpeg' | 'png' | 'webp'
}

export const DEFAULT_RESIZE_OPTIONS: ResizeOptions = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 0.8,
  format: 'jpeg'
}

/**
 * Resize and compress image file
 */
export function resizeImage(
  file: File, 
  options: Partial<ResizeOptions> = {}
): Promise<File> {
  return new Promise((resolve, reject) => {
    const opts = { ...DEFAULT_RESIZE_OPTIONS, ...options }
    
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      reject(new Error('선택한 파일은 이미지가 아닙니다.'))
      return
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('파일 크기는 10MB를 초과할 수 없습니다.'))
      return
    }

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      try {
        // Calculate new dimensions
        let { width, height } = img
        const aspectRatio = width / height

        if (width > opts.maxWidth) {
          width = opts.maxWidth
          height = width / aspectRatio
        }

        if (height > opts.maxHeight) {
          height = opts.maxHeight
          width = height * aspectRatio
        }

        // Set canvas dimensions
        canvas.width = width
        canvas.height = height

        if (!ctx) {
          reject(new Error('Canvas context를 생성할 수 없습니다.'))
          return
        }

        // Enable image smoothing for better quality
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('이미지 압축에 실패했습니다.'))
              return
            }

            // Create new file with resized blob
            const resizedFile = new File(
              [blob],
              `resized_${file.name}`,
              {
                type: `image/${opts.format}`,
                lastModified: Date.now()
              }
            )

            resolve(resizedFile)
          },
          `image/${opts.format}`,
          opts.quality
        )
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('이미지를 로드할 수 없습니다.'))
    }

    // Load image
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string
      }
    }
    reader.onerror = () => {
      reject(new Error('파일을 읽을 수 없습니다.'))
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Convert file to base64 for preview
 */
export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('파일을 읽을 수 없습니다.'))
      }
    }
    reader.onerror = () => reject(new Error('파일 읽기 오류'))
    reader.readAsDataURL(file)
  })
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: '이미지 파일만 업로드 가능합니다.' }
  }

  // Check file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return { isValid: false, error: '파일 크기는 10MB를 초과할 수 없습니다.' }
  }

  // Check supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: 'JPEG, PNG, WebP 형식만 지원됩니다.' }
  }

  return { isValid: true }
}