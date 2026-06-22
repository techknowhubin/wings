-- Create gst_settings table
CREATE TABLE public.gst_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_type TEXT UNIQUE NOT NULL,
    gst_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (gst_percentage >= 0 AND gst_percentage <= 100),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default GST values
INSERT INTO public.gst_settings (listing_type, gst_percentage, is_enabled) VALUES
    ('stays', 12.00, true),
    ('hotels', 18.00, true),
    ('resorts', 18.00, true),
    ('bikes', 18.00, true),
    ('cars', 18.00, true),
    ('outstation_cabs', 5.00, true),
    ('airport_cabs', 5.00, true),
    ('experiences', 18.00, true),
    ('GLOBAL', 0.00, true) -- Global toggle uses the is_enabled flag.
ON CONFLICT (listing_type) DO NOTHING;

-- Enable RLS
ALTER TABLE public.gst_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users (for checkout)
CREATE POLICY "Enable read access for all users on gst_settings" 
ON public.gst_settings FOR SELECT USING (true);

-- Allow admin write access
CREATE POLICY "Enable all access for admin users on gst_settings" 
ON public.gst_settings FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'
    )
);

-- Updated_at trigger
CREATE TRIGGER update_gst_settings_modtime
BEFORE UPDATE ON public.gst_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add GST fields to main bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0;

-- Add GST fields to cab_bookings
ALTER TABLE public.cab_bookings ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.cab_bookings ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.cab_bookings ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0;

-- Add GST fields to package_bookings
ALTER TABLE public.package_bookings ADD COLUMN IF NOT EXISTS base_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE public.package_bookings ADD COLUMN IF NOT EXISTS gst_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE public.package_bookings ADD COLUMN IF NOT EXISTS gst_amount NUMERIC(10,2) DEFAULT 0;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE gst_settings;
