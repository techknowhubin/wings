-- 1. Add missing enum values to prevent Postgres from crashing
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'vehicle';
ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'cab';
