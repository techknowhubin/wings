-- Fix: Allow users to UPDATE their own documents (required for upsert ON CONFLICT DO UPDATE)
-- The previous migration only had INSERT + SELECT for users, which breaks upsert.

-- Add UPDATE policy so authenticated users can update their own document rows
DROP POLICY IF EXISTS "Users can update own documents" ON public.user_documents;

CREATE POLICY "Users can update own documents"
  ON public.user_documents FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Also ensure there is a unique constraint on (user_id, document_type) for upsert to work.
-- It may exist from the old migration, so we use IF NOT EXISTS guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.user_documents'::regclass
    AND contype = 'u'
    AND conname = 'user_documents_user_id_document_type_key'
  ) THEN
    ALTER TABLE public.user_documents
      ADD CONSTRAINT user_documents_user_id_document_type_key
      UNIQUE (user_id, document_type);
  END IF;
END $$;
