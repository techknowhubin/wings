-- Migration: Add reference_id and reference_type to notifications table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS reference_type TEXT;
