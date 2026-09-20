-- ==============================================================================
-- VSP PLATFORM - FIX & CREATE OWNER DOCUMENTS STORAGE BUCKET
-- Run this in Supabase Dashboard -> SQL Editor to fix "Bucket not found" errors
-- ==============================================================================

-- 1. إنشاء حاوية التخزين السحابي لمستندات الملاك إذا لم تكن موجودة
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'owner_documents',
  'owner_documents',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 2. إتاحة صلاحية القراءة لعرض ومعاينة المستندات في لوحة الإدارة
DROP POLICY IF EXISTS "Public Access for Owner Documents" ON storage.objects;
CREATE POLICY "Public Access for Owner Documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'owner_documents');

-- 3. إتاحة صلاحية الرفع للمستخدمين المسجلين من تطبيق الموبايل
DROP POLICY IF EXISTS "Authenticated Upload for Owner Documents" ON storage.objects;
CREATE POLICY "Authenticated Upload for Owner Documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'owner_documents');

-- 4. إتاحة صلاحية التحديث والاستبدال
DROP POLICY IF EXISTS "Authenticated Update for Owner Documents" ON storage.objects;
CREATE POLICY "Authenticated Update for Owner Documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'owner_documents');
