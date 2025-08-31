import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-gray-900">
          매장 DID 시스템
        </h1>
        <p className="mb-8 text-lg text-gray-600">
          디지털 주문 번호 호출 시스템
        </p>
        <div className="space-y-4">
          <Link
            href="/login"
            className="block rounded-lg bg-blue-600 px-8 py-3 text-white hover:bg-blue-700"
          >
            관리자 로그인
          </Link>
          <p className="text-sm text-gray-500">
            고객 디스플레이는 관리자가 제공하는 URL로 접속하세요
          </p>
        </div>
      </div>
    </div>
  )
}
