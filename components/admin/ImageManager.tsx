'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImageUploader } from './ImageUploader'
import { Database } from '@/types/database'
import Image from 'next/image'

type StoreImage = Database['public']['Tables']['store_images']['Row']

interface ImageManagerProps {
  storeId: string
}

interface ImageWithPreview extends StoreImage {
  isDeleting?: boolean
}

export function ImageManager({ storeId }: ImageManagerProps) {
  const [images, setImages] = useState<ImageWithPreview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const MAX_IMAGES = 5

  const fetchImages = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('store_images')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (error) throw error
      setImages(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [storeId, supabase])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleUpload = async (file: File) => {
    try {
      // Convert file to base64 for storage (실제 프로덕션에서는 Supabase Storage 사용 권장)
      const reader = new FileReader()
      const dataURL = await new Promise<string>((resolve, reject) => {
        reader.onload = (e) => {
          const result = e.target?.result
          if (typeof result === 'string') {
            resolve(result)
          } else {
            reject(new Error('파일을 읽는데 실패했습니다.'))
          }
        }
        reader.onerror = (e) => {
          reject(new Error('파일 읽기 중 오류가 발생했습니다.'))
        }
        reader.readAsDataURL(file)
      })

      // Validate base64 data
      if (!dataURL || !dataURL.startsWith('data:image/')) {
        throw new Error('올바른 이미지 파일이 아닙니다.')
      }

      // Check if base64 data is too large (limit to ~15MB base64, which is ~11MB actual file)
      const base64Size = dataURL.length
      const maxBase64Size = 15 * 1024 * 1024 // 15MB in base64
      if (base64Size > maxBase64Size) {
        throw new Error('이미지 파일이 너무 큽니다. 더 작은 이미지를 사용해주세요.')
      }

      

      // Get next order index
      const nextOrderIndex = images.length > 0 
        ? Math.max(...images.map(img => img.order_index || 0)) + 1 
        : 0

      // Insert into database
      const { data, error } = await supabase
        .from('store_images')
        .insert({
          store_id: storeId,
          image_url: dataURL,
          order_index: nextOrderIndex,
          is_active: true
        })
        .select()

      if (error) {
        throw new Error(`데이터베이스 오류: ${error.message || '알 수 없는 오류'}`)
      }

      if (!data || data.length === 0) {
        throw new Error('이미지 저장에 실패했습니다.')
      }

      // Refresh images
      await fetchImages()
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '이미지 업로드에 실패했습니다.'
      throw new Error(errorMessage)
    }
  }

  const handleDelete = async (imageId: string) => {
    if (!confirm('이 이미지를 삭제하시겠습니까?')) return

    try {
      // Set deleting state
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, isDeleting: true } : img
      ))

      const { error } = await supabase
        .from('store_images')
        .update({ is_active: false })
        .eq('id', imageId)

      if (error) throw error

      // Remove from local state
      setImages(prev => prev.filter(img => img.id !== imageId))
      
    } catch (error) {
      alert('이미지 삭제에 실패했습니다.')
      // Reset deleting state
      setImages(prev => prev.map(img => 
        img.id === imageId ? { ...img, isDeleting: false } : img
      ))
    }
  }

  const handleReorder = async (imageId: string, newIndex: number) => {
    try {
      const { error } = await supabase
        .from('store_images')
        .update({ order_index: newIndex })
        .eq('id', imageId)

      if (error) throw error

      // Update local state
      setImages(prev => {
        const updated = prev.map(img => 
          img.id === imageId ? { ...img, order_index: newIndex } : img
        )
        return updated.sort((a, b) => a.order_index - b.order_index)
      })
      
    } catch (error) {
      alert('순서 변경에 실패했습니다.')
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="animate-pulse">
          <div className="mb-4 h-6 w-40 bg-gray-300 rounded"></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="aspect-video bg-gray-300 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="text-center text-red-600">
          <p>오류: {error}</p>
          <button
            onClick={fetchImages}
            className="mt-2 rounded bg-red-100 px-3 py-1 text-sm hover:bg-red-200"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">이미지 관리</h2>
            <p className="text-sm text-gray-600">
              디스플레이 화면에 표시될 이미지를 관리하세요 ({images.length}/{MAX_IMAGES}개)
            </p>
          </div>
          {images.length > 0 && (
            <div className="text-sm text-gray-500">
              드래그하여 순서 변경
            </div>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <div className="rounded-lg bg-white p-6 shadow">
        <ImageUploader
          onUpload={handleUpload}
          maxImages={MAX_IMAGES}
          currentImageCount={images.length}
        />
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-md font-medium text-gray-900">업로드된 이미지</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                  image.isDeleting
                    ? 'border-red-200 opacity-50'
                    : 'border-gray-200 hover:border-emerald-300'
                }`}
              >
                {/* Image */}
                <div className="aspect-video bg-gray-100">
                  <Image
                    src={image.image_url}
                    alt={`Store image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/40">
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    {!image.isDeleting && (
                      <div className="flex space-x-2">
                        {/* Move Up */}
                        {index > 0 && (
                          <button
                            onClick={() => handleReorder(image.id, image.order_index - 1)}
                            className="rounded-full bg-white p-2 text-gray-700 shadow-lg hover:bg-gray-50"
                            title="앞으로 이동"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          </button>
                        )}

                        {/* Move Down */}
                        {index < images.length - 1 && (
                          <button
                            onClick={() => handleReorder(image.id, image.order_index + 1)}
                            className="rounded-full bg-white p-2 text-gray-700 shadow-lg hover:bg-gray-50"
                            title="뒤로 이동"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          </button>
                        )}

                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(image.id)}
                          className="rounded-full bg-red-500 p-2 text-white shadow-lg hover:bg-red-600"
                          title="삭제"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Order Badge */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-medium text-white">
                    {index + 1}
                  </span>
                </div>

                {/* Deleting Indicator */}
                {image.isDeleting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-50">
                    <div className="text-center">
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-red-300 border-t-red-500"></div>
                      <p className="mt-2 text-sm text-red-600">삭제 중...</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty Slots */}
          {images.length < MAX_IMAGES && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(MAX_IMAGES - images.length)].map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="aspect-video rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center"
                >
                  <div className="text-center text-gray-400">
                    <svg className="mx-auto h-8 w-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm">빈 슬롯</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && (
        <div className="rounded-lg bg-white p-8 shadow text-center">
          <div className="text-gray-500">
            <svg className="mx-auto h-16 w-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">아직 이미지가 없습니다</h3>
            <p className="text-sm">위의 업로드 영역을 사용하여 첫 번째 이미지를 추가해보세요.</p>
          </div>
        </div>
      )}
    </div>
  )
}