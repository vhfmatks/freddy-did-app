import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import Link from 'next/link'

export default async function AdminPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user is admin with better error handling
  const { data: adminData, error } = await supabase
    .from('store_admins')
    .select(`
      *,
      stores (
        id,
        name,
        created_at
      )
    `)
    .eq('user_id', user.id)
    .single()

  

  if (error || !adminData) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h1>
          <p className="text-gray-600">매장 관리자 권한이 필요합니다.</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">User ID: <code className="bg-gray-100 px-2 py-1 rounded">{user.id}</code></p>
            <p className="text-sm text-gray-500">Email: {user.email}</p>
          </div>
          <div className="space-x-4">
            <Link 
              href="/debug/user"
              className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              권한 설정하기
            </Link>
            <Link 
              href="/login"
              className="inline-block bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              다시 로그인
            </Link>
          </div>
          {error && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-red-600">Error Details</summary>
              <pre className="mt-2 bg-red-50 p-2 rounded text-xs text-red-800">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }

  if (!adminData.stores) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">매장 정보 오류</h1>
          <p className="text-gray-600">매장 정보를 찾을 수 없습니다.</p>
          <Link 
            href="/debug/user"
            className="inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            매장 설정하기
          </Link>
        </div>
      </div>
    )
  }

  return <AdminDashboard store={adminData.stores} storeAdminId={adminData.id} user={user} />
}