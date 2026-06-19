-- Phase 2: Group Tour Package Management Schema (Itinerary Days)

CREATE TABLE public.package_itinerary_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.tour_packages(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    meals TEXT[] DEFAULT '{}',
    stay_details TEXT,
    activities TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(package_id, day_number)
);

ALTER TABLE public.package_itinerary_days ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage itinerary days" ON public.package_itinerary_days FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read itinerary days" ON public.package_itinerary_days FOR SELECT USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_package_itinerary_days_updated_at BEFORE UPDATE ON public.package_itinerary_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
