/*
  Migration: Add encrypted address column to host_profiles
  Adds a nullable text column `address_encrypted` which will store the AES‑GCM encrypted version of the plain address.
*/

BEGIN;

ALTER TABLE public.host_profiles
  ADD COLUMN address_encrypted text;

COMMIT;
