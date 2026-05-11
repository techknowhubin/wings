-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user', 'host');

-- Create enum for listing types
CREATE TYPE public.listing_type AS ENUM ('stay', 'car', 'bike', 'experience');

-- Create enum for booking status
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'cancelled', 'completed');

-- Create enum for payment status
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  profile_image TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  wallet_balance DECIMAL(10, 2) DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  last_login TIMESTAMPTZ
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create stays table
CREATE TABLE public.stays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price_per_night DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  amenities JSONB DEFAULT '[]',
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  max_guests INTEGER NOT NULL,
  bedrooms INTEGER,
  bathrooms INTEGER,
  property_type TEXT,
  check_in_time TIME,
  check_out_time TIME,
  cancellation_policy TEXT,
  availability_status BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  discounts JSONB,
  verified_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_count INTEGER DEFAULT 0,
  last_booked_at TIMESTAMPTZ
);

ALTER TABLE public.stays ENABLE ROW LEVEL SECURITY;

-- Create cars table
CREATE TABLE public.cars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  vehicle_type TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  seating_capacity INTEGER,
  transmission TEXT,
  fuel_type TEXT,
  mileage_limit INTEGER,
  amenities JSONB DEFAULT '[]',
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  availability_status BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  discounts JSONB,
  verified_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_count INTEGER DEFAULT 0,
  last_booked_at TIMESTAMPTZ
);

ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;

-- Create bikes table
CREATE TABLE public.bikes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price_per_day DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  vehicle_type TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  engine_capacity INTEGER,
  mileage_limit INTEGER,
  helmet_included BOOLEAN DEFAULT true,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  availability_status BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  discounts JSONB,
  verified_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_count INTEGER DEFAULT 0,
  last_booked_at TIMESTAMPTZ
);

ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;

-- Create experiences table
CREATE TABLE public.experiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT NOT NULL,
  price_per_person DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  duration TEXT,
  group_size INTEGER,
  itinerary JSONB,
  inclusions TEXT[] DEFAULT '{}',
  exclusions TEXT[] DEFAULT '{}',
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  images TEXT[] DEFAULT '{}',
  rating DECIMAL(3, 2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  availability_status BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  featured BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  slug TEXT UNIQUE,
  tags TEXT[] DEFAULT '{}',
  discounts JSONB,
  verified_by UUID REFERENCES auth.users(id),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  booking_count INTEGER DEFAULT 0,
  last_booked_at TIMESTAMPTZ
);

ALTER TABLE public.experiences ENABLE ROW LEVEL SECURITY;

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID NOT NULL,
  listing_type public.listing_type NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  payment_status public.payment_status DEFAULT 'pending',
  payment_method TEXT,
  booking_status public.booking_status DEFAULT 'pending',
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reviewed BOOLEAN DEFAULT false,
  transaction_id TEXT,
  guests_count INTEGER DEFAULT 1,
  notes TEXT
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID NOT NULL,
  listing_type public.listing_type NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  reply_from_host TEXT,
  images TEXT[] DEFAULT '{}'
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Create wishlists table
CREATE TABLE public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID NOT NULL,
  listing_type public.listing_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, listing_id, listing_type)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- Create listing_questions table
CREATE TABLE public.listing_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID NOT NULL,
  listing_type public.listing_type NOT NULL,
  question TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  is_answered BOOLEAN DEFAULT false
);

ALTER TABLE public.listing_questions ENABLE ROW LEVEL SECURITY;

-- Create question_answers table
CREATE TABLE public.question_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.listing_questions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.question_answers ENABLE ROW LEVEL SECURITY;

-- Create blog_categories table
CREATE TABLE public.blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

-- Create blog_posts table
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  views_count INTEGER DEFAULT 0,
  reading_time INTEGER
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stays_updated_at BEFORE UPDATE ON public.stays FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cars_updated_at BEFORE UPDATE ON public.cars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bikes_updated_at BEFORE UPDATE ON public.bikes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_experiences_updated_at BEFORE UPDATE ON public.experiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_question_answers_updated_at BEFORE UPDATE ON public.question_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for stays
CREATE POLICY "Anyone can view available stays" ON public.stays FOR SELECT USING (availability_status = true OR host_id = auth.uid());
CREATE POLICY "Hosts can insert their own stays" ON public.stays FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their own stays" ON public.stays FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their own stays" ON public.stays FOR DELETE USING (auth.uid() = host_id);

-- RLS Policies for cars
CREATE POLICY "Anyone can view available cars" ON public.cars FOR SELECT USING (availability_status = true OR host_id = auth.uid());
CREATE POLICY "Hosts can insert their own cars" ON public.cars FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their own cars" ON public.cars FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their own cars" ON public.cars FOR DELETE USING (auth.uid() = host_id);

-- RLS Policies for bikes
CREATE POLICY "Anyone can view available bikes" ON public.bikes FOR SELECT USING (availability_status = true OR host_id = auth.uid());
CREATE POLICY "Hosts can insert their own bikes" ON public.bikes FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their own bikes" ON public.bikes FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their own bikes" ON public.bikes FOR DELETE USING (auth.uid() = host_id);

-- RLS Policies for experiences
CREATE POLICY "Anyone can view available experiences" ON public.experiences FOR SELECT USING (availability_status = true OR host_id = auth.uid());
CREATE POLICY "Hosts can insert their own experiences" ON public.experiences FOR INSERT WITH CHECK (auth.uid() = host_id);
CREATE POLICY "Hosts can update their own experiences" ON public.experiences FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their own experiences" ON public.experiences FOR DELETE USING (auth.uid() = host_id);

-- RLS Policies for bookings
CREATE POLICY "Users can view their own bookings" ON public.bookings FOR SELECT USING (auth.uid() = user_id OR auth.uid() = host_id);
CREATE POLICY "Users can create their own bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bookings" ON public.bookings FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = host_id);

-- RLS Policies for reviews
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews for their bookings" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for wishlists
CREATE POLICY "Users can view their own wishlists" ON public.wishlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own wishlists" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for listing_questions
CREATE POLICY "Anyone can view questions" ON public.listing_questions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can ask questions" ON public.listing_questions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for question_answers
CREATE POLICY "Anyone can view answers" ON public.question_answers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can answer questions" ON public.question_answers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for blog_categories
CREATE POLICY "Anyone can view blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage blog categories" ON public.blog_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING (status = 'published' OR author_id = auth.uid());
CREATE POLICY "Authors can manage their own blog posts" ON public.blog_posts FOR ALL USING (auth.uid() = author_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_stays_host_id ON public.stays(host_id);
CREATE INDEX idx_stays_location ON public.stays(location);
CREATE INDEX idx_cars_host_id ON public.cars(host_id);
CREATE INDEX idx_bikes_host_id ON public.bikes(host_id);
CREATE INDEX idx_experiences_host_id ON public.experiences(host_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_listing_id ON public.bookings(listing_id);
CREATE INDEX idx_reviews_listing_id ON public.reviews(listing_id);
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_blog_posts_author_id ON public.blog_posts(author_id);