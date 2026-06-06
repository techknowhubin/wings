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
import { useCreateStay } from '@/hooks/useListings';
import { toast } from 'sonner';
import { createDiscountConfig, generateCouponCode } from '@/lib/discounts';
import { ListingImageUploader } from './ListingImageUploader';
import type { RichAmenities } from '@/lib/listing-helpers';

const propertyTypes = ['Villa', 'Apartment', 'Cottage', 'Homestay', 'Farmhouse', 'Treehouse', 'Houseboat', 'Penthouse', 'Studio'];
const bedTypes = ['King', 'Queen', 'Double', 'Twin', 'Single', 'Bunk', 'Sofa Bed'];

const STANDARD_AMENITIES = [
  { key: 'wifi' as const, label: 'WiFi' },
  { key: 'ac' as const, label: 'Air Conditioning' },
  { key: 'tv' as const, label: 'TV' },
  { key: 'kitchen' as const, label: 'Kitchen' },
  { key: 'parking' as const, label: 'Free Parking' },
  { key: 'pool' as const, label: 'Swimming Pool' },
  { key: 'petFriendly' as const, label: 'Pet Friendly' },
  { key: 'dedicatedWorkspace' as const, label: 'Dedicated Workspace' },
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
  bedroomDetails: Array<{ name: string; bedType: string; count: string }>;
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
}

export function AddStayForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createStay = useCreateStay();

  const [form, setForm] = useState<FormState>({
    title: '', description: '', shortDescription: '',
    location: '', state: '', city: '', fullAddress: '',
    latitude: '', longitude: '', property_type: '',
    max_guests: '', bedrooms: '', beds: '', bathrooms: '', propertySize: '',
    images: [], roomImages: [],
    amenityWifi: false, amenityAc: false, amenityTv: false,
    amenityKitchen: false, amenityParking: false, amenityPool: false,
    amenityPetFriendly: false, amenityDedicatedWorkspace: false,
    amenitySelfCheckIn: false, amenityFreeCancellation: false,
    amenityBreakfast: false, amenityGym: false,
    customAmenities: [], amenityInput: '',
    bedroomDetails: [emptyBedroom()],
    check_in_time: '14:00', check_out_time: '11:00',
    houseRules: '', healthSafety: '', cancellation_policy: 'moderate',
    price_per_night: '', weeklyPrice: '', monthlyPrice: '',
    cleaningFee: '', securityDeposit: '', hostDiscountPercent: '',
    coupons: [],
    availability_status: true,
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
      }));
      if (form.roomImages.length) richAmenities.roomImages = form.roomImages;
      if (form.weeklyPrice) richAmenities.weeklyPrice = Number(form.weeklyPrice);
      if (form.monthlyPrice) richAmenities.monthlyPrice = Number(form.monthlyPrice);
      if (form.cleaningFee) richAmenities.cleaningFee = Number(form.cleaningFee);
      if (form.securityDeposit) richAmenities.securityDeposit = Number(form.securityDeposit);

      const validCoupons = form.coupons
        .filter(c => c.code.trim() && c.value)
        .map(c => ({ code: c.code, type: c.type, value: Number(c.value) }));
      const discountsConfig = createDiscountConfig(Number(form.hostDiscountPercent || 0), validCoupons);

      await createStay.mutateAsync({
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
      toast.success('Stay listing created successfully!');
      navigate('/host/stays');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/stays')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Stay</h1>
          <p className="text-muted-foreground">Create a new homestay or property listing</p>
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
                <Label htmlFor="title">Property Name *</Label>
                <Input id="title" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Cozy Mountain Cottage in Manali" />
              </div>
              <div>
                <Label htmlFor="shortDesc">Short Description</Label>
                <Input id="shortDesc" value={form.shortDescription} onChange={e => setF('shortDescription', e.target.value)} placeholder="One-line summary shown on listing cards" />
              </div>
              <div>
                <Label htmlFor="description">Full Description</Label>
                <Textarea id="description" value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe your property in detail..." rows={5} />
              </div>
              <div>
                <Label htmlFor="property_type">Property Type</Label>
                <Select value={form.property_type} onValueChange={v => setF('property_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input id="location" value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Manali, Himachal Pradesh" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input id="state" value={form.state} onChange={e => setF('state', e.target.value)} placeholder="e.g. Himachal Pradesh" />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={form.city} onChange={e => setF('city', e.target.value)} placeholder="e.g. Manali" />
                </div>
              </div>
              <div>
                <Label htmlFor="fullAddress">Full Address</Label>
                <Input id="fullAddress" value={form.fullAddress} onChange={e => setF('fullAddress', e.target.value)} placeholder="Street, Area, PIN code" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lat">Latitude</Label>
                  <Input id="lat" type="number" step="any" value={form.latitude} onChange={e => setF('latitude', e.target.value)} placeholder="32.2396" />
                </div>
                <div>
                  <Label htmlFor="lng">Longitude</Label>
                  <Input id="lng" type="number" step="any" value={form.longitude} onChange={e => setF('longitude', e.target.value)} placeholder="77.1887" />
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
                <Input id="guests" type="number" min={1} value={form.max_guests} onChange={e => setF('max_guests', e.target.value)} placeholder="4" />
              </div>
              <div>
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input id="bedrooms" type="number" min={0} value={form.bedrooms} onChange={e => setF('bedrooms', e.target.value)} placeholder="2" />
              </div>
              <div>
                <Label htmlFor="beds">Beds</Label>
                <Input id="beds" type="number" min={0} value={form.beds} onChange={e => setF('beds', e.target.value)} placeholder="3" />
              </div>
              <div>
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input id="bathrooms" type="number" min={0} value={form.bathrooms} onChange={e => setF('bathrooms', e.target.value)} placeholder="1" />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="propSize">Property Size</Label>
                <Input id="propSize" value={form.propertySize} onChange={e => setF('propertySize', e.target.value)} placeholder="e.g. 1200 sq ft" />
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
                label="Click to upload property photos"
                showFeaturedBadge
              />
            </CardContent>
          </Card>

          {/* Room Photos */}
          <Card>
            <CardHeader><CardTitle>Room Photos</CardTitle></CardHeader>
            <CardContent>
              <ListingImageUploader
                images={form.roomImages}
                onImagesChange={v => setF('roomImages', v)}
                label="Click to upload room / interior photos"
                showFeaturedBadge={false}
              />
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
                    placeholder="e.g. Bonfire area, Telescope, Kayak"
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
              <CardTitle>Where You'll Sleep</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, bedroomDetails: [...p.bedroomDetails, emptyBedroom()] }))}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add Bedroom
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.bedroomDetails.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-border">
                  <div>
                    <Label className="text-xs">Room Name</Label>
                    <Input value={b.name} onChange={e => updateBedroom(i, 'name', e.target.value)} placeholder={`Bedroom ${i + 1}`} className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Bed Type</Label>
                    <Select value={b.bedType} onValueChange={v => updateBedroom(i, 'bedType', v)}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{bedTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <Label className="text-xs">Beds</Label>
                      <Input type="number" min={1} value={b.count} onChange={e => updateBedroom(i, 'count', e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                    {form.bedroomDetails.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.filter((_, idx) => idx !== i) }))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
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
              <div>
                <Label htmlFor="houseRules">House Rules</Label>
                <Textarea id="houseRules" value={form.houseRules} onChange={e => setF('houseRules', e.target.value)} placeholder="No smoking, no parties, no pets inside, quiet hours after 10 PM..." rows={3} />
              </div>
              <div>
                <Label htmlFor="healthSafety">Health & Safety</Label>
                <Textarea id="healthSafety" value={form.healthSafety} onChange={e => setF('healthSafety', e.target.value)} placeholder="Smoke alarm installed, CO detector, first aid kit available..." rows={3} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">

          {/* Pricing */}
          <Card>
            <CardHeader><CardTitle>Pricing (₹)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="price">Price per Night *</Label>
                <Input id="price" type="number" min={1} value={form.price_per_night} onChange={e => setF('price_per_night', e.target.value)} placeholder="2500" />
              </div>
              <div>
                <Label htmlFor="weeklyPrice">Weekly Price</Label>
                <Input id="weeklyPrice" type="number" min={1} value={form.weeklyPrice} onChange={e => setF('weeklyPrice', e.target.value)} placeholder="Leave blank to auto-calculate" />
              </div>
              <div>
                <Label htmlFor="monthlyPrice">Monthly Price</Label>
                <Input id="monthlyPrice" type="number" min={1} value={form.monthlyPrice} onChange={e => setF('monthlyPrice', e.target.value)} placeholder="Leave blank to auto-calculate" />
              </div>
              <div>
                <Label htmlFor="cleaningFee">Cleaning Fee</Label>
                <Input id="cleaningFee" type="number" min={0} value={form.cleaningFee} onChange={e => setF('cleaningFee', e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input id="securityDeposit" type="number" min={0} value={form.securityDeposit} onChange={e => setF('securityDeposit', e.target.value)} placeholder="0" />
              </div>
              <div>
                <Label htmlFor="hostDiscount">Host Discount (%)</Label>
                <Input id="hostDiscount" type="number" min={0} max={90} value={form.hostDiscountPercent} onChange={e => setF('hostDiscountPercent', e.target.value)} placeholder="0" />
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

          <Button type="submit" className="w-full" disabled={createStay.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createStay.isPending ? 'Creating...' : 'Create Stay Listing'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
