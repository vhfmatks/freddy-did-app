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

  // Separate calls by type with additional logging
  const takeoutCalls = calls.filter(call => call.type === 'takeout')
  const dineInCalls = calls.filter(call => call.type === 'dine_in')
  
  console.log('[OrderNotifications] Filtered - Takeout:', takeoutCalls.length, 'Dine-in:', dineInCalls.length)

  return (
    <div className="h-full flex flex-col">
      {/* 매장 Section - Top 50% */}
      <div className="h-1/2 p-4 flex flex-col">
        <h2 className="mb-3 text-center text-2xl font-semibold text-indigo-600">
          매장
        </h2>
        <div className="flex-1 overflow-hidden space-y-2">
          {dineInCalls.length === 0 ? (
            <div className="text-center text-lg text-gray-400 flex items-center justify-center h-full">
              대기 중인 매장 주문이 없습니다
            </div>
          ) : (
            dineInCalls.map((call, index) => (
              <div
                key={call.id}
                className={`mx-auto max-w-[80%] transform rounded-lg p-4 text-white shadow-lg transition-all duration-500 ${
                  index === 0 ? 'scale-105' : ''
                } bg-gradient-to-r from-indigo-500 to-indigo-600`}
                style={{
                  animation: index === 0 ? 'pulse 2s infinite' : undefined
                }}
              >
                <div className="flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {call.number}
                  </span>
                  <span className="text-xl ml-1">번</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 포장 Section - Bottom 50% */}
      <div className="h-1/2 p-4 flex flex-col border-t border-gray-200">
        <h2 className="mb-3 text-center text-2xl font-semibold text-emerald-600">
          포장
        </h2>
        <div className="flex-1 overflow-hidden space-y-2">
          {takeoutCalls.length === 0 ? (
            <div className="text-center text-lg text-gray-400 flex items-center justify-center h-full">
              대기 중인 포장 주문이 없습니다
            </div>
          ) : (
            takeoutCalls.map((call, index) => (
              <div
                key={call.id}
                className={`mx-auto max-w-[80%] transform rounded-lg p-4 text-white shadow-lg transition-all duration-500 ${
                  index === 0 ? 'scale-105' : ''
                } bg-gradient-to-r from-emerald-500 to-emerald-600`}
                style={{
                  animation: index === 0 ? 'pulse 2s infinite' : undefined
                }}
              >
                <div className="flex items-center justify-center">
                  <span className="text-3xl font-bold">
                    {call.number}
                  </span>
                  <span className="text-xl ml-1">번</span>
                </div>
              </div>
            ))
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