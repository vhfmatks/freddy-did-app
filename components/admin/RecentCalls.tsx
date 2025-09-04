'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { useOrderCallsRealtime } from '@/lib/hooks/useOrderCallsRealtime'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface RecentCallsProps {
  storeId: string
}

export function RecentCalls({ storeId }: RecentCallsProps) {
  const [calls, setCalls] = useState<OrderCall[]>([])
  const [displayMinutes, setDisplayMinutes] = useState(5)
  const [showRecallModal, setShowRecallModal] = useState(false)
  const [selectedCall, setSelectedCall] = useState<OrderCall | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch recent calls function
  const fetchCalls = useCallback(async () => {
    console.log('fetchCalls 시작')
    const cutoffTime = new Date()
    cutoffTime.setMinutes(cutoffTime.getMinutes() - displayMinutes)

    const { data, error } = await supabase
      .from('order_calls')
      .select('*')
      .eq('store_id', storeId)
      .or('deleted_at.is.null,deleted_at.lt.' + cutoffTime.toISOString()) // deleted_at이 null이거나 cutoffTime보다 이전인 경우
      .gte('called_at', cutoffTime.toISOString())
      .order('called_at', { ascending: false })
      .limit(20)

    console.log('fetchCalls 결과:', { data, error, count: data?.length })

    if (!error && data) {
      setCalls(data)
      console.log('calls state 업데이트됨:', data.length, '개 항목')
    } else if (error) {
      console.error('fetchCalls 오류:', error)
    }
  }, [storeId, displayMinutes, supabase])

  // Setup realtime subscription
  useOrderCallsRealtime({
    storeId,
    onInsert: (newCall) => {
      console.log('[Admin] New call inserted:', newCall)
      setCalls(prev => {
        // Check if call is within display time range
        const cutoffTime = new Date()
        cutoffTime.setMinutes(cutoffTime.getMinutes() - displayMinutes)
        if (new Date(newCall.called_at) >= cutoffTime) {
          return [newCall, ...prev.filter(c => c.id !== newCall.id)].slice(0, 20)
        }
        return prev
      })
    },
    onUpdate: (updatedCall) => {
      console.log('[Admin] Call updated:', updatedCall)
      if (updatedCall.deleted_at) {
        console.log('[Admin] Call marked as deleted, removing:', updatedCall.id)
        setCalls(prev => prev.filter(call => call.id !== updatedCall.id))
      } else {
        setCalls(prev => prev.map(call =>
          call.id === updatedCall.id ? updatedCall : call
        ))
      }
    },
    onDelete: (deletedCall) => {
      console.log('[Admin] Call deleted:', deletedCall)
      setCalls(prev => prev.filter(call => call.id !== deletedCall.id))
    },
    debug: true
  })

  useEffect(() => {
    fetchCalls()

    // Refresh every minute to remove old calls
    const interval = setInterval(fetchCalls, 60000)

    return () => {
      clearInterval(interval)
    }
  }, [storeId, displayMinutes, fetchCalls])

  const handleRecallClick = (call: OrderCall) => {
    setSelectedCall(call)
    setShowRecallModal(true)
  }

  const handleRecallConfirm = async () => {
    if (!selectedCall) return
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return

    try {
      await supabase
        .from('order_calls')
        .insert({
          store_id: storeId,
          number: selectedCall.number,
          type: selectedCall.type,
          admin_id: user.id,
          called_at: new Date().toISOString() // Set current time to appear at top
        })
      
    } catch (error) {
      
      alert('재호출 중 오류가 발생했습니다.')
    } finally {
      setShowRecallModal(false)
      setSelectedCall(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (deletingId) return // 이미 삭제 중인 경우 중복 클릭 방지

    setDeletingId(id)
    try {
      // Soft delete by updating deleted_at field
      const { error } = await supabase
        .from('order_calls')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        console.error('삭제 오류:', error)
        // Only show alert for actual errors
        alert('삭제 중 오류가 발생했습니다.')
        return
      }

      // The realtime subscription will handle removing the item from the UI
      // No need to call fetchCalls or show success alert
    } catch (error) {
      console.error('삭제 예외:', error)
      alert('삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">최근 호출</h2>
        <select
          value={displayMinutes}
          onChange={(e) => setDisplayMinutes(Number(e.target.value))}
          className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 bg-white"
        >
          <option value={5}>5분</option>
          <option value={10}>10분</option>
          <option value={30}>30분</option>
          <option value={60}>60분</option>
        </select>
      </div>

      <div className="space-y-2">
        {calls.length === 0 ? (
          <p className="text-center text-gray-500">최근 호출이 없습니다</p>
        ) : (
          calls.map((call) => (
            <div
              key={call.id}
              className={`flex items-center justify-between rounded-lg p-4 ${
                call.type === 'takeout' ? 'bg-emerald-50' : 'bg-indigo-50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <span
                  className={`rounded px-2 py-1 text-sm font-medium text-white ${
                    call.type === 'takeout' ? 'bg-emerald-500' : 'bg-indigo-500'
                  }`}
                >
                  {call.type === 'takeout' ? '포장' : '매장'}
                </span>
                <span className="text-xl font-bold">{call.number}번</span>
                <span className="text-sm text-gray-600">
                  {formatTime(call.called_at)}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleRecallClick(call)}
                  className="rounded bg-gray-200 px-3 py-1 text-sm text-gray-900 hover:bg-gray-300"
                >
                  재호출
                </button>
                <button
                  onClick={() => handleDelete(call.id)}
                  disabled={deletingId === call.id}
                  className={`rounded px-3 py-1 text-sm font-medium ${
                    deletingId === call.id
                      ? 'bg-red-100 text-red-600 cursor-not-allowed'
                      : 'bg-red-200 text-red-900 hover:bg-red-300'
                  }`}
                >
                  {deletingId === call.id ? (
                    <div className="flex items-center space-x-1">
                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>삭제 중...</span>
                    </div>
                  ) : (
                    '삭제'
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recall Confirmation Modal */}
      {showRecallModal && selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 transform rounded-lg bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">재호출 확인</h3>
            
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center space-x-3">
                <span className={`rounded px-2 py-1 text-sm font-medium text-white ${
                  selectedCall.type === 'takeout' ? 'bg-emerald-500' : 'bg-indigo-500'
                }`}>
                  {selectedCall.type === 'takeout' ? '포장' : '매장'}
                </span>
                <span className="text-xl font-bold">{selectedCall.number}번</span>
              </div>
            </div>
            
            <p className="mb-6 text-sm text-gray-600">
              이 주문을 다시 호출하시겠습니까?
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRecallModal(false)
                  setSelectedCall(null)
                }}
                className="flex-1 rounded bg-gray-200 py-2 text-sm font-medium text-gray-900 hover:bg-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleRecallConfirm}
                className="flex-1 rounded bg-emerald-500 py-2 text-sm font-medium text-white hover:bg-emerald-600"
              >
                재호출
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}