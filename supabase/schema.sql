-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stores table
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Store admins table
CREATE TABLE store_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'manager')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(user_id, store_id)
);

-- Order calls table
CREATE TABLE order_calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number > 0 AND number <= 999),
  type VARCHAR(20) NOT NULL CHECK (type IN ('takeout', 'dine_in')),
  called_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  admin_id UUID NOT NULL REFERENCES auth.users(id)
);

-- Store images table
CREATE TABLE store_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL, -- Changed from VARCHAR(500) to TEXT to support base64 encoded images
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Store settings table
CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE UNIQUE,
  recent_display_minutes INTEGER DEFAULT 5 CHECK (recent_display_minutes >= 1 AND recent_display_minutes <= 60),
  volume_level INTEGER DEFAULT 50 CHECK (volume_level >= 0 AND volume_level <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for better performance
CREATE INDEX idx_store_admins_user_id ON store_admins(user_id);
CREATE INDEX idx_store_admins_store_id ON store_admins(store_id);
CREATE INDEX idx_order_calls_store_id ON order_calls(store_id);
CREATE INDEX idx_order_calls_called_at ON order_calls(called_at DESC);
CREATE INDEX idx_store_images_store_id ON store_images(store_id);
CREATE INDEX idx_store_images_order ON store_images(order_index);

-- Enable Row Level Security (RLS)
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Stores policies
CREATE POLICY "Users can view stores they admin" ON stores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = stores.id
      AND store_admins.user_id = auth.uid()
    )
  );

-- Store admins policies
CREATE POLICY "Users can view their admin records" ON store_admins
  FOR SELECT USING (user_id = auth.uid());

-- Order calls policies
CREATE POLICY "Store admins can view their store's calls" ON order_calls
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Store admins can insert calls" ON order_calls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Store admins can delete their store's calls" ON order_calls
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = order_calls.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- Store images policies
CREATE POLICY "Store admins can manage their store's images" ON store_images
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = store_images.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- Store settings policies
CREATE POLICY "Store admins can manage their store's settings" ON store_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM store_admins
      WHERE store_admins.store_id = store_settings.store_id
      AND store_admins.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for order_calls
ALTER PUBLICATION supabase_realtime ADD TABLE order_calls;