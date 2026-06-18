-- Phase 1: Group Tour Package Management Schema

-- 1. tour_packages
CREATE TABLE public.tour_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_city TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration TEXT NOT NULL,
    min_capacity INTEGER DEFAULT 1,
    max_capacity INTEGER NOT NULL,
    adult_price DECIMAL(10, 2) NOT NULL,
    child_price DECIMAL(10, 2),
    single_sharing_price DECIMAL(10, 2),
    twin_sharing_price DECIMAL(10, 2),
    extra_person_price DECIMAL(10, 2),
    inclusions TEXT[] DEFAULT '{}',
    exclusions TEXT[] DEFAULT '{}',
    cover_image TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.tour_packages ENABLE ROW LEVEL SECURITY;

-- 2. package_itineraries
CREATE TABLE public.package_itineraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.tour_packages(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_itineraries ENABLE ROW LEVEL SECURITY;

-- 3. package_gallery
CREATE TABLE public.package_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.tour_packages(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    is_cover BOOLEAN DEFAULT false,
    is_banner BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_gallery ENABLE ROW LEVEL SECURITY;

-- 4. package_assignments
CREATE TABLE public.package_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.tour_packages(id) ON DELETE CASCADE,
    hub_id UUID REFERENCES public.hubs(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'assigned', -- assigned, published, unpublished
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    UNIQUE(package_id, hub_id)
);

ALTER TABLE public.package_assignments ENABLE ROW LEVEL SECURITY;

-- 5. package_departures
CREATE TABLE public.package_departures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.tour_packages(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    capacity INTEGER NOT NULL,
    booked_seats INTEGER DEFAULT 0,
    status TEXT DEFAULT 'scheduled', -- scheduled, completed, cancelled
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_departures ENABLE ROW LEVEL SECURITY;

-- 6. package_bookings
CREATE TABLE public.package_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_ref TEXT UNIQUE NOT NULL, -- e.g., XP-PKG-2026-4587
    package_id UUID REFERENCES public.tour_packages(id) ON DELETE RESTRICT,
    departure_id UUID REFERENCES public.package_departures(id) ON DELETE RESTRICT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hub_id UUID REFERENCES public.hubs(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    payment_status TEXT DEFAULT 'pending', -- pending, partial, completed
    booking_status TEXT DEFAULT 'confirmed', -- confirmed, cancelled
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_bookings ENABLE ROW LEVEL SECURITY;

-- 7. package_travellers
CREATE TABLE public.package_travellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.package_bookings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    email TEXT,
    mobile TEXT,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_travellers ENABLE ROW LEVEL SECURITY;

-- 8. package_documents
CREATE TABLE public.package_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.package_bookings(id) ON DELETE CASCADE,
    traveller_id UUID REFERENCES public.package_travellers(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- id_proof, passport, visa
    file_url TEXT NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_documents ENABLE ROW LEVEL SECURITY;

-- 9. package_payments
CREATE TABLE public.package_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.package_bookings(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_id TEXT,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.package_payments ENABLE ROW LEVEL SECURITY;


-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('package-itineraries', 'package-itineraries', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('package-documents', 'package-documents', false) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('package-gallery', 'package-gallery', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for package-itineraries (Public read, admin write)
CREATE POLICY "Public Read package-itineraries" ON storage.objects FOR SELECT USING (bucket_id = 'package-itineraries');
CREATE POLICY "Admin Insert package-itineraries" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'package-itineraries' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin Update package-itineraries" ON storage.objects FOR UPDATE USING (bucket_id = 'package-itineraries' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies for package-gallery (Public read, admin write)
CREATE POLICY "Public Read package-gallery" ON storage.objects FOR SELECT USING (bucket_id = 'package-gallery');
CREATE POLICY "Admin Insert package-gallery" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'package-gallery' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin Update package-gallery" ON storage.objects FOR UPDATE USING (bucket_id = 'package-gallery' AND public.has_role(auth.uid(), 'admin'));

-- Storage Policies for package-documents (Private read, User insert, Admin/Hub read)
CREATE POLICY "Traveller Insert package-documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'package-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Users view own package-documents" ON storage.objects FOR SELECT USING (bucket_id = 'package-documents' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hub_partner')));


-- RLS Policies

-- Admins can do anything to tour_packages
CREATE POLICY "Admins can manage tour packages" ON public.tour_packages FOR ALL USING (public.has_role(auth.uid(), 'admin'));
-- Anyone can read published packages
CREATE POLICY "Anyone can view published tour packages" ON public.tour_packages FOR SELECT USING (status = 'published');

-- Itineraries
CREATE POLICY "Admins can manage itineraries" ON public.package_itineraries FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read itineraries" ON public.package_itineraries FOR SELECT USING (true);

-- Gallery
CREATE POLICY "Admins can manage gallery" ON public.package_gallery FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read gallery" ON public.package_gallery FOR SELECT USING (true);

-- Assignments
CREATE POLICY "Admins can manage assignments" ON public.package_assignments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hubs can view their assignments" ON public.package_assignments FOR SELECT USING (hub_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hubs can update their assignment status" ON public.package_assignments FOR UPDATE USING (hub_id = auth.uid()) WITH CHECK (hub_id = auth.uid());
CREATE POLICY "Anyone can read published assignments" ON public.package_assignments FOR SELECT USING (status = 'published');

-- Departures
CREATE POLICY "Admins can manage departures" ON public.package_departures FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can read departures" ON public.package_departures FOR SELECT USING (true);

-- Bookings
CREATE POLICY "Admins can manage bookings" ON public.package_bookings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hubs can view bookings for their hub" ON public.package_bookings FOR SELECT USING (hub_id = auth.uid());
CREATE POLICY "Travellers can manage own bookings" ON public.package_bookings FOR ALL USING (user_id = auth.uid());

-- Travellers
CREATE POLICY "Admins can manage travellers" ON public.package_travellers FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Travellers can manage own travellers" ON public.package_travellers FOR ALL USING (
    EXISTS (SELECT 1 FROM public.package_bookings WHERE id = booking_id AND user_id = auth.uid())
);
CREATE POLICY "Hubs can view their travellers" ON public.package_travellers FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.package_bookings WHERE id = booking_id AND hub_id = auth.uid())
);

-- Documents
CREATE POLICY "Admins can manage documents" ON public.package_documents FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Travellers can manage own documents" ON public.package_documents FOR ALL USING (
    EXISTS (SELECT 1 FROM public.package_bookings WHERE id = booking_id AND user_id = auth.uid())
);
CREATE POLICY "Hubs can view their documents" ON public.package_documents FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.package_bookings WHERE id = booking_id AND hub_id = auth.uid())
);

-- Payments
CREATE POLICY "Admins can manage payments" ON public.package_payments FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Travellers can manage own payments" ON public.package_payments FOR ALL USING (
    EXISTS (SELECT 1 FROM public.package_bookings WHERE id = booking_id AND user_id = auth.uid())
);
CREATE POLICY "Hubs can view their payments" ON public.package_payments FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.package_bookings WHERE id = booking_id AND hub_id = auth.uid())
);

-- Triggers for updated_at
CREATE TRIGGER update_tour_packages_updated_at BEFORE UPDATE ON public.tour_packages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_assignments_updated_at BEFORE UPDATE ON public.package_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_departures_updated_at BEFORE UPDATE ON public.package_departures FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_package_bookings_updated_at BEFORE UPDATE ON public.package_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
