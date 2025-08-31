'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function RealtimeDebugPage() {
  const [messages, setMessages] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const supabase = createClient()

  const addMessage = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setMessages(prev => [`[${timestamp}] ${msg}`, ...prev].slice(0, 50))
  }

  useEffect(() => {
    addMessage('Initializing Realtime connection...')

    const channel = supabase
      .channel('debug-test')
      .on('broadcast', { event: 'test' }, (payload) => {
        addMessage(`Broadcast received: ${JSON.stringify(payload)}`)
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_calls'
        },
        (payload) => {
          addMessage(`DB Change: ${payload.eventType} - ${JSON.stringify(payload.new || payload.old)}`)
        }
      )
      .subscribe((status) => {
        addMessage(`Subscription status: ${status}`)
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      addMessage('Cleaning up connection...')
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const sendTestBroadcast = async () => {
    try {
      const response = await supabase
        .channel('debug-test')
        .send({
          type: 'broadcast',
          event: 'test',
          payload: { message: testMessage, timestamp: new Date().toISOString() }
        })

      if (response === 'ok') {
        addMessage(`Broadcast sent: ${testMessage}`)
      } else {
        addMessage(`Broadcast failed: ${response}`)
      }
    } catch (error) {
      addMessage(`Broadcast error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const insertTestCall = async () => {
    const testStoreId = '00000000-0000-0000-0000-000000000000' // Test UUID
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      addMessage('User not authenticated')
      return
    }

    const { error } = await supabase
      .from('order_calls')
      .insert({
        store_id: testStoreId,
        number: Math.floor(Math.random() * 999) + 1,
        type: Math.random() > 0.5 ? 'takeout' : 'dine_in',
        admin_id: user.id
      })

    if (error) {
      addMessage(`Insert error: ${error.message}`)
    } else {
      addMessage('Test call inserted')
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="mb-4 text-2xl font-bold">Realtime Debug</h1>
      
      <div className="mb-4 flex items-center space-x-2">
        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
      </div>

      <div className="mb-4 space-x-2">
        <input
          type="text"
          value={testMessage}
          onChange={(e) => setTestMessage(e.target.value)}
          placeholder="Test message"
          className="rounded border px-2 py-1"
        />
        <button
          onClick={sendTestBroadcast}
          className="rounded bg-blue-500 px-4 py-1 text-white"
          disabled={!isConnected}
        >
          Send Broadcast
        </button>
        <button
          onClick={insertTestCall}
          className="rounded bg-green-500 px-4 py-1 text-white"
        >
          Insert Test Call
        </button>
      </div>

      <div className="rounded border p-4">
        <h2 className="mb-2 font-semibold">Messages:</h2>
        <div className="space-y-1 text-sm">
          {messages.map((msg, idx) => (
            <div key={idx} className="font-mono">{msg}</div>
          ))}
        </div>
      </div>
    </div>
  )
}