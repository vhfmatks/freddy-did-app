-- Enable Realtime for order_calls table
-- Supabase SQL Editor에서 실행하세요

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