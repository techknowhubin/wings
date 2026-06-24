-- Add force_2fa_roles array to platform_settings
ALTER TABLE public.platform_settings 
ADD COLUMN IF NOT EXISTS force_2fa_roles TEXT[] NOT NULL DEFAULT '{}';
