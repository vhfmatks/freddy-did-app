# 매장용 DID(Digital Information Display) 시스템

매장 관리자가 주문 번호를 효율적으로 고객에게 전달할 수 있는 디지털 알림 시스템

## 기술 스택

- **Frontend**: Next.js 15 (App Router)
- **Backend**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth (Google OAuth)
- **Styling**: Tailwind CSS
- **Language**: TypeScript

## 시작하기

### 1. 환경 변수 설정

`.env.local` 파일을 생성하고 Supabase 프로젝트 정보를 입력하세요:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Authentication > Providers에서 Google OAuth 활성화
3. SQL Editor에서 `/supabase/schema.sql` 파일의 내용 실행
4. Storage에서 'store-images' 버킷 생성 (공개 설정)

### 3. 의존성 설치

```bash
npm install
```

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 주요 기능

### 관리자 기능 (`/admin`)
- 텐키 패드를 통한 번호 입력 (1-999)
- 포장/매장 주문 구분
- 최근 호출 번호 관리 (재호출, 삭제)
- 실시간 업데이트

### 고객 디스플레이 (`/display/[storeId]`)
- 좌측: 이미지 캐로셀 (60%)
- 우측: 번호 알림 표시 (40%)
- 음성 알림 (Web Speech API)
- 실시간 번호 업데이트

## 프로젝트 구조

```
/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 관련 라우트
│   │   └── login/         # 로그인 페이지
│   ├── admin/             # 관리자 대시보드
│   ├── display/           # 고객 디스플레이
│   └── auth/              # Auth 콜백 라우트
├── components/            # React 컴포넌트
│   ├── admin/            # 관리자 UI 컴포넌트
│   ├── auth/             # 인증 컴포넌트
│   └── display/          # 디스플레이 컴포넌트
├── lib/                   # 유틸리티
│   └── supabase/         # Supabase 클라이언트
├── types/                 # TypeScript 타입 정의
└── supabase/             # 데이터베이스 스키마
```

## 데이터베이스 스키마

- `stores`: 매장 정보
- `store_admins`: 매장 관리자
- `order_calls`: 주문 호출 기록
- `store_images`: 캐로셀 이미지
- `store_settings`: 매장 설정

모든 테이블은 Row Level Security (RLS)가 적용되어 있습니다.

## 배포

Vercel을 통한 배포를 권장합니다:

1. [Vercel](https://vercel.com)에 프로젝트 연결
2. 환경 변수 설정
3. 배포

## 라이선스

MIT
