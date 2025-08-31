-- Fix image_url field length to support base64 encoded images
-- Base64 images can be quite large, so we'll use TEXT type instead of VARCHAR(500)

ALTER TABLE store_images 
ALTER COLUMN image_url TYPE TEXT;

-- Add a comment to document the change
COMMENT ON COLUMN store_images.image_url IS 'Base64 encoded image data or URL to image file';