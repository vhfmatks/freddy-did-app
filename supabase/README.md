# Supabase 설정 가이드

## 1. Realtime 설정

### 방법 1: Supabase Dashboard에서 설정 (권장)

1. [Supabase Dashboard](https://app.supabase.com) 로그인
2. 프로젝트 선택
3. **Database** → **Replication** 메뉴로 이동
4. **supabase_realtime** publication 찾기
5. **Tables** 섹션에서 `order_calls` 테이블 선택
6. **Enable Replication** 토글 ON

### 방법 2: SQL Editor에서 설정

1. **SQL Editor** 메뉴로 이동
2. `setup-realtime-step-by-step.sql` 파일의 내용을 단계별로 실행

```sql
-- STEP 5만 실행 (가장 중요)
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;
```

만약 "relation already exists" 오류가 발생하면:
```sql
-- 먼저 제거
ALTER PUBLICATION supabase_realtime DROP TABLE order_calls;
-- 다시 추가
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;
```

### 방법 3: Supabase CLI 사용

```bash
# Supabase CLI 설치 (없는 경우)
npm install -g supabase

# 로그인
supabase login

# 프로젝트 연결
supabase link --project-ref [your-project-ref]

# SQL 실행
supabase db push
```

## 2. RLS (Row Level Security) 설정

### 필수 정책들:

1. **읽기 권한** - 관리자와 익명 사용자 모두
2. **쓰기 권한** - 인증된 관리자만
3. **수정 권한** - 인증된 관리자만
4. **삭제 권한** - 인증된 관리자만

## 3. 확인 방법

### Realtime 활성화 확인:
```sql
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

결과에 `public | order_calls`가 나타나야 합니다.

### RLS 정책 확인:
```sql
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'order_calls';
```

## 4. 트러블슈팅

### 문제: Realtime 이벤트가 전달되지 않음
- **해결**: Dashboard에서 Replication 설정 확인
- **해결**: RLS 정책이 올바르게 설정되었는지 확인
- **해결**: 브라우저 콘솔에서 WebSocket 연결 확인

### 문제: UPDATE 이벤트가 작동하지 않음
- **해결**: `deleted_at` 필드가 nullable인지 확인
- **해결**: RLS UPDATE 정책 확인
- **해결**: 채널 이름이 일치하는지 확인

### 문제: 권한 오류
- **해결**: store_admins 테이블에 사용자가 등록되어 있는지 확인
- **해결**: auth.uid()가 올바르게 작동하는지 확인

## 5. 테스트

1. `/debug/realtime` 페이지 방문
2. Store ID 입력
3. "Start Monitoring" 클릭
4. Admin 페이지에서 호출/삭제 테스트
5. 실시간 이벤트 확인