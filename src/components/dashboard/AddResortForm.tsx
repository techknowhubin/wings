import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, X, BedDouble, Ticket, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCreateResort } from '@/hooks/useListings';
import { toast } from 'sonner';
import { createDiscountConfig, generateCouponCode } from '@/lib/discounts';
import { ListingImageUploader } from './ListingImageUploader';
import type { RichAmenities } from '@/lib/listing-helpers';

const propertyTypes = ['Resort', 'Beach Resort', 'Mountain Resort', 'Spa Resort', 'Eco Resort', 'Luxury Resort', 'Heritage Resort'];
const bedTypes = ['King', 'Queen', 'Double', 'Twin', 'Single', 'Bunk', 'Sofa Bed'];

const STANDARD_AMENITIES = [
  { key: 'wifi' as const, label: 'WiFi' },
  { key: 'ac' as const, label: 'Air Conditioning' },
  { key: 'tv' as const, label: 'TV' },
  { key: 'kitchen' as const, label: 'Restaurant / Dining' },
  { key: 'parking' as const, label: 'Free Parking' },
  { key: 'pool' as const, label: 'Swimming Pool' },
  { key: 'petFriendly' as const, label: 'Pet Friendly' },
  { key: 'dedicatedWorkspace' as const, label: 'Meeting Rooms' },
  { key: 'selfCheckIn' as const, label: 'Self Check-in' },
  { key: 'freeCancellation' as const, label: 'Free Cancellation' },
  { key: 'breakfast' as const, label: 'Breakfast Included' },
  { key: 'gym' as const, label: 'Gym / Fitness Center' },
];

type AmenityKey = (typeof STANDARD_AMENITIES)[number]['key'];

const amenityFormKey = (k: AmenityKey) =>
  `amenity${k.charAt(0).toUpperCase()}${k.slice(1)}` as keyof FormState;

const emptyBedroom = () => ({ name: '', bedType: 'King', count: '1' });
const emptyCoupon = () => ({ code: '', type: 'percent' as const, value: '' });

interface FormState {
  title: string;
  description: string;
  shortDescription: string;
  location: string;
  state: string;
  city: string;
  fullAddress: string;
  latitude: string;
  longitude: string;
  property_type: string;
  max_guests: string;
  bedrooms: string;
  beds: string;
  bathrooms: string;
  propertySize: string;
  images: string[];
  roomImages: string[];
  amenityWifi: boolean;
  amenityAc: boolean;
  amenityTv: boolean;
  amenityKitchen: boolean;
  amenityParking: boolean;
  amenityPool: boolean;
  amenityPetFriendly: boolean;
  amenityDedicatedWorkspace: boolean;
  amenitySelfCheckIn: boolean;
  amenityFreeCancellation: boolean;
  amenityBreakfast: boolean;
  amenityGym: boolean;
  customAmenities: string[];
  amenityInput: string;
  bedroomDetails: Array<{
    name: string;
    bedType: string;
    count: string;
    description: string;
    photos: string[];
    sizeSqFt: string;
    bathrooms: string;
    occupancyCapacity: string;
    amenities: string[];
    amenityInput: string;
  }>;
  check_in_time: string;
  check_out_time: string;
  houseRules: string;
  healthSafety: string;
  cancellation_policy: string;
  price_per_night: string;
  weeklyPrice: string;
  monthlyPrice: string;
  cleaningFee: string;
  securityDeposit: string;
  hostDiscountPercent: string;
  coupons: Array<{ code: string; type: 'percent' | 'flat'; value: string }>;
  availability_status: boolean;

  // New premium fields
  propertyCategory: string;
  googleMapsUrl: string;
  videos: string[];
  videoInput: string;
  virtualTourUrl: string;

  // Room plans
  planRoomOnly: boolean;
  planFreeBreakfast: boolean;
  planHalfBoard: boolean;
  planAllInclusive: boolean;
  customPlans: string[];
  customPlanInput: string;

  // Pricing additions
  originalPrice: string;
  discountedPrice: string;
  dailyPrice: string;
  taxesAndFees: string;
  offerPercentage: string;
  bookAtZero: boolean;

  // Detailed policies
  policySmokingAllowed: boolean;
  policyPetAllowed: boolean;
  policyChildAllowed: boolean;
  policyChildDescription: string;

  // Nearby Info
  nearbyRestaurants: string[];
  nearbyAttractions: string[];
  nearbyTransport: string[];
  nearbyHospitals: string[];
  nearbyShopping: string[];

  nearbyRestaurantsInput: string;
  nearbyAttractionsInput: string;
  nearbyTransportInput: string;
  nearbyHospitalsInput: string;
  nearbyShoppingInput: string;

  // Host Info
  hostName: string;
  hostPhoto: string;
  hostDescription: string;
  hostIsSuperhost: boolean;
}

export function AddResortForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createResort = useCreateResort();

  const emptyBedroom = () => ({
    name: '',
    bedType: 'King',
    count: '1',
    description: '',
    photos: [] as string[],
    sizeSqFt: '',
    bathrooms: '1',
    occupancyCapacity: '2',
    amenities: [] as string[],
    amenityInput: ''
  });

  const [form, setForm] = useState<FormState>({
    title: '', description: '', shortDescription: '',
    location: '', state: '', city: '', fullAddress: '',
    latitude: '', longitude: '', property_type: 'Resort',
    max_guests: '', bedrooms: '', beds: '', bathrooms: '', propertySize: '',
    images: [], roomImages: [],
    amenityWifi: false, amenityAc: false, amenityTv: false,
    amenityKitchen: false, amenityParking: false, amenityPool: false,
    amenityPetFriendly: false, amenityDedicatedWorkspace: false,
    amenitySelfCheckIn: false, amenityFreeCancellation: false,
    amenityBreakfast: false, amenityGym: false,
    customAmenities: [], amenityInput: '',
    bedroomDetails: [],
    check_in_time: '14:00', check_out_time: '11:00',
    houseRules: '', healthSafety: '', cancellation_policy: 'moderate',
    price_per_night: '', weeklyPrice: '', monthlyPrice: '',
    cleaningFee: '', securityDeposit: '', hostDiscountPercent: '',
    coupons: [],
    availability_status: true,

    // New premium fields
    propertyCategory: 'Premium',
    googleMapsUrl: '',
    videos: [],
    videoInput: '',
    virtualTourUrl: '',

    // Room plans
    planRoomOnly: true,
    planFreeBreakfast: false,
    planHalfBoard: false,
    planAllInclusive: false,
    customPlans: [],
    customPlanInput: '',

    // Pricing additions
    originalPrice: '',
    discountedPrice: '',
    dailyPrice: '',
    taxesAndFees: '',
    offerPercentage: '',
    bookAtZero: false,

    // Detailed policies
    policySmokingAllowed: false,
    policyPetAllowed: false,
    policyChildAllowed: true,
    policyChildDescription: 'Children under 5 stay free when sharing existing bedding.',

    // Nearby Info
    nearbyRestaurants: [],
    nearbyAttractions: [],
    nearbyTransport: [],
    nearbyHospitals: [],
    nearbyShopping: [],

    nearbyRestaurantsInput: '',
    nearbyAttractionsInput: '',
    nearbyTransportInput: '',
    nearbyHospitalsInput: '',
    nearbyShoppingInput: '',

    // Host Info
    hostName: '',
    hostPhoto: '',
    hostDescription: '',
    hostIsSuperhost: false,
  });

  // Initialize bedroom details if empty
  useState(() => {
    setForm(prev => ({
      ...prev,
      bedroomDetails: [emptyBedroom()]
    }));
  });

  const setF = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(p => ({ ...p, [key]: value }));

  const toggleAmenity = (key: AmenityKey, checked: boolean) =>
    setForm(p => ({ ...p, [amenityFormKey(key)]: checked }));

  const addCustomAmenity = () => {
    const val = form.amenityInput.trim();
    if (val && !form.customAmenities.includes(val)) {
      setForm(p => ({ ...p, customAmenities: [...p.customAmenities, val], amenityInput: '' }));
    }
  };

  const updateBedroom = (i: number, field: string, value: string) =>
    setForm(p => ({
      ...p,
      bedroomDetails: p.bedroomDetails.map((b, idx) => idx === i ? { ...b, [field]: value } : b),
    }));

  const updateCoupon = (i: number, field: string, value: string) =>
    setForm(p => ({
      ...p,
      coupons: p.coupons.map((c, idx) => idx === i ? { ...c, [field]: value } : c),
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.location || !form.price_per_night || !form.max_guests) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const richAmenities: RichAmenities = {};
      if (form.amenityWifi) richAmenities.wifi = true;
      if (form.amenityAc) richAmenities.ac = true;
      if (form.amenityTv) richAmenities.tv = true;
      if (form.amenityKitchen) richAmenities.kitchen = true;
      if (form.amenityParking) richAmenities.parking = true;
      if (form.amenityPool) richAmenities.pool = true;
      if (form.amenityPetFriendly) richAmenities.petFriendly = true;
      if (form.amenityDedicatedWorkspace) richAmenities.dedicatedWorkspace = true;
      if (form.amenitySelfCheckIn) richAmenities.selfCheckIn = true;
      if (form.amenityFreeCancellation) richAmenities.freeCancellation = true;
      if (form.amenityBreakfast) richAmenities.breakfast = true;
      if (form.amenityGym) richAmenities.gym = true;
      if (form.customAmenities.length) richAmenities.custom = form.customAmenities;
      if (form.shortDescription) richAmenities.shortDescription = form.shortDescription;
      if (form.state) richAmenities.state = form.state;
      if (form.city) richAmenities.city = form.city;
      if (form.fullAddress) richAmenities.fullAddress = form.fullAddress;
      if (form.propertySize) richAmenities.propertySize = form.propertySize;
      if (form.beds) richAmenities.beds = Number(form.beds);
      if (form.houseRules) richAmenities.houseRules = form.houseRules;
      if (form.healthSafety) richAmenities.healthSafety = form.healthSafety;
      const validRooms = form.bedroomDetails.filter(b => b.name.trim() || Number(b.count) > 0);
      if (validRooms.length) richAmenities.bedroomDetails = validRooms.map(b => ({
        name: b.name,
        bedType: b.bedType,
        count: Number(b.count) || 1,
        description: b.description || undefined,
        photos: b.photos.length > 0 ? b.photos : undefined,
        sizeSqFt: b.sizeSqFt ? Number(b.sizeSqFt) : undefined,
        bathrooms: b.bathrooms ? Number(b.bathrooms) : undefined,
        occupancyCapacity: b.occupancyCapacity ? Number(b.occupancyCapacity) : undefined,
        amenities: b.amenities.length > 0 ? b.amenities : undefined,
      }));
      if (form.roomImages.length) richAmenities.roomImages = form.roomImages;
      if (form.weeklyPrice) richAmenities.weeklyPrice = Number(form.weeklyPrice);
      if (form.monthlyPrice) richAmenities.monthlyPrice = Number(form.monthlyPrice);
      if (form.cleaningFee) richAmenities.cleaningFee = Number(form.cleaningFee);
      if (form.securityDeposit) richAmenities.securityDeposit = Number(form.securityDeposit);

      // Premium listing fields
      if (form.propertyCategory) richAmenities.propertyCategory = form.propertyCategory;
      if (form.googleMapsUrl) richAmenities.googleMapsUrl = form.googleMapsUrl;
      if (form.videos.length) richAmenities.videos = form.videos;
      if (form.virtualTourUrl) richAmenities.virtualTourUrl = form.virtualTourUrl;

      // Room plans
      richAmenities.roomPlans = {
        roomOnly: form.planRoomOnly,
        freeBreakfast: form.planFreeBreakfast,
        halfBoard: form.planHalfBoard,
        allInclusive: form.planAllInclusive,
        customPlans: form.customPlans.length > 0 ? form.customPlans : undefined,
      };

      // Detailed pricing
      if (form.originalPrice) richAmenities.originalPrice = Number(form.originalPrice);
      if (form.discountedPrice) richAmenities.discountedPrice = Number(form.discountedPrice);
      if (form.dailyPrice) richAmenities.dailyPrice = Number(form.dailyPrice);
      if (form.taxesAndFees) richAmenities.taxesAndFees = Number(form.taxesAndFees);
      if (form.offerPercentage) richAmenities.offerPercentage = Number(form.offerPercentage);
      richAmenities.bookAtZero = form.bookAtZero;

      // Policies
      richAmenities.policySmokingAllowed = form.policySmokingAllowed;
      richAmenities.policyPetAllowed = form.policyPetAllowed;
      richAmenities.policyChildAllowed = form.policyChildAllowed;
      if (form.policyChildDescription) richAmenities.policyChildDescription = form.policyChildDescription;

      // Nearby Info
      richAmenities.nearbyInfo = {
        restaurants: form.nearbyRestaurants.length > 0 ? form.nearbyRestaurants : undefined,
        attractions: form.nearbyAttractions.length > 0 ? form.nearbyAttractions : undefined,
        transport: form.nearbyTransport.length > 0 ? form.nearbyTransport : undefined,
        hospitals: form.nearbyHospitals.length > 0 ? form.nearbyHospitals : undefined,
        shopping: form.nearbyShopping.length > 0 ? form.nearbyShopping : undefined,
      };

      // Host Info
      richAmenities.hostInfo = {
        name: form.hostName || undefined,
        photo: form.hostPhoto || undefined,
        description: form.hostDescription || undefined,
        isSuperhost: form.hostIsSuperhost,
      };

      const validCoupons = form.coupons
        .filter(c => c.code.trim() && c.value)
        .map(c => ({ code: c.code, type: c.type, value: Number(c.value) }));
      const discountsConfig = createDiscountConfig(Number(form.hostDiscountPercent || 0), validCoupons);

      await createResort.mutateAsync({
        host_id: user.id,
        title: form.title,
        description: form.description || null,
        location: form.location,
        price_per_night: Number(form.price_per_night),
        max_guests: Number(form.max_guests),
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        property_type: form.property_type || null,
        check_in_time: form.check_in_time || null,
        check_out_time: form.check_out_time || null,
        cancellation_policy: form.cancellation_policy || null,
        availability_status: form.availability_status,
        images: form.images.length > 0 ? form.images : null,
        amenities: Object.keys(richAmenities).length > 0 ? richAmenities : null,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        currency: 'INR',
        discounts: (discountsConfig.hostDiscountPercent > 0 || discountsConfig.coupons.length > 0)
          ? discountsConfig : null,
        slug: null,
        tags: null,
      });
      toast.success('Resort listing created successfully!');
      navigate('/host/resorts');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/resorts')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Resort</h1>
          <p className="text-muted-foreground">Create a new resort listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Resort Name *</Label>
                <Input id="title" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Serenity Beach Resort" />
              </div>
              <div>
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input id="shortDesc" value={form.shortDescription} onChange={e => setF('shortDescription', e.target.value)} placeholder="One-line summary shown on listing cards" />
              </div>
              <div>
                <Label htmlFor="description">Full Description</Label>
                <Textarea id="description" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe your resort in detail..." rows={5} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="property_type">Property Type</Label>
                  <Select value={form.property_type} onValueChange={v => setF('property_type', v)}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="propertyCategory">Property Category</Label>
                  <Select value={form.propertyCategory} onValueChange={v => setF('propertyCategory', v)}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {['Budget', 'Luxury', 'Premium', 'Heritage', 'Standard'].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input id="location" value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Candolim Beach, Goa" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={e => setF('state', e.target.value)} placeholder="e.g. Goa" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={e => setF('city', e.target.value)} placeholder="e.g. North Goa" />
                </div>
              </div>
              <div>
                <Label htmlFor="fullAddress">Full Address</Label>
                <Input id="fullAddress" value={form.fullAddress} onChange={e => setF('fullAddress', e.target.value)} placeholder="Street, Area, PIN code" />
              </div>
              <div>
                <Label htmlFor="googleMapsUrl">Google Maps Link</Label>
                <Input id="googleMapsUrl" value={form.googleMapsUrl} onChange={e => setF('googleMapsUrl', e.target.value)} placeholder="https://maps.google.com/?q=..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" type="number" step="any" value={form.latitude} onChange={e => setF('latitude', e.target.value)} placeholder="15.5489" />
                </div>
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" type="number" step="any" value={form.longitude} onChange={e => setF('longitude', e.target.value)} placeholder="73.7534" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="guests">Max Guests *</Label>
                <Input id="guests" type="number" min={1} value={form.max_guests} onChange={e => setF('max_guests', e.target.value)} placeholder="200" />
              </div>
              <div>
                <Label htmlFor="bedrooms">Villas / Rooms</Label>
                <Input id="bedrooms" type="number" min={0} value={form.bedrooms} onChange={e => setF('bedrooms', e.target.value)} placeholder="80" />
              </div>
              <div>
                <Label htmlFor="beds">Beds</Label>
                <Input id="beds" type="number" min={0} value={form.beds} onChange={e => setF('beds', e.target.value)} placeholder="100" />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input id="bathrooms" type="number" min={0} value={form.bathrooms} onChange={e => setF('bathrooms', e.target.value)} placeholder="80" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="propSize">Property Size</Label>
                <Input id="propSize" value={form.propertySize} onChange={e => setF('propertySize', e.target.value)} placeholder="e.g. 10 acres" />
              </div>
            </CardContent>
          </Card>

          {/* Gallery Photos */}
          <Card>
            <CardHeader><CardTitle>Gallery Photos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">The first image becomes the featured/thumbnail photo.</p>
              <ListingImageUploader
                images={form.images}
                onImagesChange={v => setF('images', v)}
                label="Click to upload resort photos"
                showFeaturedBadge
              />
            </CardContent>
          </Card>

          {/* Room Photos */}
          <Card>
            <CardHeader><CardTitle>Room / Villa Photos</CardTitle></CardHeader>
            <CardContent>
              <ListingImageUploader
                images={form.roomImages}
                onImagesChange={v => setF('roomImages', v)}
                label="Click to upload room / villa interior photos"
                showFeaturedBadge={false}
              />
            </CardContent>
          </Card>

          {/* Videos & Virtual Tour */}
          <Card>
            <CardHeader><CardTitle>Videos & Virtual Tours</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="virtualTourUrl">Virtual Tour URL</Label>
                <Input
                  id="virtualTourUrl"
                  value={form.virtualTourUrl}
                  onChange={e => setF('virtualTourUrl', e.target.value)}
                  placeholder="https://my.matterport.com/show/?m=..."
                />
              </div>
              <div>
                <Label>Video Links</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.videoInput}
                    onChange={e => setF('videoInput', e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = form.videoInput.trim();
                        if (val && !form.videos.includes(val)) {
                          setForm(p => ({ ...p, videos: [...p.videos, val], videoInput: '' }));
                        }
                      }
                    }}
                    placeholder="https://youtube.com/watch?v=... or MP4 URL"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const val = form.videoInput.trim();
                      if (val && !form.videos.includes(val)) {
                        setForm(p => ({ ...p, videos: [...p.videos, val], videoInput: '' }));
                      }
                    }}
                    className="shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.videos.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {form.videos.map((vid, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-secondary/50 rounded px-3 py-1.5 text-xs">
                        <span className="truncate flex-1 mr-2">{vid}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => setForm(p => ({ ...p, videos: p.videos.filter((_, i) => i !== idx) }))}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader><CardTitle>Amenities</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STANDARD_AMENITIES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox
                      checked={form[amenityFormKey(key)] as boolean}
                      onCheckedChange={checked => toggleAmenity(key, Boolean(checked))}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <Label>Custom Amenities</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.amenityInput}
                    onChange={e => setF('amenityInput', e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }}
                    placeholder="e.g. Private Beach, Ayurvedic Spa, Water Sports"
                  />
                  <Button type="button" variant="outline" onClick={addCustomAmenity} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.customAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.customAmenities.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-secondary text-foreground rounded-full px-3 py-1 text-sm">
                        {a}
                        <button type="button" onClick={() => setForm(p => ({ ...p, customAmenities: p.customAmenities.filter((_, idx) => idx !== i) }))} className="text-muted-foreground hover:text-destructive ml-0.5">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sleeping Arrangements */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Villa / Room Types</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, bedroomDetails: [...p.bedroomDetails, emptyBedroom()] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Room Type
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.bedroomDetails.map((b, i) => (
                <div key={i} className="p-4 rounded-lg border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Room Option #{i + 1}</span>
                    {form.bedroomDetails.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.filter((_, idx) => idx !== i) }))}>
                        Remove Room
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Room Name / Type</Label>
                      <Input value={b.name} onChange={e => updateBedroom(i, 'name', e.target.value)} placeholder="e.g. Beach Villa" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Room Description</Label>
                      <Input value={b.description} onChange={e => updateBedroom(i, 'description', e.target.value)} placeholder="e.g. Ocean view villa with patio" className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Bed Type</Label>
                      <Select value={b.bedType} onValueChange={v => updateBedroom(i, 'bedType', v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>{bedTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Number of Beds</Label>
                      <Input type="number" min={1} value={b.count} onChange={e => updateBedroom(i, 'count', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Number of Bathrooms</Label>
                      <Input type="number" min={0} value={b.bathrooms} onChange={e => updateBedroom(i, 'bathrooms', e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Room Size (sq ft)</Label>
                      <Input type="number" min={1} value={b.sizeSqFt} onChange={e => updateBedroom(i, 'sizeSqFt', e.target.value)} placeholder="e.g. 500" className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Occupancy Capacity</Label>
                      <Input type="number" min={1} value={b.occupancyCapacity} onChange={e => updateBedroom(i, 'occupancyCapacity', e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Room Amenities</Label>
                      <div className="flex gap-1 mt-1">
                        <Input
                          value={b.amenityInput}
                          onChange={e => updateBedroom(i, 'amenityInput', e.target.value)}
                          placeholder="e.g. Mini-fridge, Balcony"
                          className="h-8 text-sm"
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = b.amenityInput.trim();
                              if (val && !b.amenities.includes(val)) {
                                setForm(p => ({
                                  ...p,
                                  bedroomDetails: p.bedroomDetails.map((rm, idx) =>
                                    idx === i ? { ...rm, amenities: [...rm.amenities, val], amenityInput: '' } : rm
                                  )
                                }));
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const val = b.amenityInput.trim();
                            if (val && !b.amenities.includes(val)) {
                              setForm(p => ({
                                ...p,
                                bedroomDetails: p.bedroomDetails.map((rm, idx) =>
                                  idx === i ? { ...rm, amenities: [...rm.amenities, val], amenityInput: '' } : rm
                                )
                              }));
                            }
                          }}
                          className="h-8 px-2"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      {b.amenities && b.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {b.amenities.map((amenity, idx) => (
                            <span key={idx} className="inline-flex items-center bg-secondary/80 text-[10px] rounded px-1.5 py-0.5">
                              {amenity}
                              <button
                                type="button"
                                className="ml-1 text-muted-foreground hover:text-destructive"
                                onClick={() => setForm(p => ({
                                  ...p,
                                  bedroomDetails: p.bedroomDetails.map((rm, idx2) =>
                                    idx2 === i ? { ...rm, amenities: rm.amenities.filter((_, aIdx) => aIdx !== idx) } : rm
                                  )
                                }))}
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Room Photo URLs (one per line)</Label>
                    <Textarea
                      value={b.photos.join('\n')}
                      onChange={e => updateBedroom(i, 'photos', e.target.value.split('\n').filter(Boolean))}
                      placeholder="https://images.unsplash.com/...&#10;https://images.unsplash.com/..."
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Policies */}
          <Card>
            <CardHeader><CardTitle>Policies</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="checkin">Check-in Time</Label>
                  <Input id="checkin" type="time" value={form.check_in_time} onChange={e => setF('check_in_time', e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="checkout">Check-out Time</Label>
                  <Input id="checkout" type="time" value={form.check_out_time} onChange={e => setF('check_out_time', e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Cancellation Policy</Label>
                <Select value={form.cancellation_policy} onValueChange={v => setF('cancellation_policy', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible — free cancellation up to 24 hrs before check-in</SelectItem>
                    <SelectItem value="moderate">Moderate — free cancellation up to 5 days before</SelectItem>
                    <SelectItem value="strict">Strict — no refunds after 48 hrs of booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-border">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.policySmokingAllowed} onCheckedChange={v => setF('policySmokingAllowed', !!v)} />
                  <span className="text-xs">Smoking Allowed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.policyPetAllowed} onCheckedChange={v => setF('policyPetAllowed', !!v)} />
                  <span className="text-xs">Pets Allowed</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={form.policyChildAllowed} onCheckedChange={v => setF('policyChildAllowed', !!v)} />
                  <span className="text-xs">Children Allowed</span>
                </label>
              </div>

              <div>
                <Label htmlFor="policyChildDescription">Child Policy Details</Label>
                <Input id="policyChildDescription" value={form.policyChildDescription} onChange={e => setF('policyChildDescription', e.target.value)} placeholder="e.g. Free stay for children below 5 years" />
              </div>

              <div>
                <Label htmlFor="houseRules">House Rules</Label>
                <Textarea id="houseRules" value={form.houseRules} onChange={e => setF('houseRules', e.target.value)} placeholder="No outside food, quiet hours after 11 PM..." rows={3} />
              </div>
              <div>
                <Label htmlFor="healthSafety">Health & Safety</Label>
                <Textarea id="healthSafety" value={form.healthSafety} onChange={e => setF('healthSafety', e.target.value)} placeholder="24/7 medical staff, CCTV, lifeguard at pool..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Nearby Information */}
          <Card>
            <CardHeader><CardTitle>Nearby Attractions & Services</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {/* Nearby Restaurants */}
              <div>
                <Label className="text-xs font-semibold">Restaurants & Cafes</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.nearbyRestaurantsInput}
                    onChange={e => setF('nearbyRestaurantsInput', e.target.value)}
                    placeholder="e.g. Beach Grill Cafe (0.2 km)"
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = form.nearbyRestaurantsInput.trim();
                        if (val && !form.nearbyRestaurants.includes(val)) {
                          setForm(p => ({ ...p, nearbyRestaurants: [...p.nearbyRestaurants, val], nearbyRestaurantsInput: '' }));
                        }
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const val = form.nearbyRestaurantsInput.trim();
                    if (val && !form.nearbyRestaurants.includes(val)) {
                      setForm(p => ({ ...p, nearbyRestaurants: [...p.nearbyRestaurants, val], nearbyRestaurantsInput: '' }));
                    }
                  }} className="h-8">Add</Button>
                </div>
                {form.nearbyRestaurants.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.nearbyRestaurants.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                        {item}
                        <button type="button" onClick={() => setForm(p => ({ ...p, nearbyRestaurants: p.nearbyRestaurants.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby Attractions */}
              <div>
                <Label className="text-xs font-semibold">Attractions</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.nearbyAttractionsInput}
                    onChange={e => setF('nearbyAttractionsInput', e.target.value)}
                    placeholder="e.g. Fort Aguada (3 km)"
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = form.nearbyAttractionsInput.trim();
                        if (val && !form.nearbyAttractions.includes(val)) {
                          setForm(p => ({ ...p, nearbyAttractions: [...p.nearbyAttractions, val], nearbyAttractionsInput: '' }));
                        }
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const val = form.nearbyAttractionsInput.trim();
                    if (val && !form.nearbyAttractions.includes(val)) {
                      setForm(p => ({ ...p, nearbyAttractions: [...p.nearbyAttractions, val], nearbyAttractionsInput: '' }));
                    }
                  }} className="h-8">Add</Button>
                </div>
                {form.nearbyAttractions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.nearbyAttractions.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                        {item}
                        <button type="button" onClick={() => setForm(p => ({ ...p, nearbyAttractions: p.nearbyAttractions.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby Transport */}
              <div>
                <Label className="text-xs font-semibold">Transport Stations</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.nearbyTransportInput}
                    onChange={e => setF('nearbyTransportInput', e.target.value)}
                    placeholder="e.g. Thivim Railway Station (22 km)"
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = form.nearbyTransportInput.trim();
                        if (val && !form.nearbyTransport.includes(val)) {
                          setForm(p => ({ ...p, nearbyTransport: [...p.nearbyTransport, val], nearbyTransportInput: '' }));
                        }
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const val = form.nearbyTransportInput.trim();
                    if (val && !form.nearbyTransport.includes(val)) {
                      setForm(p => ({ ...p, nearbyTransport: [...p.nearbyTransport, val], nearbyTransportInput: '' }));
                    }
                  }} className="h-8">Add</Button>
                </div>
                {form.nearbyTransport.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.nearbyTransport.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                        {item}
                        <button type="button" onClick={() => setForm(p => ({ ...p, nearbyTransport: p.nearbyTransport.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby Hospitals */}
              <div>
                <Label className="text-xs font-semibold">Hospitals & Medical Care</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.nearbyHospitalsInput}
                    onChange={e => setF('nearbyHospitalsInput', e.target.value)}
                    placeholder="e.g. Manipal Hospital Goa (15 km)"
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = form.nearbyHospitalsInput.trim();
                        if (val && !form.nearbyHospitals.includes(val)) {
                          setForm(p => ({ ...p, nearbyHospitals: [...p.nearbyHospitals, val], nearbyHospitalsInput: '' }));
                        }
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const val = form.nearbyHospitalsInput.trim();
                    if (val && !form.nearbyHospitals.includes(val)) {
                      setForm(p => ({ ...p, nearbyHospitals: [...p.nearbyHospitals, val], nearbyHospitalsInput: '' }));
                    }
                  }} className="h-8">Add</Button>
                </div>
                {form.nearbyHospitals.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.nearbyHospitals.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2.5 py-0.5">
                        {item}
                        <button type="button" onClick={() => setForm(p => ({ ...p, nearbyHospitals: p.nearbyHospitals.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Host Profile Info */}
          <Card>
            <CardHeader><CardTitle>Host Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hostName">Host Display Name</Label>
                  <Input id="hostName" value={form.hostName} onChange={e => setF('hostName', e.target.value)} placeholder="e.g. Resort Club" />
                </div>
                <div>
                  <Label htmlFor="hostPhoto">Host Photo URL</Label>
                  <Input id="hostPhoto" value={form.hostPhoto} onChange={e => setF('hostPhoto', e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="hostIsSuperhost" checked={form.hostIsSuperhost} onCheckedChange={v => setF('hostIsSuperhost', !!v)} />
                <Label htmlFor="hostIsSuperhost" className="text-xs font-semibold cursor-pointer">Mark as Superhost</Label>
              </div>
              <div>
                <Label htmlFor="hostDescription">Host Description</Label>
                <Textarea id="hostDescription" value={form.hostDescription} onChange={e => setF('hostDescription', e.target.value)} placeholder="Describe the resort hosting history..." rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Room Plans */}
          <Card>
            <CardHeader><CardTitle>Room Plans Selection</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.planRoomOnly} onCheckedChange={v => setF('planRoomOnly', !!v)} />
                <span className="text-sm">Room Only</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.planFreeBreakfast} onCheckedChange={v => setF('planFreeBreakfast', !!v)} />
                <span className="text-sm">Free Breakfast</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.planHalfBoard} onCheckedChange={v => setF('planHalfBoard', !!v)} />
                <span className="text-sm">Half Board (Breakfast + Dinner)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={form.planAllInclusive} onCheckedChange={v => setF('planAllInclusive', !!v)} />
                <span className="text-sm">All Inclusive</span>
              </label>

              <div className="pt-2 border-t border-border">
                <Label className="text-xs">Custom Meal / Room Plans</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={form.customPlanInput}
                    onChange={e => setF('customPlanInput', e.target.value)}
                    placeholder="e.g. Resort wellness package"
                    className="h-8 text-sm"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = form.customPlanInput.trim();
                        if (val && !form.customPlans.includes(val)) {
                          setForm(p => ({ ...p, customPlans: [...p.customPlans, val], customPlanInput: '' }));
                        }
                      }
                    }}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => {
                    const val = form.customPlanInput.trim();
                    if (val && !form.customPlans.includes(val)) {
                      setForm(p => ({ ...p, customPlans: [...p.customPlans, val], customPlanInput: '' }));
                    }
                  }} className="h-8">Add</Button>
                </div>
                {form.customPlans.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.customPlans.map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 bg-secondary text-xs rounded-full px-2 py-0.5">
                        {item}
                        <button type="button" onClick={() => setForm(p => ({ ...p, customPlans: p.customPlans.filter((_, i) => i !== idx) }))} className="text-muted-foreground hover:text-destructive ml-1">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle>Pricing & Fees (₹)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price">Price per Night *</Label>
                <Input id="price" type="number" min={1} value={form.price_per_night} onChange={e => setF('price_per_night', e.target.value)} placeholder="8000" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="originalPrice" className="text-xs">Original Price</Label>
                  <Input id="originalPrice" type="number" min={0} value={form.originalPrice} onChange={e => setF('originalPrice', e.target.value)} placeholder="10000" className="h-8 text-sm" />
                </div>
                <div>
                  <Label htmlFor="discountedPrice" className="text-xs">Discounted Price</Label>
                  <Input id="discountedPrice" type="number" min={0} value={form.discountedPrice} onChange={e => setF('discountedPrice', e.target.value)} placeholder="8000" className="h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="dailyPrice" className="text-xs">Daily Price</Label>
                  <Input id="dailyPrice" type="number" min={0} value={form.dailyPrice} onChange={e => setF('dailyPrice', e.target.value)} placeholder="8000" className="h-8 text-sm" />
                </div>
                <div>
                  <Label htmlFor="taxesAndFees" className="text-xs">Taxes & Fees</Label>
                  <Input id="taxesAndFees" type="number" min={0} value={form.taxesAndFees} onChange={e => setF('taxesAndFees', e.target.value)} placeholder="500" className="h-8 text-sm" />
                </div>
              </div>
              <div>
                <Label htmlFor="weeklyPrice">Weekly Price</Label>
                <Input id="weeklyPrice" type="number" min={1} value={form.weeklyPrice} onChange={e => setF('weeklyPrice', e.target.value)} placeholder="Leave blank to auto-calculate" />
              </div>
              <div>
                <Label htmlFor="monthlyPrice">Monthly Price</Label>
                <Input id="monthlyPrice" type="number" min={1} value={form.monthlyPrice} onChange={e => setF('monthlyPrice', e.target.value)} placeholder="Leave blank to auto-calculate" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="cleaningFee" className="text-xs">Cleaning Fee</Label>
                  <Input id="cleaningFee" type="number" min={0} value={form.cleaningFee} onChange={e => setF('cleaningFee', e.target.value)} placeholder="0" className="h-8 text-sm" />
                </div>
                <div>
                  <Label htmlFor="securityDeposit" className="text-xs">Security Deposit</Label>
                  <Input id="securityDeposit" type="number" min={0} value={form.securityDeposit} onChange={e => setF('securityDeposit', e.target.value)} placeholder="0" className="h-8 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="hostDiscount" className="text-xs">Host Discount (%)</Label>
                  <Input id="hostDiscount" type="number" min={0} max={90} value={form.hostDiscountPercent} onChange={e => setF('hostDiscountPercent', e.target.value)} placeholder="0" className="h-8 text-sm" />
                </div>
                <div>
                  <Label htmlFor="offerPercentage" className="text-xs">Offer Percentage</Label>
                  <Input id="offerPercentage" type="number" min={0} max={100} value={form.offerPercentage} onChange={e => setF('offerPercentage', e.target.value)} placeholder="20" className="h-8 text-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Checkbox id="bookAtZero" checked={form.bookAtZero} onCheckedChange={v => setF('bookAtZero', !!v)} />
                <Label htmlFor="bookAtZero" className="text-xs font-semibold cursor-pointer">Allow Book @ ₹0 Option</Label>
              </div>
            </CardContent>
          </Card>

          {/* Coupons */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-4 w-4" /> Coupons
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, coupons: [...p.coupons, emptyCoupon()] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.coupons.length === 0 && (
                <p className="text-xs text-muted-foreground">No coupons yet. Click Add to create one.</p>
              )}
              {form.coupons.map((c, i) => (
                <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={c.code}
                      onChange={e => updateCoupon(i, 'code', e.target.value.toUpperCase())}
                      placeholder="SAVE20"
                      className="uppercase flex-1 h-8 text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Generate code" onClick={() => updateCoupon(i, 'code', generateCouponCode())}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, coupons: p.coupons.filter((_, idx) => idx !== i) }))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={c.type} onValueChange={v => updateCoupon(i, 'type', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">% Off</SelectItem>
                        <SelectItem value="flat">₹ Flat Off</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      value={c.value}
                      onChange={e => updateCoupon(i, 'value', e.target.value)}
                      placeholder={c.type === 'percent' ? '20' : '500'}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label>Available for booking</Label>
                <Switch checked={form.availability_status} onCheckedChange={v => setF('availability_status', v)} />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={createResort.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createResort.isPending ? 'Creating...' : 'Create Resort Listing'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
