-- Supabase Database Schema for Piko Store (Phase 1)

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  short_description TEXT,
  description TEXT,
  specifications JSONB DEFAULT '{}'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
  category_slug TEXT,
  source_price NUMERIC(10, 2), -- Internal source price (never exposed to public customers)
  selling_price NUMERIC(10, 2) NOT NULL,
  compare_at_price NUMERIC(10, 2),
  stock_count INTEGER DEFAULT 0,
  in_stock BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  rating NUMERIC(3, 2) DEFAULT 5.0,
  rating_count INTEGER DEFAULT 0,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  promo_code TEXT,
  shipping_fee NUMERIC(10, 2) DEFAULT 0,
  total_amount NUMERIC(10, 2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  order_status TEXT NOT NULL,
  tracking_number TEXT,
  courier_name TEXT,
  tracking_events JSONB DEFAULT '[]'::jsonb,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure razorpay columns exist if table was already created
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS razorpay_signature TEXT;

-- 4. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_slug TEXT,
  product_image TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC(10, 2) NOT NULL,
  selected_variant TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) policies on all tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- 1. Public read policy for categories (contains non-sensitive metadata)
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

-- 2. Remove any public read policy on products table to protect source_price and internal costs
DROP POLICY IF EXISTS "Public read products" ON public.products;

-- 3. Create customer-safe VIEW exposing ONLY public product fields (EXCLUDES source_price, profit, supplier info)
CREATE OR REPLACE VIEW public.public_products AS
SELECT
  id,
  name,
  slug,
  short_description,
  description,
  specifications,
  images,
  category_id,
  category_slug,
  selling_price,
  compare_at_price,
  stock_count,
  in_stock,
  is_featured,
  rating,
  rating_count,
  tags,
  created_at
FROM public.products;

-- 4. Grant SELECT on public_products VIEW to anonymous and authenticated users
GRANT SELECT ON public.public_products TO anon, authenticated;
