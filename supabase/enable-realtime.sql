-- Enable Realtime for order_calls table
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;

-- Check if realtime is enabled
SELECT 
    schemaname,
    tablename 
FROM 
    pg_publication_tables 
WHERE 
    pubname = 'supabase_realtime';

-- Ensure RLS policies allow UPDATE operations
-- This policy allows authenticated users to update order_calls for their store
CREATE POLICY "Allow admins to update order_calls" ON order_calls
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

-- Ensure SELECT policy is also in place for realtime to work
CREATE POLICY "Allow admins to view order_calls" ON order_calls
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM store_admins 
            WHERE store_admins.store_id = order_calls.store_id 
            AND store_admins.user_id = auth.uid()
        )
    );