'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Database } from '@/types/database'

type StoreImage = Database['public']['Tables']['store_images']['Row']

interface ImageCarouselProps {
  storeId: string
}

export function ImageCarousel({ storeId }: ImageCarouselProps) {
  const [images, setImages] = useState<StoreImage[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    // Fetch store images
    const fetchImages = async () => {
      const { data } = await supabase
        .from('store_images')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .order('order_index', { ascending: true })

      if (data && data.length > 0) {
        setImages(data)
      }
    }

    fetchImages()
  }, [storeId, supabase])

  useEffect(() => {
    if (images.length <= 1) return

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [images.length])

  if (images.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-900">
        <div className="text-center">
          <p className="text-2xl text-white">이미지를 준비 중입니다</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {images.map((image, index) => (
        <div
          key={image.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={image.image_url}
            alt={`Slide ${index + 1}`}
            fill
            className="object-cover"
            priority={index === 0}
          />
        </div>
      ))}
      
      {/* Dots indicator */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 space-x-2">
          {images.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}