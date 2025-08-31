'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface StoreAdmin {
  id: string
  user_id: string
  store_id: string
  role: string
  stores: {
    id: string
    name: string
  }
}

export default function UserDebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [adminData, setAdminData] = useState<StoreAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError) throw userError
        
        setUser(user)

        if (user) {
          // Get admin data
          const { data: adminData, error: adminError } = await supabase
            .from('store_admins')
            .select(`
              *,
              stores (
                id,
                name
              )
            `)
            .eq('user_id', user.id)

          if (adminError) throw adminError
          setAdminData(adminData || [])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [supabase])

  const createTestData = async () => {
    if (!user) return

    try {

      // Step 1: Create or get test store
      let storeId: string | null = null
      
      // First try to get existing store
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('name', '테스트 매장')
        .single()

      if (existingStore) {
        storeId = existingStore.id
      } else {
        // Create new store
        const { data: newStore, error: storeError } = await supabase
          .from('stores')
          .insert({ name: '테스트 매장' })
          .select('id')
          .single()

        if (storeError) throw storeError
        storeId = newStore.id
      }

      if (!storeId) throw new Error('Failed to get or create store')

      // Step 2: Create admin relationship
      const { error: adminError } = await supabase
        .from('store_admins')
        .insert({
          user_id: user.id,
          store_id: storeId,
          role: 'admin'
        })

      if (adminError && !adminError.message.includes('duplicate')) {
        throw adminError
      }
      

      // Step 3: Create store settings
      const { error: settingsError } = await supabase
        .from('store_settings')
        .insert({
          store_id: storeId,
          recent_display_minutes: 5,
          volume_level: 50
        })

      if (settingsError && !settingsError.message.includes('duplicate')) {
        // Don't throw error for settings, it's not critical
      }
      
      
      // Show success message with URLs
      alert(`설정 완료!\n\n관리자 페이지: /admin\n디스플레이 페이지: /display/${storeId}`)

      // Refresh data
      window.location.reload()
    } catch (err) {
      alert(`Error creating test data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  if (loading) return <div className="p-4">Loading...</div>

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold">User Debug Information</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Error: {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Current User</h2>
        {user ? (
          <div className="space-y-2">
            <p><strong>ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{user.id}</code></p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Created:</strong> {new Date(user.created_at).toLocaleString()}</p>
            <details className="mt-4">
              <summary className="cursor-pointer font-medium">Full User Object</summary>
              <pre className="mt-2 bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </details>
          </div>
        ) : (
          <p>No user found - please login first</p>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Admin Access</h2>
        {adminData.length > 0 ? (
          <div className="space-y-4">
            {adminData.map((admin) => (
              <div key={admin.id} className="border p-4 rounded">
                <p><strong>Store:</strong> {admin.stores?.name}</p>
                <p><strong>Store ID:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{admin.store_id}</code></p>
                <p><strong>Role:</strong> {admin.role}</p>
                <p><strong>Display URL:</strong> 
                  <a 
                    href={`/display/${admin.store_id}`} 
                    className="text-blue-600 hover:underline ml-2"
                    target="_blank"
                  >
                    /display/{admin.store_id}
                  </a>
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p>No admin access found</p>
            {user && (
              <button
                onClick={createTestData}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Create Test Store & Admin Access
              </button>
            )}
          </div>
        )}
      </div>

      {user && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-x-4">
            <a 
              href="/admin" 
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded inline-block"
            >
              Go to Admin Dashboard
            </a>
            <a 
              href="/debug/realtime" 
              className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded inline-block"
            >
              Test Realtime
            </a>
          </div>
        </div>
      )}
    </div>
  )
}