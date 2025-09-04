'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useOrderCallsRealtime } from '@/lib/hooks/useOrderCallsRealtime'
import { Database } from '@/types/database'

type OrderCall = Database['public']['Tables']['order_calls']['Row']

export default function RealtimeDebugPage() {
  const [storeId, setStoreId] = useState<string>('')
  const [events, setEvents] = useState<any[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected')
  const supabase = createClient()

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
    </div>
  )
}