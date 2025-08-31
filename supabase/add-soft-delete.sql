-- Add soft delete support to order_calls table
-- Migration: Add deleted_at column and update RLS policies

-- 1. Add deleted_at column to order_calls table
ALTER TABLE order_calls ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE NULL;

-- 2. Create index for better performance on soft delete queries
CREATE INDEX idx_order_calls_deleted_at ON order_calls(deleted_at);

-- 3. Update existing RLS policies to exclude soft-deleted records

-- Update SELECT policy to exclude soft-deleted records
DROP POLICY "Store admins can view their store's calls" ON order_calls;
CREATE POLICY "Store admins can view their store's calls" ON order_calls
  FOR SELECT USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- Update INSERT policy (no changes needed, but recreate for consistency)
DROP POLICY "Store admins can insert calls" ON order_calls;
CREATE POLICY "Store admins can insert calls" ON order_calls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- Update DELETE policy to exclude soft-deleted records
DROP POLICY "Store admins can delete their store's calls" ON order_calls;
CREATE POLICY "Store admins can delete their store's calls" ON order_calls
  FOR DELETE USING (
    deleted_at IS NULL AND
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- 4. Add UPDATE policy for soft delete functionality
CREATE POLICY "Store admins can update their store's calls" ON order_calls
  FOR UPDATE USING (
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

-- 5. Verify migration
SELECT 
  'Migration completed successfully' as status,
  EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_calls' 
    AND column_name = 'deleted_at'
  ) as deleted_at_column_added,
  (SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_order_calls_deleted_at') as index_created,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'order_calls') as total_policies
;