-- ================================================
-- STEP 1: Enable RLS on order_calls table
-- ================================================
ALTER TABLE order_calls ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 2: Drop existing policies (run each separately if needed)
-- ================================================
DROP POLICY IF EXISTS "Allow admins to view order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow admins to insert order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow admins to update order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow admins to delete order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow anon to view order_calls" ON order_calls;
DROP POLICY IF EXISTS "Enable read access for store admins" ON order_calls;
DROP POLICY IF EXISTS "Enable insert for store admins" ON order_calls;
DROP POLICY IF EXISTS "Enable update for store admins" ON order_calls;
DROP POLICY IF EXISTS "Enable delete for store admins" ON order_calls;
DROP POLICY IF EXISTS "Enable anon read for display" ON order_calls;

-- ================================================
-- STEP 3: Create RLS policies for authenticated admins
-- ================================================

-- Policy for SELECT
CREATE POLICY "Enable read access for store admins" ON order_calls
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- Policy for INSERT
CREATE POLICY "Enable insert for store admins" ON order_calls
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- Policy for UPDATE
CREATE POLICY "Enable update for store admins" ON order_calls
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- Policy for DELETE
CREATE POLICY "Enable delete for store admins" ON order_calls
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- ================================================
-- STEP 4: Create policy for anonymous display access
-- ================================================
CREATE POLICY "Enable anon read for display" ON order_calls
    FOR SELECT
    USING (true);

-- ================================================
-- STEP 5: Enable Realtime - Method 1 (try this first)
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;

-- If the above fails with "already exists", run this instead:
-- ALTER PUBLICATION supabase_realtime DROP TABLE order_calls;
-- ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;

-- ================================================
-- STEP 6: Verify realtime is enabled
-- ================================================
SELECT 
    schemaname,
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime';

-- You should see 'public' | 'order_calls' in the results

-- ================================================
-- STEP 7: Check current policies (optional)
-- ================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    tablename = 'order_calls'
ORDER BY 
    policyname;