-- Create the 'user-documents' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-documents', 'user-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for the bucket
-- Note: 'storage.objects' is the table where file metadata is stored

-- 1. Allow public select (if you want the images to be public via URL)
CREATE POLICY "Any user can view document images"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-documents');

-- 2. Allow authenticated users to upload their own documents
-- We assume the folder name is the user's ID (which matches our frontend implementation)
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'user-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 3. Allow users to update/delete their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'user-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'user-documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
