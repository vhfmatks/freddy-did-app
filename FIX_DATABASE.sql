-- MANUAL DATABASE FIX
-- Please run this SQL command in your Supabase Dashboard > SQL Editor

ALTER TABLE store_images 
ALTER COLUMN image_url TYPE TEXT;

-- This changes the image_url field from VARCHAR(500) to TEXT
-- which will allow storing base64 encoded images

-- Verify the change worked:
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'store_images' AND column_name = 'image_url';