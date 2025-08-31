'use client'

import { useState, useRef } from 'react'
import { resizeImage, fileToDataURL, validateImageFile, formatFileSize } from '@/lib/image-utils'

interface ImageUploaderProps {
  onUpload: (file: File) => Promise<void>
  maxImages: number
  currentImageCount: number
  disabled?: boolean
}

export function ImageUploader({ onUpload, maxImages, currentImageCount, disabled = false }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canUpload = currentImageCount < maxImages && !disabled && !isUploading

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !canUpload) return

    const file = files[0] // Only handle first file
    
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      alert(validation.error)
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(`파일 검증 중... (${formatFileSize(file.size)})`)

      // Resize image
      setUploadProgress('이미지 최적화 중...')
      const resizedFile = await resizeImage(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.85,
        format: 'jpeg'
      })

      setUploadProgress(`업로드 중... (${formatFileSize(resizedFile.size)})`)
      
      // Upload file
      await onUpload(resizedFile)
      
      setUploadProgress('업로드 완료!')
      setTimeout(() => setUploadProgress(''), 2000)
      
    } catch (error) {
      alert(error instanceof Error ? error.message : '이미지 업로드 중 오류가 발생했습니다.')
      setUploadProgress('')
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (!canUpload) return

    const files = e.dataTransfer.files
    handleFiles(files)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const openFileDialog = () => {
    if (canUpload && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  if (currentImageCount >= maxImages) {
    return (
      <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-8 text-center">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-medium">최대 {maxImages}개 이미지</p>
          <p className="text-xs">더 이상 이미지를 업로드할 수 없습니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? 'border-emerald-500 bg-emerald-50'
            : canUpload
            ? 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50'
            : 'border-gray-200 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={!canUpload}
        />

        {isUploading ? (
          <div className="space-y-3">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-emerald-500"></div>
            <p className="text-sm font-medium text-gray-900">{uploadProgress}</p>
          </div>
        ) : (
          <div className={`space-y-3 ${canUpload ? 'cursor-pointer' : 'cursor-not-allowed'}`} onClick={openFileDialog}>
            <div className={`mx-auto h-12 w-12 ${canUpload ? 'text-emerald-500' : 'text-gray-400'}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="space-y-1">
              <p className={`text-sm font-medium ${canUpload ? 'text-gray-900' : 'text-gray-500'}`}>
                {canUpload ? '이미지를 드래그하거나 클릭하여 업로드' : '업로드 불가'}
              </p>
              <p className="text-xs text-gray-500">
                JPEG, PNG, WebP (최대 10MB) • {currentImageCount}/{maxImages}개 사용 중
              </p>
              {canUpload && (
                <p className="text-xs text-emerald-600">
                  자동으로 크기가 최적화됩니다
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-lg bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">이미지 업로드 안내</h3>
            <div className="mt-1 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>고화질 이미지를 업로드하면 자동으로 최적화됩니다</li>
                <li>디스플레이 화면에서 슬라이드쇼로 표시됩니다</li>
                <li>드래그 앤 드롭으로 순서를 변경할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}