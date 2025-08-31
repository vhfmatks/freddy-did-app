'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface TenKeyPadProps {
  storeId: string
}

export function TenKeyPad({ storeId }: TenKeyPadProps) {
  const [number, setNumber] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleNumberClick = (num: string) => {
    if (number.length < 3) {
      setNumber(number + num)
    }
  }

  const handleClear = () => {
    setNumber('')
  }

  const handleSubmit = async (orderType: 'takeout' | 'dine_in') => {
    const orderNumber = parseInt(number)
    if (orderNumber < 1 || orderNumber > 999) {
      alert('1부터 999까지의 번호를 입력하세요.')
      return
    }

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('로그인이 필요합니다.')
        return
      }

      

      const { data, error } = await supabase
        .from('order_calls')
        .insert({
          store_id: storeId,
          number: orderNumber,
          type: orderType,
          admin_id: user.id
        })
        .select()

      if (error) {
        alert(`번호 호출 중 오류가 발생했습니다: ${error.message}`)
      } else {
        setNumber('')
        // Show success feedback
        const successMsg = `${orderType === 'takeout' ? '포장' : '매장'} ${orderNumber}번 호출됨`
        // Optional: You can add a toast notification here
      }
    } catch (error) {
      alert('번호 호출 중 예상치 못한 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg bg-white p-4 shadow">
      {/* Display */}
      <div className="mb-4 rounded bg-gray-100 p-4 text-center">
        <div className="text-3xl font-bold text-gray-900">
          {number || '0'}
        </div>
        <div className="mt-1 text-sm text-gray-600">
          주문 번호
        </div>
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            className="rounded bg-gray-200 p-4 text-xl font-semibold text-gray-900 hover:bg-gray-300"
            disabled={isSubmitting}
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleClear}
          className="rounded bg-yellow-500 p-4 text-white hover:bg-yellow-600"
          disabled={isSubmitting}
        >
          C
        </button>
        <button
          onClick={() => handleNumberClick('0')}
          className="rounded bg-gray-200 p-4 text-xl font-semibold hover:bg-gray-300"
          disabled={isSubmitting}
        >
          0
        </button>
        <div className="rounded bg-gray-200 p-4"></div>
      </div>

      {/* Order Type Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleSubmit('takeout')}
          className="rounded bg-emerald-500 p-4 text-lg font-medium text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
          disabled={isSubmitting || !number}
        >
          포장 호출
        </button>
        <button
          onClick={() => handleSubmit('dine_in')}
          className="rounded bg-indigo-500 p-4 text-lg font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          disabled={isSubmitting || !number}
        >
          매장 호출
        </button>
      </div>
    </div>
  )
}