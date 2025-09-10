'use client'

import { useEffect } from 'react'
import { Database } from '@/types/database'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

interface OrderNotificationsProps {
  calls: OrderCall[]
}

export function OrderNotifications({ calls }: OrderNotificationsProps) {
  // Debug logging
  useEffect(() => {
    console.log('[OrderNotifications] Props changed - Received calls:', calls.length, 'total')
    console.log('[OrderNotifications] Current calls list:')
    calls.forEach((call, index) => {
      console.log(`  ${index + 1}. ${call.type} #${call.number} (ID: ${call.id.slice(-8)}) - ${new Date(call.called_at).toLocaleTimeString()}`)
    })
  }, [calls])

  // 통합 리스트 - 시간순 정렬 (최신순)
  const allCalls = [...calls].sort((a, b) => new Date(b.called_at).getTime() - new Date(a.called_at).getTime())
  
  console.log('[OrderNotifications] Unified calls:', allCalls.length, 'total')

  // 색깔 및 타입별 표시 텍스트 정의
  const getOrderDisplayInfo = (call: OrderCall) => {
    if (call.type === 'dine_in') {
      return {
        bgColor: 'bg-gradient-to-r from-indigo-500 to-indigo-600',
        typeText: '매장',
        typeColor: 'text-indigo-100'
      }
    } else {
      return {
        bgColor: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        typeText: '포장',
        typeColor: 'text-emerald-100'
      }
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* 통합 주문 리스트 */}
      <div className="h-full p-4 flex flex-col">
        <h2 className="mb-3 h-10 text-center text-2xl font-semibold text-gray-700">
        
        </h2>
        <div className="flex-1 overflow-y-auto space-y-3">
          {allCalls.length === 0 ? (
            <div className="text-center text-lg text-gray-400 flex items-center justify-center h-full">
              
            </div>
          ) : (
            allCalls.map((call, index) => {
              const displayInfo = getOrderDisplayInfo(call)
              return (
                <div
                  key={call.id}
                  className={`mx-auto max-w-[85%] transform rounded-lg p-4 text-white shadow-lg transition-all duration-500 ${
                    index === 0 ? 'scale-105' : ''
                  } ${displayInfo.bgColor}`}
                  style={{
                    animation: index === 0 ? 'pulse 2s infinite' : undefined
                  }}
                >
                  <div className="flex flex-col items-center justify-center">
                    <div className="flex items-center">
                      <span className={`text-lg font-medium ${displayInfo.typeColor} opacity-85 mr-2`}>
                        {displayInfo.typeText}
                      </span>
                      <span className="text-4xl font-bold">
                        {call.number}
                      </span>
                      {/* <span className="text-2xl ml-1">번</span> */}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1.05);
          }
          50% {
            transform: scale(1.08);
          }
        }
      `}</style>
    </div>
  )
}