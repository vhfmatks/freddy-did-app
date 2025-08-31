import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImageManager } from '@/components/admin/ImageManager'
import Link from 'next/link'

export default async function ImagesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // Check if user is admin
  const { data: adminData, error } = await supabase
    .from('store_admins')
    .select(`
      *,
      stores (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .single()

  if (error || !adminData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">접근 권한이 없습니다</h1>
          <p className="text-gray-600">이미지 관리는 매장 관리자만 사용할 수 있습니다.</p>
          <div className="space-x-4">
            <Link 
              href="/admin"
              className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              관리자 대시보드로 돌아가기
            </Link>
            <Link 
              href="/login"
              className="inline-block bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg"
            >
              다시 로그인
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!adminData.stores) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">매장 정보 오류</h1>
          <p className="text-gray-600">매장 정보를 찾을 수 없습니다.</p>
          <Link 
            href="/admin"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded-lg"
          >
            관리자 대시보드로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <Link
              href="/admin"
              className="flex items-center space-x-2 text-emerald-600 hover:text-emerald-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>관리자 대시보드로 돌아가기</span>
            </Link>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">이미지 관리</h1>
              <p className="text-gray-600">{adminData.stores.name} • {user.email}</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                href={`/display/${adminData.stores.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 rounded-lg bg-indigo-500 px-4 py-2 text-white hover:bg-indigo-600"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>디스플레이 미리보기</span>
              </Link>
              
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Image Manager */}
        <ImageManager storeId={adminData.stores.id} />
        
        {/* Footer Info */}
        <div className="mt-12 rounded-lg bg-gray-50 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">이미지 업로드 정보</h3>
              <ul className="space-y-1">
                <li>• 지원 형식: JPEG, PNG, WebP</li>
                <li>• 최대 파일 크기: 10MB</li>
                <li>• 최대 이미지 개수: 5개</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">자동 최적화</h3>
              <ul className="space-y-1">
                <li>• 최대 해상도: 1920x1080</li>
                <li>• 압축 품질: 85%</li>
                <li>• 형식 변환: JPEG로 통일</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-2">디스플레이</h3>
              <ul className="space-y-1">
                <li>• 자동 슬라이드쇼 재생</li>
                <li>• 순서는 번호 순서대로</li>
                <li>• 실시간 이미지 업데이트</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}