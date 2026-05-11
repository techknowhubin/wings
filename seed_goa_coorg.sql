-- Create the tables if they don't exist (mirroring the stays table structure)
CREATE TABLE IF NOT EXISTS hotels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT,
    description TEXT,
    location TEXT,
    price_per_night NUMERIC,
    currency TEXT DEFAULT 'INR',
    rating NUMERIC,
    total_reviews INTEGER DEFAULT 0,
    max_guests INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    property_type TEXT DEFAULT 'hotel',
    check_in_time TEXT,
    check_out_time TEXT,
    cancellation_policy TEXT,
    amenities JSONB,
    images TEXT[],
    slug TEXT,
    availability_status BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    host_id UUID
);

CREATE TABLE IF NOT EXISTS resorts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT,
    description TEXT,
    location TEXT,
    price_per_night NUMERIC,
    currency TEXT DEFAULT 'INR',
    rating NUMERIC,
    total_reviews INTEGER DEFAULT 0,
    max_guests INTEGER,
    bedrooms INTEGER,
    bathrooms INTEGER,
    property_type TEXT DEFAULT 'resort',
    check_in_time TEXT,
    check_out_time TEXT,
    cancellation_policy TEXT,
    amenities JSONB,
    images TEXT[],
    slug TEXT,
    availability_status BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    host_id UUID
);

-- Safely drop NOT NULL constraints on host_id for mock data insertion
ALTER TABLE IF EXISTS stays ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE IF EXISTS hotels ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE IF EXISTS resorts ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE IF EXISTS cars ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE IF EXISTS bikes ALTER COLUMN host_id DROP NOT NULL;
ALTER TABLE IF EXISTS experiences ALTER COLUMN host_id DROP NOT NULL;

-- Delete all existing entries
DELETE FROM stays;
DELETE FROM hotels;
DELETE FROM resorts;
DELETE FROM cars;
DELETE FROM bikes;
DELETE FROM experiences;

-- Goa Homestays (4)
INSERT INTO stays (title, location, price_per_night, currency, rating, max_guests, bedrooms, bathrooms, images, slug, property_type, availability_status, featured) VALUES
('Goa Heritage Homestay', 'Goa', 2500, 'INR', 4.8, 4, 2, 2, ARRAY['goa-beach-villa.jpg'], 'goa-heritage-homestay', 'homestay', true, true),
('Sunset View Guest House', 'Goa', 1800, 'INR', 4.6, 2, 1, 1, ARRAY['goa-beach-villa.jpg'], 'sunset-view-guest-house', 'homestay', true, false),
('Portuguese Villa Homestay', 'Goa', 3200, 'INR', 4.9, 6, 3, 3, ARRAY['goa-beach-villa.jpg'], 'portuguese-villa-homestay', 'homestay', true, false),
('Anjuna Backpacker Home', 'Goa', 1200, 'INR', 4.5, 2, 1, 1, ARRAY['goa-beach-villa.jpg'], 'anjuna-backpacker-home', 'homestay', true, false);

-- Goa Hotels (4)
INSERT INTO hotels (title, location, price_per_night, currency, rating, max_guests, bedrooms, bathrooms, images, slug, property_type, availability_status, featured) VALUES
('Goa Grand Hotel', 'Goa', 4500, 'INR', 4.7, 3, 1, 1, ARRAY['goa-beach-villa.jpg'], 'goa-grand-hotel', 'hotel', true, true),
('Seaside Inn', 'Goa', 3800, 'INR', 4.3, 2, 1, 1, ARRAY['goa-beach-villa.jpg'], 'seaside-inn', 'hotel', true, false),
('Baga Beach Boutique Hotel', 'Goa', 5500, 'INR', 4.8, 4, 1, 1, ARRAY['goa-beach-villa.jpg'], 'baga-beach-boutique-hotel', 'hotel', true, false),
('Panjim City Hotel', 'Goa', 3000, 'INR', 4.2, 2, 1, 1, ARRAY['goa-beach-villa.jpg'], 'panjim-city-hotel', 'hotel', true, false);

-- Goa Resorts (4)
INSERT INTO resorts (title, location, price_per_night, currency, rating, max_guests, bedrooms, bathrooms, images, slug, property_type, availability_status, featured) VALUES
('Tropical Sands Resort', 'Goa', 8500, 'INR', 4.9, 4, 1, 2, ARRAY['goa-beach-villa.jpg'], 'tropical-sands-resort', 'resort', true, true),
('Palm Grove Spa Resort', 'Goa', 7200, 'INR', 4.8, 3, 1, 1, ARRAY['goa-beach-villa.jpg'], 'palm-grove-spa-resort', 'resort', true, false),
('Oceanic Luxury Resort', 'Goa', 12000, 'INR', 5.0, 6, 2, 2, ARRAY['goa-beach-villa.jpg'], 'oceanic-luxury-resort', 'resort', true, true),
('Candolim Beach Resort', 'Goa', 6500, 'INR', 4.6, 2, 1, 1, ARRAY['goa-beach-villa.jpg'], 'candolim-beach-resort', 'resort', true, false);

-- Coorg Homestays (4)
INSERT INTO stays (title, location, price_per_night, currency, rating, max_guests, bedrooms, bathrooms, images, slug, property_type, availability_status, featured) VALUES
('Coorg Coffee Estate Homestay', 'Coorg', 3500, 'INR', 4.9, 4, 2, 2, ARRAY['munnar-tea-cottage.jpg'], 'coorg-coffee-estate', 'homestay', true, true),
('Misty Hills Guest House', 'Coorg', 2800, 'INR', 4.7, 3, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'misty-hills-coorg', 'homestay', true, false),
('River Stream Homestay', 'Coorg', 2200, 'INR', 4.5, 2, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'river-stream-coorg', 'homestay', true, false),
('Kodagu Traditional Home', 'Coorg', 4000, 'INR', 4.8, 6, 3, 3, ARRAY['munnar-tea-cottage.jpg'], 'kodagu-traditional-home', 'homestay', true, false);

-- Coorg Hotels (4)
INSERT INTO hotels (title, location, price_per_night, currency, rating, max_guests, bedrooms, bathrooms, images, slug, property_type, availability_status, featured) VALUES
('Madikeri Town Hotel', 'Coorg', 3000, 'INR', 4.3, 2, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'madikeri-town-hotel', 'hotel', true, false),
('Valley View Hotel', 'Coorg', 4500, 'INR', 4.6, 3, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'valley-view-coorg', 'hotel', true, true),
('Coorg Grand Hotel', 'Coorg', 5200, 'INR', 4.7, 4, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'coorg-grand-hotel', 'hotel', true, false),
('Raja Seat Boutique', 'Coorg', 3800, 'INR', 4.5, 2, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'raja-seat-boutique', 'hotel', true, false);

-- Coorg Resorts (4)
INSERT INTO resorts (title, location, price_per_night, currency, rating, max_guests, bedrooms, bathrooms, images, slug, property_type, availability_status, featured) VALUES
('Coorg Wilderness Resort', 'Coorg', 15000, 'INR', 4.9, 4, 2, 2, ARRAY['munnar-tea-cottage.jpg'], 'coorg-wilderness-resort', 'resort', true, true),
('Spice Plantation Retreat', 'Coorg', 9500, 'INR', 4.8, 3, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'spice-plantation-retreat', 'resort', true, false),
('Eagle Eye Resort', 'Coorg', 11000, 'INR', 4.7, 2, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'eagle-eye-resort', 'resort', true, false),
('Misty Woods Resort', 'Coorg', 8000, 'INR', 4.6, 4, 1, 1, ARRAY['munnar-tea-cottage.jpg'], 'misty-woods-resort', 'resort', true, false);

-- Goa Cars (4)
INSERT INTO cars (title, location, price_per_day, currency, rating, images, availability_status, featured) VALUES
('Honda City Automatic', 'Goa', 2500, 'INR', 4.8, ARRAY['honda-city.jpg'], true, true),
('Maruti Swift Hatchback', 'Goa', 1500, 'INR', 4.5, ARRAY['honda-city.jpg'], true, false),
('Toyota Innova Crysta', 'Goa', 4500, 'INR', 4.9, ARRAY['honda-city.jpg'], true, false),
('Hyundai Creta SUV', 'Goa', 3000, 'INR', 4.7, ARRAY['honda-city.jpg'], true, false);

-- Coorg Cars (4)
INSERT INTO cars (title, location, price_per_day, currency, rating, images, availability_status, featured) VALUES
('Tata Nexon SUV', 'Coorg', 2800, 'INR', 4.7, ARRAY['honda-city.jpg'], true, true),
('Mahindra Thar 4x4', 'Coorg', 4500, 'INR', 4.9, ARRAY['honda-city.jpg'], true, false),
('Maruti Dzire Sedan', 'Coorg', 1800, 'INR', 4.4, ARRAY['honda-city.jpg'], true, false),
('Toyota Fortuner', 'Coorg', 6500, 'INR', 4.8, ARRAY['honda-city.jpg'], true, false);

-- Goa Bikes (4)
INSERT INTO bikes (title, location, price_per_day, currency, rating, images, availability_status, featured) VALUES
('Royal Enfield Classic 350', 'Goa', 800, 'INR', 4.8, ARRAY['royal-enfield-classic.jpg'], true, true),
('Honda Activa 6G', 'Goa', 400, 'INR', 4.5, ARRAY['royal-enfield-classic.jpg'], true, false),
('Yamaha MT 15', 'Goa', 1000, 'INR', 4.7, ARRAY['royal-enfield-classic.jpg'], true, false),
('Vespa SXL 150', 'Goa', 600, 'INR', 4.6, ARRAY['royal-enfield-classic.jpg'], true, false);

-- Coorg Bikes (4)
INSERT INTO bikes (title, location, price_per_day, currency, rating, images, availability_status, featured) VALUES
('Royal Enfield Himalayan', 'Coorg', 1200, 'INR', 4.9, ARRAY['royal-enfield-classic.jpg'], true, true),
('Bajaj Pulsar 150', 'Coorg', 600, 'INR', 4.4, ARRAY['royal-enfield-classic.jpg'], true, false),
('Honda Dio Scooty', 'Coorg', 400, 'INR', 4.5, ARRAY['royal-enfield-classic.jpg'], true, false),
('TVS Apache RTR 160', 'Coorg', 700, 'INR', 4.6, ARRAY['royal-enfield-classic.jpg'], true, false);

-- Goa Experiences (4)
INSERT INTO experiences (title, location, price_per_person, currency, rating, images, availability_status, featured) VALUES
('Dudhsagar Waterfall Trek', 'Goa', 1500, 'INR', 4.8, ARRAY['experience-featured.jpg'], true, true),
('Agonda Beach Sunset Kayaking', 'Goa', 800, 'INR', 4.9, ARRAY['experience-featured.jpg'], true, false),
('Goan Spice Plantation Tour', 'Goa', 1200, 'INR', 4.6, ARRAY['experience-featured.jpg'], true, false),
('Mandovi River Cruise Dinner', 'Goa', 2000, 'INR', 4.7, ARRAY['experience-featured.jpg'], true, false);

-- Coorg Experiences (4)
INSERT INTO experiences (title, location, price_per_person, currency, rating, images, availability_status, featured) VALUES
('Tadiandamol Peak Trek', 'Coorg', 1800, 'INR', 4.9, ARRAY['experience-featured.jpg'], true, true),
('Coffee Estate Walking Tour', 'Coorg', 500, 'INR', 4.7, ARRAY['experience-featured.jpg'], true, false),
('Dubare Elephant Camp Visit', 'Coorg', 1200, 'INR', 4.8, ARRAY['experience-featured.jpg'], true, false),
('Night Jeep Safari', 'Coorg', 2500, 'INR', 4.6, ARRAY['experience-featured.jpg'], true, false);
