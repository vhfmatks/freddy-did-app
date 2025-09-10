'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrderCallsRealtime } from '@/lib/hooks/useOrderCallsRealtime'
import { useNotificationController } from '@/lib/hooks/useNotificationController'
import { SimpleCallNotificationPopup } from '@/components/ui/SimpleCallNotificationPopup'
import { Database } from '@/types/database'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

export default function RealtimeDebugPage() {
  const [storeId, setStoreId] = useState<string>('')
  const [events, setEvents] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const [testNotificationEnabled, setTestNotificationEnabled] = useState(false)
  const supabase = createClient()

  // 새로운 알림 시스템 테스트
  const notificationController = useNotificationController({
    storeId: testNotificationEnabled ? storeId : '',
    audioEnabled: true,
    debug: true
  })

  // Use the realtime hook when monitoring
  useOrderCallsRealtime({
    storeId: isMonitoring ? storeId : '',
    onInsert: (call) => {
      const event = {
        type: 'INSERT',
        timestamp: new Date().toISOString(),
        data: call,
        id: crypto.randomUUID()
      }
      setEvents(prev => [event, ...prev].slice(0, 50))
    },
    onUpdate: (call) => {
      const event = {
        type: 'UPDATE',
        timestamp: new Date().toISOString(),
        data: call,
        id: crypto.randomUUID()
      }
      setEvents(prev => [event, ...prev].slice(0, 50))
    },
    onDelete: (call) => {
      const event = {
        type: 'DELETE',
        timestamp: new Date().toISOString(),
        data: call,
        id: crypto.randomUUID()
      }
      setEvents(prev => [event, ...prev].slice(0, 50))
    },
    onConnectionChange: setConnectionStatus,
    debug: true
  })

  const handleStartMonitoring = () => {
    if (storeId) {
      setIsMonitoring(true)
      setEvents([])
    }
  }

  const handleStopMonitoring = () => {
    setIsMonitoring(false)
    setConnectionStatus('disconnected')
    setEvents([])
  }

  const testInsert = async () => {
    if (!storeId) return
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('Please login first')
      return
    }

    const number = Math.floor(Math.random() * 999) + 1
    const type = Math.random() > 0.5 ? 'takeout' : 'dine_in'

    const { error } = await supabase
      .from('order_calls')
      .insert({
        store_id: storeId,
        number,
        type,
        admin_id: user.id,
        called_at: new Date().toISOString()
      })

    if (error) {
      console.error('Insert error:', error)
      alert(`Insert failed: ${error.message}`)
    } else {
      console.log('Insert successful')
    }
  }

  const testSoftDelete = async () => {
    if (!storeId) return

    // Get the most recent call to delete
    const { data: calls, error: fetchError } = await supabase
      .from('order_calls')
      .select('*')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .order('called_at', { ascending: false })
      .limit(1)

    if (fetchError || !calls || calls.length === 0) {
      alert('No calls to delete')
      return
    }

    const callToDelete = calls[0]
    const { error } = await supabase
      .from('order_calls')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', callToDelete.id)

    if (error) {
      console.error('Soft delete error:', error)
      alert(`Delete failed: ${error.message}`)
    } else {
      console.log('Soft delete successful')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Realtime Debug Page</h1>
        
        {/* Configuration */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Configuration</h2>
          <div className="flex space-x-4">
            <input
              type="text"
              placeholder="Store ID (e.g., store-uuid)"
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              className="flex-1 rounded border border-gray-300 px-3 py-2"
              disabled={isMonitoring}
            />
            {!isMonitoring ? (
              <button
                onClick={handleStartMonitoring}
                disabled={!storeId}
                className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600 disabled:bg-gray-300"
              >
                Start Monitoring
              </button>
            ) : (
              <button
                onClick={handleStopMonitoring}
                className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
              >
                Stop Monitoring
              </button>
            )}
          </div>
        </div>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Connection Status</h2>
          <div className="flex items-center space-x-2">
            <div className={`h-3 w-3 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span className="text-gray-700">{connectionStatus}</span>
          </div>
        </div>

        {/* Test Actions */}
        {isMonitoring && (
          <div className="mb-6 rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-xl font-semibold">Test Actions</h2>
            <div className="flex space-x-4">
              <button
                onClick={testInsert}
                className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
              >
                Test Insert
              </button>
              <button
                onClick={testSoftDelete}
                className="rounded bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
              >
                Test Soft Delete
              </button>
            </div>
          </div>
        )}

        {/* Enhanced Notification System Test */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">새로운 알림 시스템 테스트</h2>
          
          {/* Enable/Disable Toggle */}
          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={testNotificationEnabled}
                onChange={(e) => setTestNotificationEnabled(e.target.checked)}
                disabled={!storeId}
                className="rounded"
              />
              <span className="text-sm">알림 시스템 활성화 ({storeId || 'Store ID 필요'})</span>
            </label>
          </div>

          {/* Queue Status */}
          {testNotificationEnabled && (
            <div className="mb-4 space-y-4">
              <div className="rounded bg-blue-50 p-3 border-l-4 border-blue-400">
                <h3 className="text-sm font-semibold text-blue-700 mb-2">⏱️ 알림 타이밍 정보</h3>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>• 전체 알림 시간: <strong>8초</strong> (첫 번째 호출 → 4초 대기 → 두 번째 호출)</p>
                  <p>• 팝업 표시: 첫 번째 호출부터 <strong>전체 8초 동안 연속 표시</strong></p>
                  <p>• 음성 안내: 각 호출당 약 3-4초씩 <strong>총 2번</strong> 재생</p>
                  <p>• 개선사항: 팝업이 두 번의 음성 안내 동안 계속 표시됨</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
              <div className="rounded bg-gray-50 p-3">
                <h3 className="text-sm font-semibold text-gray-700">Queue 상태</h3>
                <p className="text-xs text-gray-600">
                  처리중: {notificationController.queueStatus.isProcessing ? '예' : '아니오'}
                </p>
                <p className="text-xs text-gray-600">
                  대기 수: {notificationController.queueStatus.queueSize}
                </p>
                <p className="text-xs text-gray-600">
                  연결 상태: {notificationController.isConnected ? '연결됨' : '연결 안됨'}
                </p>
              </div>
              
              <div className="rounded bg-gray-50 p-3">
                <h3 className="text-sm font-semibold text-gray-700">현재 알림</h3>
                {notificationController.currentNotification ? (
                  <>
                    <p className="text-xs text-gray-600">
                      타입: {notificationController.currentNotification.orderType === 'takeout' ? '포장' : '매장'}
                    </p>
                    <p className="text-xs text-gray-600">
                      번호: {notificationController.currentNotification.orderNumber}번
                    </p>
                    <p className="text-xs text-gray-600">
                      상태: {notificationController.currentNotification.status}
                    </p>
                    <p className="text-xs text-gray-600">
                      호출 횟수: {notificationController.currentNotification.callCount}/2
                    </p>
                    <p className="text-xs text-gray-600">
                      팝업 표시: {notificationController.isVisible ? '예' : '아니오'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">없음</p>
                )}
              </div>

              <div className="rounded bg-gray-50 p-3">
                <h3 className="text-sm font-semibold text-gray-700">음성 상태</h3>
                {(notificationController.queueStatus as any).speech ? (
                  <>
                    <p className="text-xs text-gray-600">
                      재생중: {(notificationController.queueStatus as any).speech.isSpeaking ? '예' : '아니오'}
                    </p>
                    <p className="text-xs text-gray-600">
                      Utterance: {(notificationController.queueStatus as any).speech.hasCurrentUtterance ? '활성' : '없음'}
                    </p>
                    <p className="text-xs text-gray-600">
                      브라우저: {(notificationController.queueStatus as any).speech.browserSpeaking ? '재생중' : '정지'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-600">정보 없음</p>
                )}
              </div>
            </div>
            </div>
          )}

          {/* Test Controls */}
          {testNotificationEnabled && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => notificationController.addTestNotification('takeout', Math.floor(Math.random() * 99) + 1)}
                  className="rounded bg-emerald-500 px-3 py-1 text-sm text-white hover:bg-emerald-600"
                >
                  포장 테스트 알림
                </button>
                <button
                  onClick={() => notificationController.addTestNotification('dine_in', Math.floor(Math.random() * 99) + 1)}
                  className="rounded bg-indigo-500 px-3 py-1 text-sm text-white hover:bg-indigo-600"
                >
                  매장 테스트 알림
                </button>
                <button
                  onClick={() => {
                    // 연속으로 여러 알림을 빠르게 추가해서 충돌 테스트
                    for (let i = 0; i < 3; i++) {
                      setTimeout(() => {
                        notificationController.addTestNotification(
                          Math.random() > 0.5 ? 'takeout' : 'dine_in', 
                          Math.floor(Math.random() * 99) + 1
                        )
                      }, i * 100)
                    }
                  }}
                  className="rounded bg-purple-500 px-3 py-1 text-sm text-white hover:bg-purple-600"
                >
                  🚀 충돌 테스트 (3개 연속)
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={notificationController.forceComplete}
                  className="rounded bg-yellow-500 px-3 py-1 text-sm text-white hover:bg-yellow-600"
                >
                  현재 알림 강제 완료
                </button>
                <button
                  onClick={() => {
                    // 음성 중단 테스트
                    if ('speechSynthesis' in window) {
                      window.speechSynthesis.cancel()
                      console.log('[Debug] 음성 강제 중단 실행됨')
                    }
                  }}
                  className="rounded bg-orange-500 px-3 py-1 text-sm text-white hover:bg-orange-600"
                >
                  🔇 음성 강제 중단
                </button>
                <button
                  onClick={() => {
                    // TTS 음성 목록 확인
                    if ('speechSynthesis' in window) {
                      const voices = window.speechSynthesis.getVoices()
                      console.log('[Debug] 사용 가능한 TTS 음성:', voices.map(v => ({
                        name: v.name,
                        lang: v.lang,
                        default: v.default,
                        localService: v.localService
                      })))
                      
                      // 한국어 음성만 필터링
                      const koreanVoices = voices.filter(v => 
                        v.lang.includes('ko') || v.lang.includes('kr') || 
                        v.name.includes('한국') || v.name.includes('Korean')
                      )
                      console.log('[Debug] 한국어 TTS 음성:', koreanVoices)
                      
                      alert(`TTS 음성 ${voices.length}개 발견 (한국어: ${koreanVoices.length}개). 콘솔 확인하세요.`)
                    }
                  }}
                  className="rounded bg-blue-500 px-3 py-1 text-sm text-white hover:bg-blue-600"
                >
                  🎤 음성 목록 확인
                </button>
                <button
                  onClick={notificationController.clearQueue}
                  className="rounded bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
                >
                  큐 전체 초기화
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Events Log */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold">Realtime Events Log</h2>
          <div className="max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-gray-500">No events yet. Start monitoring to see realtime events.</p>
            ) : (
              <div className="space-y-2">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded border p-3 ${
                      event.type === 'INSERT' ? 'border-green-300 bg-green-50' :
                      event.type === 'UPDATE' ? 'border-blue-300 bg-blue-50' :
                      'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{event.type}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="mt-2 text-xs">
                      {JSON.stringify(event.data, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 rounded-lg bg-yellow-50 p-6">
          <h3 className="mb-2 font-semibold text-yellow-900">Instructions:</h3>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-yellow-800">
            <li>Enter your Store ID and click &quot;Start Monitoring&quot;</li>
            <li>Open the admin page in another tab/window</li>
            <li>Perform actions (호출, 삭제) and watch events appear here</li>
            <li>Use Test Actions to simulate events directly</li>
            <li>Check browser console for detailed debug logs</li>
          </ol>
        </div>
      </div>

      {/* 알림 팝업 표시 */}
      {testNotificationEnabled && (
        <SimpleCallNotificationPopup
          notification={notificationController.currentNotification}
          isVisible={notificationController.isVisible}
        />
      )}
    </div>
  )
}