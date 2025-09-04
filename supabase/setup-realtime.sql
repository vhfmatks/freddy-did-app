-- 1. Enable RLS on order_calls table
ALTER TABLE order_calls ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Allow admins to view order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow admins to insert order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow admins to update order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow admins to delete order_calls" ON order_calls;
DROP POLICY IF EXISTS "Allow anon to view order_calls" ON order_calls;

-- 3. Create comprehensive RLS policies
-- Allow authenticated admins to view their store's calls
CREATE POLICY "Enable read access for store admins" ON order_calls
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- Allow authenticated admins to insert calls for their store
CREATE POLICY "Enable insert for store admins" ON order_calls
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- Allow authenticated admins to update calls for their store
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

-- Allow authenticated admins to delete calls for their store
CREATE POLICY "Enable delete for store admins" ON order_calls
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );

-- Allow anonymous users to view order_calls for display screens
CREATE POLICY "Enable anon read for display" ON order_calls
    FOR SELECT
    USING (true); -- Display screens may not be authenticated

-- 4. Enable Realtime
-- First, try to drop the table from publication (ignore error if not exists)
DO $$ 
BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE order_calls;
EXCEPTION
    WHEN undefined_object THEN
        -- Table is not in publication, that's fine
        NULL;
END $$;

-- Now add the table to publication
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;

-- 5. Verify realtime is enabled
SELECT 
    schemaname,
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime';