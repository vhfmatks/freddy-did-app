# 매장용 DID(Digital Information Display) 시스템 PRD

## 1. 프로젝트 개요

### 1.1 프로젝트명
매장용 DID 번호 호출 시스템

### 1.2 목적
매장 관리자가 주문 번호를 효율적으로 고객에게 전달할 수 있는 디지털 알림 시스템 구축

### 1.3 구현 기술 스택
- **Frontend**: Next.js 15
- **Backend**: Supabase
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **권한**: 관리자 인증 후 페이지 접근 가능

---

## 2. 기능 요구사항

### 2.1 매장 관리자용 모바일 화면

#### 2.1.1 텐키 입력 기능
- **기능**: 숫자 입력을 위한 10키 패드 제공
- **동작**: 
  - 1~999번까지 입력 가능
  - 엔터 키 또는 전송 버튼으로 번호 전송
  - 포장/매장 주문 구분 토글 스위치

#### 2.1.2 주문 유형 구분
- **포장 주문**: 포장용 번호 호출
- **매장 주문**: 매장 내 식사용 번호 호출
- UI에서 명확한 구분 표시 (색상, 아이콘 등)

#### 2.1.3 최근 알림 관리
- **표시 기간**: 5분간 최근 호출 번호 표시 (환경설정으로 조정 가능)
- **재알림 기능**: 최근 번호 터치 시 재호출
- **삭제 기능**: 길게 누르기(Long Press)로 개별 번호 삭제
- **상태 표시**: 포장/매장 구분, 호출 시간 표시

#### 2.1.4 환경설정
- 최근 알림 표시 시간 설정 (1~60분)
- 음성 알림 볼륨 조절
- 매장명 설정

### 2.2 고객용 TV 디스플레이 화면

#### 2.2.1 레이아웃 구성
- **좌측 영역 (60%)**: 이미지 캐로셀
- **우측 영역 (40%)**: 번호 알림 표시

#### 2.2.2 이미지 캐로셀
- 관리자가 업로드한 이미지들을 순환 표시
- 자동 전환 (5초 간격)
- 이미지 비율 자동 조정
- 최소 1개 ~ 최대 10개 이미지 지원

#### 2.2.3 번호 알림 시스템
- **음성 알림**: "포장 12번 고객님" / "매장 5번 고객님"
- **시각적 구분**:
  - 포장 주문: 파란색 배경
  - 매장 주문: 빨간색 배경
- **표시 순서**: 최신 호출 번호가 상단에 표시
- **자동 제거**: 10분 후 자동으로 화면에서 제거

#### 2.2.4 반응형 디자인
- 다양한 TV 화면 크기 대응
- FullHD(1920x1080) 기본 최적화

---

## 3. 데이터베이스 설계

### 3.1 테이블 구조

#### 3.1.1 stores (매장 정보)
```sql
- id (UUID, PK)
- name (VARCHAR) - 매장명
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### 3.1.2 store_admins (매장 관리자)
```sql
- id (UUID, PK)
- user_id (UUID, FK) - Supabase Auth 사용자
- store_id (UUID, FK)
- role (VARCHAR) - 'admin', 'manager'
- created_at (TIMESTAMP)
```

#### 3.1.3 order_calls (주문 호출)
```sql
- id (UUID, PK)
- store_id (UUID, FK)
- number (INTEGER) - 호출 번호
- type (VARCHAR) - 'takeout', 'dine_in'
- called_at (TIMESTAMP) - 호출 시간
- admin_id (UUID, FK) - 호출한 관리자
```

#### 3.1.4 store_images (매장 이미지)
```sql
- id (UUID, PK)
- store_id (UUID, FK)
- image_url (VARCHAR) - Supabase Storage URL
- order_index (INTEGER) - 표시 순서
- is_active (BOOLEAN)
- uploaded_at (TIMESTAMP)
```

#### 3.1.5 store_settings (매장 설정)
```sql
- id (UUID, PK)
- store_id (UUID, FK)
- recent_display_minutes (INTEGER) - 최근 알림 표시 시간 (기본값: 5)
- volume_level (INTEGER) - 음성 볼륨 (0-100)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

---

## 4. API 설계

### 4.1 인증 관련
- `POST /api/auth/login` - 관리자 로그인
- `POST /api/auth/logout` - 로그아웃
- `GET /api/auth/me` - 현재 사용자 정보

### 4.2 주문 호출
- `POST /api/calls` - 새 번호 호출
- `GET /api/calls/recent` - 최근 호출 목록
- `DELETE /api/calls/:id` - 호출 삭제
- `POST /api/calls/:id/recall` - 재호출

### 4.3 매장 관리
- `GET /api/stores/:id/settings` - 매장 설정 조회
- `PUT /api/stores/:id/settings` - 매장 설정 수정
- `GET /api/stores/:id/images` - 매장 이미지 목록
- `POST /api/stores/:id/images` - 이미지 업로드
- `DELETE /api/images/:id` - 이미지 삭제

---

## 5. 기술적 고려사항

### 5.1 실시간 통신
- **Supabase Realtime**: 관리자 화면과 고객 화면 간 실시간 동기화
- WebSocket 연결로 즉시 알림 전달

### 5.2 음성 알림
- **Web Speech API**: 브라우저 내장 TTS 사용
- 한국어 음성 지원 확인
- 볼륨 조절 기능

### 5.3 보안
- **Row Level Security (RLS)**: 매장별 데이터 격리
- JWT 토큰 기반 인증
- 관리자 권한 검증

### 5.4 성능 최적화
- 이미지 최적화 (WebP, 적절한 크기)
- 데이터베이스 인덱싱
- 캐싱 전략

---

## 6. 사용자 플로우

### 6.1 관리자 플로우
1. 로그인 → 매장 선택
2. 텐키로 번호 입력
3. 포장/매장 선택
4. 전송 버튼 클릭
5. 고객 화면에 즉시 반영

### 6.2 고객 플로우
1. TV 화면에서 이미지 캐로셀 시청
2. 번호 호출 시 음성 + 시각적 알림
3. 우측에서 현재 호출된 번호 확인

---

## 7. 개발 우선순위

### Phase 1 (MVP)
1. 기본 인증 시스템
2. 텐키 입력 화면
3. 기본 TV 디스플레이
4. 실시간 번호 호출

### Phase 2
1. 이미지 업로드/관리
2. 캐로셀 기능
3. 음성 알림

### Phase 3
1. 환경설정
2. 최근 알림 관리
3. 고급 기능 (재알림, 삭제)

---

## 8. 비기능적 요구사항

### 8.1 성능
- 호출 알림 지연시간: 1초 이내
- 이미지 로딩: 3초 이내
- 동시 접속자: 매장당 최대 10명

### 8.2 가용성
- 24/7 서비스 가동
- 99.9% 업타임 목표

### 8.3 브라우저 지원
- Chrome, Safari, Firefox 최신 버전
- 모바일 브라우저 지원 (iOS Safari, Chrome Mobile)

---

## 9. 추후 확장 계획

### 9.1 고도화 기능
- 다국어 지원
- 매장 체인 관리
- 통계 및 분석
- 푸시 알림
- 대기시간 예측

### 9.2 하드웨어 연동
- 키오스크 연동
- POS 시스템 연동
- 프린터 연동