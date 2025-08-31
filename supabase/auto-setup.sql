-- 자동 설정 스크립트 (Google 로그인 후 실행)
-- Supabase SQL Editor에서 실행하세요

-- 1. 현재 로그인한 사용자 확인
DO $$
DECLARE
    current_user_id UUID;
    test_store_id UUID;
    existing_admin_count INTEGER;
BEGIN
    -- 현재 사용자 ID 가져오기
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user found. Please login first.';
    END IF;

    RAISE NOTICE 'Setting up for user: %', current_user_id;

    -- 기존 관리자 권한 확인
    SELECT COUNT(*) INTO existing_admin_count 
    FROM store_admins 
    WHERE user_id = current_user_id;

    IF existing_admin_count > 0 THEN
        RAISE NOTICE 'User already has admin access. Skipping setup.';
        RETURN;
    END IF;

    -- 테스트 매장 생성 또는 기존 매장 사용
    SELECT id INTO test_store_id 
    FROM stores 
    WHERE name = '테스트 매장' 
    LIMIT 1;

    IF test_store_id IS NULL THEN
        INSERT INTO stores (name) 
        VALUES ('테스트 매장') 
        RETURNING id INTO test_store_id;
        
        RAISE NOTICE 'Created new store with ID: %', test_store_id;
    ELSE
        RAISE NOTICE 'Using existing store with ID: %', test_store_id;
    END IF;

    -- 관리자 권한 부여
    INSERT INTO store_admins (user_id, store_id, role) 
    VALUES (current_user_id, test_store_id, 'admin')
    ON CONFLICT (user_id, store_id) DO NOTHING;

    -- 매장 설정 생성
    INSERT INTO store_settings (store_id, recent_display_minutes, volume_level)
    VALUES (test_store_id, 5, 50)
    ON CONFLICT (store_id) DO NOTHING;

    RAISE NOTICE 'Setup completed successfully!';
    RAISE NOTICE 'Store ID: %', test_store_id;
    RAISE NOTICE 'Admin page: /admin';
    RAISE NOTICE 'Display page: /display/%', test_store_id;

END $$;

-- 2. 설정 확인
SELECT 
    'Setup Verification' as status,
    u.email,
    s.id as store_id,
    s.name as store_name,
    sa.role,
    '/display/' || s.id::text as display_url
FROM auth.users u
JOIN store_admins sa ON u.id = sa.user_id
JOIN stores s ON sa.store_id = s.id
WHERE u.id = auth.uid();

-- 3. Realtime 설정 확인/활성화
DO $$
BEGIN
    -- Realtime publication 확인 및 생성
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- order_calls 테이블을 publication에 추가
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE order_calls';
    
    RAISE NOTICE 'Realtime enabled for order_calls table';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'order_calls table already added to realtime publication';
END $$;

-- 4. 최종 상태 확인
SELECT 
    'Final Status' as check_type,
    (SELECT COUNT(*) FROM stores) as total_stores,
    (SELECT COUNT(*) FROM store_admins WHERE user_id = auth.uid()) as user_admin_count,
    (SELECT COUNT(*) FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'order_calls') as realtime_enabled
;