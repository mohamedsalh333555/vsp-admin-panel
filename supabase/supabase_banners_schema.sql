-- ==============================================================================
-- VSP PLATFORM - BANNERS & ADVERTISEMENTS SCHEMA & STORAGE
-- ==============================================================================

-- 1. Create Banners Table
CREATE TABLE IF NOT EXISTS public.banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    target_url TEXT,
    placement TEXT NOT NULL DEFAULT 'home_slider', -- 'home_slider', 'popup', 'tournaments_screen'
    duration_seconds INTEGER NOT NULL DEFAULT 5,  -- Duration per slide in seconds
    start_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    end_date TIMESTAMPTZ,                         -- NULL means runs indefinitely until disabled
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority_order INTEGER NOT NULL DEFAULT 0,
    clicks_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for fast active query filtering
CREATE INDEX IF NOT EXISTS idx_banners_active_placement 
ON public.banners (is_active, placement, priority_order ASC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone (authenticated or anon) can view active and valid banners
CREATE POLICY "Public and users can view active banners"
ON public.banners FOR SELECT
USING (
    is_active = true 
    AND (start_date IS NULL OR start_date <= timezone('utc'::text, now()))
    AND (end_date IS NULL OR end_date >= timezone('utc'::text, now()))
);

-- Policy: Admins can do all operations (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admins have full access to banners"
ON public.banners FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'cofounder')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND users.role IN ('admin', 'cofounder')
    )
);

-- 2. Storage Setup for Banners Images Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policy: Public Read Access
CREATE POLICY "Public Read Access for Banner Images"
ON storage.objects FOR SELECT
USING (bucket_id = 'banners');

-- Storage Policy: Admins and Authenticated Users can upload banner images
CREATE POLICY "Admin Upload Access for Banner Images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners');

-- Storage Policy: Admin Update/Delete
CREATE POLICY "Admin Modify Access for Banner Images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'banners');

CREATE POLICY "Admin Delete Access for Banner Images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'banners');

-- Helper function to increment counters atomically
CREATE OR REPLACE FUNCTION increment_banner_clicks(p_banner_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.banners
    SET clicks_count = clicks_count + 1
    WHERE id = p_banner_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_banner_views(p_banner_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.banners
    SET views_count = views_count + 1
    WHERE id = p_banner_id;
END;
$$;
