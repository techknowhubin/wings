-- Backfill phone numbers for existing users from auth.users raw_user_meta_data

-- Update public.profiles with phone numbers from auth.users
UPDATE public.profiles p
SET phone = au.raw_user_meta_data->>'phone'
FROM auth.users au
WHERE p.id = au.id
  AND p.phone IS NULL
  AND au.raw_user_meta_data->>'phone' IS NOT NULL;

-- Update public.users with phone numbers from auth.users
UPDATE public.users u
SET mobile_number = au.raw_user_meta_data->>'phone'
FROM auth.users au
WHERE u.id = au.id
  AND (u.mobile_number = '' OR u.mobile_number IS NULL)
  AND au.raw_user_meta_data->>'phone' IS NOT NULL;

-- Note: Phone in auth.users.phone column can only be set through phone auth flows.
-- Our system stores phone in raw_user_meta_data, which is synced to public.profiles.phone
-- and public.users.mobile_number by the triggers. This backfill ensures all existing
-- users have their phone numbers properly populated in the application tables.
