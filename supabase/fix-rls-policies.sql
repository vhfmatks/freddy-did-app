-- RLS 정책 문제 해결을 위한 SQL
-- Supabase SQL Editor에서 순서대로 실행하세요

-- 1. 현재 사용자 확인 (Google 로그인 후)
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- 2. 현재 stores 테이블 확인
SELECT * FROM stores;

-- 3. 현재 store_admins 테이블 확인
SELECT * FROM store_admins;

-- 4. 테스트용 매장 생성 (아직 없다면)
INSERT INTO stores (name) 
VALUES ('테스트 매장') 
ON CONFLICT DO NOTHING
RETURNING id, name;

-- 5. 관리자 권한 부여 (위의 1번에서 확인한 user_id와 4번의 store_id 사용)
-- 아래 값들을 실제 값으로 변경해서 실행하세요
/*
INSERT INTO store_admins (user_id, store_id, role) 
VALUES (
  '[1번에서 확인한 user_id]', 
  '[4번에서 반환된 store_id]', 
  'admin'
) 
ON CONFLICT (user_id, store_id) DO NOTHING;
*/

-- 6. RLS 정책 확인
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'order_calls';

-- 7. 만약 INSERT 정책이 없다면 추가 (보통은 이미 있어야 함)
DROP POLICY IF EXISTS "Store admins can insert calls" ON order_calls;
CREATE POLICY "Store admins can insert calls" ON order_calls
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- 8. SELECT 정책도 확인/재생성
DROP POLICY IF EXISTS "Store admins can view their store's calls" ON order_calls;
CREATE POLICY "Store admins can view their store's calls" ON order_calls
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- 9. DELETE 정책도 확인/재생성  
DROP POLICY IF EXISTS "Store admins can delete their store's calls" ON order_calls;
CREATE POLICY "Store admins can delete their store's calls" ON order_calls
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- 10. 정책이 제대로 적용되었는지 최종 확인
SELECT 
  schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies 
WHERE tablename = 'order_calls'
ORDER BY cmd, policyname;