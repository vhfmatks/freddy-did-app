# 실시간 기능 설정 가이드

## Realtime 기능이 작동하지 않는 경우 체크리스트

### 1. Supabase 프로젝트에서 Realtime 활성화

Supabase 대시보드의 SQL Editor에서 다음 명령어를 실행하세요:

```sql
-- 1. Realtime Publication 생성 (이미 있을 수 있음)
CREATE PUBLICATION IF NOT EXISTS supabase_realtime;

-- 2. order_calls 테이블을 Realtime Publication에 추가
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;

-- 3. Realtime이 활성화되었는지 확인
SELECT 
  schemaname,
  tablename 
FROM 
  pg_publication_tables 
WHERE 
  pubname = 'supabase_realtime';
```

### 2. RLS(Row Level Security) 정책 확인

다음 SQL로 RLS 정책이 제대로 설정되어 있는지 확인:

```sql
-- RLS 정책 확인
SELECT 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual 
FROM 
  pg_policies 
WHERE 
  tablename = 'order_calls';
```

### 3. 초기 데이터 설정

관리자가 로그인한 후, 다음과 같이 매장과 관리자 권한을 설정해야 합니다:

```sql
-- 1. 테스트 매장 생성
INSERT INTO stores (name) VALUES ('테스트 매장') RETURNING id;

-- 2. 위에서 반환된 store id를 사용하여 관리자 권한 부여
-- Google 로그인 후 auth.users 테이블에서 user_id를 확인하세요
INSERT INTO store_admins (user_id, store_id, role) 
VALUES (
  '[Google 로그인으로 생성된 user_id]', 
  '[위에서 생성된 store_id]', 
  'admin'
);
```

### 4. 외래키 제약 조건 오류 해결 방법

**오류 메시지들**:
- "new row violates row-level security policy for table "order_calls""  
- "insert or update on table "order_calls" violates foreign key constraint "order_calls_store_id_fkey""

**🚀 해결 방법 A (가장 쉬움)**: 원클릭 자동 설정
1. **http://localhost:3010/debug/user** 접속
2. Google 로그인 완료 확인
3. **"Create Test Store & Admin Access"** 버튼 클릭
4. ✅ 자동으로 매장, 관리자 권한, 설정이 모두 생성됨
5. 성공 메시지에서 URL 확인 후 `/admin` 페이지로 이동

**해결 방법 B**: 완전 자동 SQL 실행
Supabase SQL Editor에서 `/supabase/auto-setup.sql` 파일의 내용을 실행하세요.

**해결 방법 C**: 수동 SQL 실행  
Supabase SQL Editor에서 `/supabase/quick-fix.sql` 파일의 내용을 실행하세요.

**해결 방법 D**: 임시로 RLS 비활성화 (테스트용만!)
```sql
-- 테스트용으로만 사용하세요!
ALTER TABLE order_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_admins DISABLE ROW LEVEL SECURITY;
```

### 5. 디버깅 및 테스트

1. **디버그 페이지 접속**: http://localhost:3000/debug/realtime
2. **개발자 도구 확인**: Console에서 Realtime 연결 상태 확인
3. **네트워크 탭**: WebSocket 연결 상태 확인

### 6. 환경 변수 재확인

`.env.local` 파일의 값이 올바른지 확인:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 7. 일반적인 문제해결

**문제**: 연결은 되지만 데이터가 실시간으로 업데이트되지 않음
**해결**: 
- RLS 정책 확인
- 테이블이 publication에 추가되었는지 확인
- 필터 조건 (`store_id=eq.${storeId}`) 확인

**문제**: 권한 오류 발생
**해결**:
- store_admins 테이블에 사용자가 추가되었는지 확인
- 올바른 store_id를 사용하고 있는지 확인

**문제**: 음성 알림이 작동하지 않음
**해결**:
- HTTPS에서만 Web Speech API가 작동함
- 브라우저가 음성 허용했는지 확인
- 한국어(ko-KR) 지원 확인

### 8. URL 접속 방법

- **관리자**: http://localhost:3000/admin
- **디스플레이**: http://localhost:3000/display/[store-id]

store-id는 stores 테이블에서 확인할 수 있습니다:

```sql
SELECT id, name FROM stores;
```