# Xplorwing - Complete Platform Documentation

## Project Identity

| Field | Value |
|-------|-------|
| **Name** | Xplorwing |
| **Tagline** | India's Social-First Travel & Hospitality Marketplace |
| **Target Market** | India (₹ INR currency, Indian locations) |
| **Project URL** | https://lovable.dev/projects/652dce9b-7f3f-43ad-9834-1c1ae03c9bcb |

---

## Architecture Overview

### Dual-Frontend Model

Xplorwing operates two distinct booking channels with different commission structures:

| Frontend | Purpose | Commission |
|----------|---------|------------|
| **Marketplace** | Curated, approved travel services visible on main platform | 20% |
| **Link-in-Bio** | Individual provider booking pages with custom branding | 10% |

This architecture allows service providers to either list on the main marketplace for maximum visibility or create their own branded booking pages for direct customer relationships.

---

## Technology Stack

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tool & dev server |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Component library |
| Framer Motion | Animations & transitions |
| Zustand | Global state management |
| React Query (TanStack) | Server state & caching |
| React Router DOM v6 | Client-side routing |

### Backend (Lovable Cloud / Supabase)

| Technology | Purpose |
|------------|---------|
| PostgreSQL | Primary database |
| Supabase Auth | Authentication (Email, OAuth) |
| Supabase Storage | File storage (images, documents) |
| Edge Functions | Serverless backend logic (Deno) |
| Row-Level Security | Database access control |

---

## Design System

### Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--background` | `#FFFEF5` (Light Ivory) | Page backgrounds |
| `--primary` | `#013220` (Dark Forest Green) | Accents, CTAs, branding |
| `--foreground` | Dark text | Primary text content |
| `--muted` | Subtle gray | Secondary text, borders |
| `--accent` | Forest green variants | Interactive elements |

### UI Characteristics

- **Glassmorphism:** Semi-transparent overlays for navigation and modals
- **Rounded Corners:** Consistent border-radius throughout
- **Microinteractions:** Subtle animations via Framer Motion
- **Mega Menu:** Card-based navigation with 90% opacity
- **Aesthetic:** Premium, nature-inspired, calm visual identity

### Typography

- Display headings for hero sections
- Clean, readable body text
- Consistent font scaling across breakpoints

---

## Database Schema

### Enums

```sql
-- Type of listing
create type public.listing_type as enum ('stay', 'car', 'bike', 'experience', 'hotel', 'resort');

-- Booking lifecycle states
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'completed');

-- Payment states
create type public.payment_status as enum ('pending', 'paid', 'refunded', 'failed');

-- User role types
create type public.app_role as enum ('admin', 'moderator', 'host', 'user');
```

### Core Tables

#### User Management & Identity

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | Primary single source of truth for user info | `id`, `full_name`, `avatar_url`, `phone`, `kyc_status` |
| `user_roles` | Role assignments (separate for security) | `user_id`, `role` (app_role enum) |
| `phone_auth_users`| Phone-to-user mappings (WhatsApp auth) | `phone`, `user_id`, `last_login_at` |
| `phone_otp_sessions`| Temporary OTP state & rate-limiting | `phone`, `otp_hash`, `expires_at`, `attempts` |
| `user_documents` | KYC documents & identity verification | `user_id`, `document_type`, `status` |

#### Listings

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `stays` | Homestay/property listings | `host_id`, `title`, `slug`, `location`, `price_per_night`, `max_guests`, `bedrooms`, `bathrooms`, `is_active` |
| `hotels` | Hotel property listings | `host_id`, `title`, `slug`, `location`, `price_per_night`, `max_guests`, `bedrooms`, `bathrooms`, `is_active` |
| `resorts` | Resort property listings | `host_id`, `title`, `slug`, `location`, `price_per_night`, `max_guests`, `bedrooms`, `bathrooms`, `is_active` |
| `cars` | Car rental listings | `host_id`, `make`, `model`, `price_per_day`, `fuel_type`, `transmission`, `seats`, `is_active` |
| `bikes` | Bike/motorcycle rentals | `host_id`, `make`, `model`, `price_per_day`, `engine_cc`, `bike_type`, `is_active` |
| `experiences` | Tours and activities | `host_id`, `title`, `slug`, `location`, `price_per_person`, `duration`, `max_guests`, `is_active` |

#### Marketing & Promotions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `host_coupons` | Discount campaigns | `host_id`, `code`, `discount_type`, `discount_value`, `is_active` |
| `coupon_rules` | Coupon constraints | `coupon_id`, `min_booking_amount`, `valid_from`, `valid_until` |

#### Transactions

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `bookings` | All reservations | `user_id`, `listing_id`, `listing_type`, `host_id`, `start_date`, `end_date`, `guests`, `total_amount`, `commission_amount`, `status`, `payment_status`, `booking_source` |
| `reviews` | User ratings & feedback | `user_id`, `listing_id`, `listing_type`, `booking_id`, `rating` (1-5), `comment`, `created_at` |

#### User Features

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `wishlists` | Saved/favorited listings | `user_id`, `listing_id`, `listing_type`, `created_at` |
| `notifications` | User alerts & updates | `user_id`, `title`, `message`, `type`, `read`, `created_at` |

#### Content

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `blog_posts` | Marketing content | `title`, `slug`, `content`, `excerpt`, `featured_image`, `author_id`, `category_id`, `published_at` |
| `blog_categories` | Blog organization | `name`, `slug`, `description` |

---

## Route Structure

### Public Routes

| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Index` | Homepage with hero, categories, featured listings |
| `/stays` | `Stays` | Browse all homestay listings |
| `/stays/:id` | `StayDetail` | Individual stay details & booking |
| `/hotels` | `Hotels` | Browse all hotel listings |
| `/hotels/:id` | `StayDetail` | Individual hotel details & booking |
| `/resorts` | `Resorts` | Browse all resort listings |
| `/resorts/:id` | `StayDetail` | Individual resort details & booking |
| `/cars` | `Cars` | Browse all car rentals |
| `/cars/:id` | `CarDetail` | Individual car details & booking |
| `/bikes` | `Bikes` | Browse all bike rentals |
| `/bikes/:id` | `BikeDetail` | Individual bike details & booking |
| `/experiences` | `Experiences` | Browse all tours/activities |
| `/experiences/:id` | `ExperienceDetail` | Individual experience details & booking |
| `/destinations` | `Destinations` | Browse popular travel destinations |
| `/destinations/:name` | `DestinationDetail` | Destination-specific services |
| `/auth` | `Auth` | Unified login & registration |
| `/about` | `AboutUs` | Company information |
| `/terms` | `Terms` | Terms of Service and legal compliance |
| `/careers` | `Careers` | Job opportunities |
| `/blog` | `Blog` | Content articles |
| `/help` | `HelpCenter` | FAQs and customer support |

### Host Dashboard Routes (Protected)

| Path | Component | Description |
|------|-----------|-------------|
| `/host` | `HostDashboard` | Overview with key metrics |
| `/host/stays` | `HostStays` | Manage stay listings |
| `/host/hotels` | `HostHotels` | Manage hotel listings |
| `/host/resorts` | `HostResorts` | Manage resort listings |
| `/host/cars` | `HostCars` | Manage car listings |
| `/host/bikes` | `HostBikes` | Manage bike listings |
| `/host/experiences` | `HostExperiences` | Manage experience listings |
| `/host/bookings` | `HostBookings` | View and manage bookings |
| `/host/earnings` | `HostEarnings` | Revenue analytics & reports |
| `/host/coupons` | `HostCoupons` | Coupon generation and rules setup |
| `/host/link` | `HostLinkInBio` | Link-in-Bio page generator |
| `/host/blog-posts` | `HostBlogPosts` | Content management system |
| `/host/settings` | `HostSettings` | Profile & account preferences |

### Future Routes (Planned)

| Path | Description |
|------|-------------|
| `/p/:slug` | Public Link-in-Bio page for hosts |
| `/admin` | Admin dashboard |
| `/messages` | In-app messaging |

---

## Feature Specifications

### 1. Marketplace Browsing

**Capabilities:**
- Category-based navigation (Stays, Cars, Bikes, Experiences)
- Location-based search with autocomplete
- Advanced filtering (price range, amenities, ratings, availability)
- Wishlist functionality for saving favorites
- Responsive grid/list views

**User Flow:**
1. User browses categories or searches
2. Applies filters to narrow results
3. Views listing details
4. Adds to wishlist or proceeds to booking

### 2. Host Dashboard

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `DashboardLayout` | `src/components/dashboard/DashboardLayout.tsx` | Sidebar navigation, responsive layout |
| `DashboardOverview` | `src/components/dashboard/DashboardOverview.tsx` | Key metrics, recent activity |
| `ListingsManager` | `src/components/dashboard/ListingsManager.tsx` | CRUD for all listing types |
| `BookingsManager` | `src/components/dashboard/BookingsManager.tsx` | Booking status, commission tracking |
| `EarningsTracker` | `src/components/dashboard/EarningsTracker.tsx` | Revenue charts, payouts |
| `LinkInBioGenerator` | `src/components/dashboard/LinkInBioGenerator.tsx` | Page customization tool |

**Features:**
- Real-time booking notifications
- Commission breakdown per booking
- Monthly/yearly earnings reports
- Listing performance analytics

### 3. Link-in-Bio System

**Customization Options:**
- Business name & custom slug (`/p/:slug`)
- Theme selection: Forest, Ocean, Sunset, Minimal, Dark
- Logo/avatar upload
- Social media links (Instagram, Facebook, WhatsApp, YouTube)
- Featured listings selection
- Contact information display

**Preview:**
- Live mobile-optimized preview during editing
- Theme switching with instant feedback

### 4. Booking Flow

**Steps:**
1. Select dates (check-in/check-out or rental period)
2. Specify guest/passenger count
3. Review price breakdown (base + taxes + fees)
4. Confirm booking details
5. Payment processing
6. Confirmation & notifications

**Price Calculation:**
```typescript
// Example for stays
const basePrice = pricePerNight * numberOfNights;
const serviceFee = basePrice * 0.10; // 10% service fee
const taxes = basePrice * 0.18; // 18% GST
const total = basePrice + serviceFee + taxes;
```

### 5. Authentication

**Methods:**
- **Primary:** WhatsApp OTP-based Authentication (Mobile Number)
  - Uses `send-whatsapp-otp` Supabase Edge Function for token creation and delivery.
  - Implements format-agnostic phone mapping logic to prevent duplicate accounts via `phone_auth_users`.
- Email/Password with dynamic signup vs sign-in conflict resolution.
- OAuth Providers (Google Active, unified account linking supported).
- **Identity Linking:** Deep Supabase integration allowing manual user identity linking (e.g. associating Google with an existing WhatsApp-created profile) under a unified `public.profiles` source of truth.

**Security:**
- JWT-based sessions
- Automatic token refresh
- Protected route guards
- Role-based access control

---

## Commission & Pricing Model

### Commission Rates

```typescript
// src/types/database.ts
export const COMMISSION_RATES = {
  marketplace: 20, // 20% for marketplace bookings
  link_in_bio: 10, // 10% for link-in-bio bookings
} as const;
```

### Subscription Tiers

```typescript
export const SUBSCRIPTION_PRICING = {
  free: 0,        // Basic Link-in-Bio features
  premium: 999,   // ₹999/month - Advanced customization
} as const;
```

### Commission Calculation

```typescript
function calculateCommission(
  totalAmount: number,
  bookingSource: 'marketplace' | 'link_in_bio'
): number {
  const rate = COMMISSION_RATES[bookingSource];
  return (totalAmount * rate) / 100;
}

// Example:
// Marketplace booking of ₹5,000 → ₹1,000 commission (20%)
// Link-in-Bio booking of ₹5,000 → ₹500 commission (10%)
```

---

## Data Hooks Reference

### Location: `src/hooks/useListings.ts`

#### Listing Queries

```typescript
// Fetch all with optional filters
useStays(options?: { location?: string; minPrice?: number; maxPrice?: number })
useCars(options?: { ... })
useBikes(options?: { ... })
useExperiences(options?: { ... })

// Fetch single by ID
useStay(id: string)
useCar(id: string)
useBike(id: string)
useExperience(id: string)

// Fetch single by slug (for SEO-friendly URLs)
useStayBySlug(slug: string)
useCarBySlug(slug: string)
useBikeBySlug(slug: string)
useExperienceBySlug(slug: string)
```

#### Host-Specific Queries

```typescript
useHostStays(hostId: string)
useHostCars(hostId: string)
useHostBikes(hostId: string)
useHostExperiences(hostId: string)
```

#### Booking Operations

```typescript
useUserBookings(userId: string)      // Guest's bookings
useHostBookings(hostId: string)      // Host's received bookings
useBooking(id: string)               // Single booking details
useCreateBooking()                   // Mutation hook
useUpdateBookingStatus()             // Status change mutation
```

#### User Features

```typescript
// Wishlist
useWishlist(userId: string)
useIsInWishlist(userId: string, listingId: string)
useAddToWishlist()
useRemoveFromWishlist()

// Profile
useProfile(userId: string)
useUpdateProfile()

// Notifications
useNotifications(userId: string)
useUnreadNotificationCount(userId: string)
useMarkNotificationAsRead()
```

#### Role Verification

```typescript
useIsAdmin(userId: string)     // Returns boolean
useIsHost(userId: string)      // Returns boolean
useIsModerator(userId: string) // Returns boolean
```

---

## Security Implementation

### Row-Level Security (RLS)

All tables have RLS enabled to ensure data isolation and access control.

#### Role Check Function

```sql
-- Prevents recursive RLS issues by using SECURITY DEFINER
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;
```

#### Example RLS Policies

```sql
-- Users can only view their own bookings
create policy "Users can view own bookings"
on public.bookings for select
to authenticated
using (user_id = auth.uid());

-- Hosts can view bookings for their listings
create policy "Hosts can view their listing bookings"
on public.bookings for select
to authenticated
using (host_id = auth.uid());

-- Only admins can delete listings
create policy "Admins can delete any listing"
on public.stays for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));
```

### Security Best Practices

1. **Role Separation:** Roles stored in `user_roles` table, NOT in `profiles`
2. **Server-Side Validation:** Never trust client-side role checks
3. **SECURITY DEFINER Functions:** Bypass RLS safely for role checks
4. **Input Validation:** All user inputs validated before database operations

---

## Project Structure

```
xplorwing/
├── public/
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── src/
│   ├── assets/                      # Static images
│   │   ├── logo.png
│   │   ├── hero-travel.jpg
│   │   ├── categories/
│   │   ├── stays/
│   │   └── vehicles/
│   │
│   ├── components/
│   │   ├── ui/                      # shadcn/ui primitives
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── footer-section.tsx
│   │   │   └── ... (40+ components)
│   │   │
│   │   ├── dashboard/               # Host dashboard components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── DashboardOverview.tsx
│   │   │   ├── ListingsManager.tsx
│   │   │   ├── BookingsManager.tsx
│   │   │   ├── EarningsTracker.tsx
│   │   │   └── LinkInBioGenerator.tsx
│   │   │
│   │   ├── Header.tsx               # Main navigation
│   │   ├── Footer.tsx               # Site footer
│   │   ├── MegaMenu.tsx             # Category navigation
│   │   ├── SearchBar.tsx            # Search functionality
│   │   ├── CategoryCard.tsx         # Category display
│   │   ├── ListingCard.tsx          # Listing preview card
│   │   ├── Marquee.tsx              # Scrolling announcements
│   │   ├── ScrollToTop.tsx          # Scroll restoration
│   │   └── ThemeProvider.tsx        # Dark/light mode
│   │
│   ├── hooks/
│   │   ├── useAuth.tsx              # Authentication state
│   │   ├── useListings.ts           # Data fetching (React Query)
│   │   ├── use-mobile.tsx           # Responsive detection
│   │   └── use-toast.ts             # Toast notifications
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts            # Supabase client instance
│   │       └── types.ts             # Auto-generated TypeScript types
│   │
│   ├── lib/
│   │   ├── utils.ts                 # Utility functions (cn, etc.)
│   │   └── supabase-helpers.ts      # Database query functions
│   │
│   ├── pages/
│   │   ├── Index.tsx                # Homepage
│   │   ├── Login.tsx                # Authentication
│   │   ├── Signup.tsx               # Registration
│   │   ├── Stays.tsx                # Stays listing
│   │   ├── StayDetail.tsx           # Individual stay
│   │   ├── Cars.tsx                 # Cars listing
│   │   ├── CarDetail.tsx            # Individual car
│   │   ├── Bikes.tsx                # Bikes listing
│   │   ├── BikeDetail.tsx           # Individual bike
│   │   ├── Experiences.tsx          # Experiences listing
│   │   ├── ExperienceDetail.tsx     # Individual experience
│   │   ├── AboutUs.tsx              # About page
│   │   ├── Careers.tsx              # Careers page
│   │   ├── Blog.tsx                 # Blog listing
│   │   ├── HelpCenter.tsx           # Support/FAQ
│   │   ├── NotFound.tsx             # 404 page
│   │   │
│   │   └── Host Dashboard Pages
│   │       ├── HostDashboard.tsx
│   │       ├── HostStays.tsx
│   │       ├── HostCars.tsx
│   │       ├── HostBikes.tsx
│   │       ├── HostExperiences.tsx
│   │       ├── HostBookings.tsx
│   │       ├── HostEarnings.tsx
│   │       ├── HostLinkInBio.tsx
│   │       └── HostSettings.tsx
│   │
│   ├── types/
│   │   └── database.ts              # TypeScript types & helpers
│   │
│   ├── App.tsx                      # Root component & routing
│   ├── App.css                      # Global styles
│   ├── index.css                    # Tailwind imports & CSS vars
│   ├── main.tsx                     # React entry point
│   └── vite-env.d.ts                # Vite type declarations
│
├── supabase/
│   ├── config.toml                  # Supabase configuration
│   └── migrations/                  # Database migrations
│
├── Configuration Files
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── components.json             # shadcn/ui config
│   ├── postcss.config.js
│   └── eslint.config.js
│
├── README.md
└── DOCUMENTATION.md                # This file
```

---

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Core UI components
- [x] Database schema design
- [x] Authentication system
- [x] Basic listing pages
- [x] Host dashboard structure

### Phase 2: Core Features (In Progress & Iterating)
- [x] Public Link-in-Bio page renderer (`/p/:slug`) with Themes & robust QR Code Generator.
- [x] Unified Authentication UI / WhatsApp OTP integration.
- [x] User KYC Onboarding & real-time caching synchronization with Profile Dashboard.
- [ ] Listing creation forms with image upload
- [ ] Complete booking flow
- [ ] Review & rating system

### Phase 3: Payments
- [x] Razorpay environment setup (secured and rotated keys)
- [ ] Host payout system
- [ ] Invoice generation
- [ ] Refund handling

### Phase 4: Growth
- [ ] Admin dashboard with approval workflows
- [ ] Analytics & reporting
- [ ] SEO optimization
- [ ] Email notifications (transactional)

### Phase 5: Expansion
- [ ] In-app messaging between hosts and guests
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Additional payment methods

---

## API Reference

### Authentication (`src/hooks/useAuth.tsx`)

```typescript
const {
  user,           // Current user object or null
  session,        // Current session or null
  loading,        // Loading state boolean
  signUp,         // (email, password, fullName) => Promise
  signIn,         // (email, password) => Promise
  signInWithProvider, // (provider) => Promise
  signOut,        // () => Promise
} = useAuth();
```

### Database Helpers (`src/lib/supabase-helpers.ts`)

All database operations are centralized here with proper error handling and type safety.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

---

## Contributing

1. Follow the existing code style and patterns
2. Use TypeScript strictly (no `any` types)
3. Implement RLS policies for new tables
4. Write descriptive commit messages
5. Test on mobile viewports before submitting

---

## License

Proprietary - All rights reserved.

---

*Last Updated: April 2026*
