import { LoginForm } from '@/components/auth/LoginForm'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
            매장 DID 시스템
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            관리자 로그인
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}