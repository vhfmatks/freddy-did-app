-- 빠른 해결을 위한 SQL (테스트용)
-- Supabase SQL Editor에서 실행하세요

-- 방법 1: RLS 임시 비활성화 (테스트용 - 프로덕션에서는 사용하지 마세요)
ALTER TABLE order_calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE stores DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_admins DISABLE ROW LEVEL SECURITY;

-- 방법 2: 테스트 데이터 생성
-- 먼저 현재 로그인한 사용자 ID 확인
SELECT 'Current user ID: ' || auth.uid()::text as user_info;

-- 테스트 매장 생성 및 관리자 권한 부여를 한 번에
DO $$
DECLARE
    test_store_id UUID;
    current_user_id UUID;
BEGIN
    -- 현재 사용자 ID 가져오기
    current_user_id := auth.uid();
    
    IF current_user_id IS NOT NULL THEN
        -- 테스트 매장 생성
        INSERT INTO stores (name) 
        VALUES ('테스트 매장') 
        ON CONFLICT DO NOTHING
        RETURNING id INTO test_store_id;
        
        -- 매장이 이미 있다면 ID 가져오기
        IF test_store_id IS NULL THEN
            SELECT id INTO test_store_id FROM stores WHERE name = '테스트 매장' LIMIT 1;
        END IF;
        
        -- 관리자 권한 부여
        INSERT INTO store_admins (user_id, store_id, role) 
        VALUES (current_user_id, test_store_id, 'admin')
        ON CONFLICT (user_id, store_id) DO NOTHING;
        
        RAISE NOTICE 'Store ID: %, User ID: %', test_store_id, current_user_id;
    ELSE
        RAISE NOTICE 'No authenticated user found. Please login first.';
    END IF;
END $$;

-- 결과 확인
SELECT 
    s.id as store_id, 
    s.name as store_name,
    sa.user_id,
    u.email,
    sa.role
FROM stores s
JOIN store_admins sa ON s.id = sa.store_id
JOIN auth.users u ON sa.user_id = u.id;