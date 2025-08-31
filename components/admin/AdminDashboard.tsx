'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TenKeyPad } from './TenKeyPad'
import { RecentCalls } from './RecentCalls'
import { User } from '@supabase/supabase-js'

interface Store {
  id: string
  name: string
}

interface AdminDashboardProps {
  store: Store
  storeAdminId: string
  user: User
}

export function AdminDashboard({ store, storeAdminId, user }: AdminDashboardProps) {

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 rounded-lg bg-white p-4 shadow">
          <h1 className="text-xl font-bold text-gray-900">{store.name}</h1>
          <p className="text-sm text-gray-600">{user.email}</p>
          <form action="/auth/signout" method="POST" className="mt-2">
            <button
              type="submit"
              className="text-sm text-red-600 hover:text-red-800"
            >
              로그아웃
            </button>
          </form>
        </div>


        {/* Ten Key Pad */}
        <TenKeyPad storeId={store.id} />

        {/* Recent Calls */}
        <RecentCalls storeId={store.id} />

        {/* Action Buttons */}
        <div className="mt-6 space-y-3">
          {/* Image Management Button */}
          <Link
            href="/admin/images"
            className="block w-full rounded-lg bg-emerald-600 p-4 text-center font-medium text-white shadow transition-colors hover:bg-emerald-700"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>이미지 관리</span>
            </div>
          </Link>

          {/* Display Screen Button */}
          <Link
            href={`/display/${store.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-lg bg-slate-600 p-4 text-center font-medium text-white shadow transition-colors hover:bg-slate-700"
          >
            <div className="flex items-center justify-center space-x-2">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>디스플레이 화면 보기</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}