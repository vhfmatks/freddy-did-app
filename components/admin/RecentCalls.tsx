'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface RecentCallsProps {
  storeId: string
}

export function RecentCalls({ storeId }: RecentCallsProps) {
  const [calls, setCalls] = useState<OrderCall[]>([])
  const [displayMinutes, setDisplayMinutes] = useState(5)
  const [showRecallModal, setShowRecallModal] = useState(false)
  const [selectedCall, setSelectedCall] = useState<OrderCall | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Fetch recent calls
    const fetchCalls = async () => {
      const cutoffTime = new Date()
      cutoffTime.setMinutes(cutoffTime.getMinutes() - displayMinutes)

      const { data, error } = await supabase
        .from('order_calls')
        .select('*')
        .eq('store_id', storeId)
        .is('deleted_at', null)
        .gte('called_at', cutoffTime.toISOString())
        .order('called_at', { ascending: false })
        .limit(20)

      if (!error && data) setCalls(data)
    }

    fetchCalls()

    // Subscribe to realtime updates with better handling
    const channel = supabase
      .channel(`admin-calls-${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_calls',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const newCall = payload.new as OrderCall
          setCalls(prev => [newCall, ...prev].slice(0, 20))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'order_calls',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const deletedCall = payload.old as OrderCall
          setCalls(prev => prev.filter(call => call.id !== deletedCall.id))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'order_calls',
          filter: `store_id=eq.${storeId}`
        },
        (payload) => {
          const updatedCall = payload.new as OrderCall
          // Update the call in the list
          setCalls(prev => prev.map(call => 
            call.id === updatedCall.id ? updatedCall : call
          ))
        }
      )
      .subscribe()

    // Refresh every minute to remove old calls
    const interval = setInterval(fetchCalls, 60000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [storeId, displayMinutes, supabase])

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
    try {
      const { error } = await supabase
        .from('order_calls')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)
      
      if (error) {
        alert('삭제 중 오류가 발생했습니다.')
      } else {
        
      }
    } catch (error) {
      
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
                  className="rounded bg-red-200 px-3 py-1 text-sm text-red-900 hover:bg-red-300"
                >
                  삭제
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