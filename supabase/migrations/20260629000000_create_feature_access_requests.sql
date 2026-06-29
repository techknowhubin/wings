-- Create feature_access_requests table
CREATE TABLE IF NOT EXISTS public.feature_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    feature_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    host_note TEXT
);

-- Ensure a host can only have one pending request per feature
CREATE UNIQUE INDEX idx_feature_access_requests_pending 
ON public.feature_access_requests (host_id, feature_name) 
WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.feature_access_requests ENABLE ROW LEVEL SECURITY;

-- Policies for hosts
CREATE POLICY "Hosts can view their own requests"
    ON public.feature_access_requests
    FOR SELECT
    USING (auth.uid() = host_id);

CREATE POLICY "Hosts can create requests"
    ON public.feature_access_requests
    FOR INSERT
    WITH CHECK (auth.uid() = host_id);

-- Policies for admins
CREATE POLICY "Admins can view all requests"
    ON public.feature_access_requests
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update requests"
    ON public.feature_access_requests
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );

-- Add approved_listing_types to host_profiles if it does not exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'host_profiles' 
        AND column_name = 'approved_listing_types'
    ) THEN
        ALTER TABLE public.host_profiles ADD COLUMN approved_listing_types TEXT[] DEFAULT '{}';
    END IF;
END $$;
