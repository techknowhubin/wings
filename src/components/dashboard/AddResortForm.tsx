import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Plus, X, Ticket, RefreshCw } from 'lucide-react';
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
  `amenity${k.charAt(0).toUpperCase()}${k.slice(1)}` as string;

const emptyBedroom = () => ({ name: '', bedType: 'King', count: '1' });
const emptyCoupon = () => ({ code: '', type: 'percent' as const, value: '' });

export function AddResortForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createResort = useCreateResort();

  const [form, setForm] = useState({
    title: '', description: '', shortDescription: '',
    location: '', state: '', city: '', fullAddress: '',
    latitude: '', longitude: '', property_type: 'Resort',
    max_guests: '', bedrooms: '', beds: '', bathrooms: '', propertySize: '',
    images: [] as string[], roomImages: [] as string[],
    amenityWifi: false, amenityAc: false, amenityTv: false,
    amenityKitchen: false, amenityParking: false, amenityPool: false,
    amenityPetFriendly: false, amenityDedicatedWorkspace: false,
    amenitySelfCheckIn: false, amenityFreeCancellation: false,
    amenityBreakfast: false, amenityGym: false,
    customAmenities: [] as string[], amenityInput: '',
    bedroomDetails: [emptyBedroom()] as Array<{ name: string; bedType: string; count: string }>,
    check_in_time: '14:00', check_out_time: '11:00',
    houseRules: '', healthSafety: '', cancellation_policy: 'moderate',
    price_per_night: '', weeklyPrice: '', monthlyPrice: '',
    cleaningFee: '', securityDeposit: '', hostDiscountPercent: '',
    coupons: [] as Array<{ code: string; type: 'percent' | 'flat'; value: string }>,
    availability_status: true,
  });

  const setF = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(p => ({ ...p, [key]: value }));

  const addCustomAmenity = () => {
    const val = form.amenityInput.trim();
    if (val && !form.customAmenities.includes(val)) {
      setForm(p => ({ ...p, customAmenities: [...p.customAmenities, val], amenityInput: '' }));
    }
  };

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
      if (validRooms.length) richAmenities.bedroomDetails = validRooms.map(b => ({ name: b.name, bedType: b.bedType, count: Number(b.count) || 1 }));
      if (form.roomImages.length) richAmenities.roomImages = form.roomImages;
      if (form.weeklyPrice) richAmenities.weeklyPrice = Number(form.weeklyPrice);
      if (form.monthlyPrice) richAmenities.monthlyPrice = Number(form.monthlyPrice);
      if (form.cleaningFee) richAmenities.cleaningFee = Number(form.cleaningFee);
      if (form.securityDeposit) richAmenities.securityDeposit = Number(form.securityDeposit);

      const validCoupons = form.coupons.filter(c => c.code.trim() && c.value).map(c => ({ code: c.code, type: c.type, value: Number(c.value) }));
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
        discounts: (discountsConfig.hostDiscountPercent > 0 || discountsConfig.coupons.length > 0) ? discountsConfig : null,
        tags: null,
      });
      toast.success('Resort listing created successfully!');
      navigate('/host/resorts');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create resort listing');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/resorts')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Resort</h1>
          <p className="text-muted-foreground">Create a new resort listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* Basic Info */}
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Resort Name *</Label><Input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Serenity Beach Resort" /></div>
              <div><Label>Short Description</Label><Input value={form.shortDescription} onChange={e => setF('shortDescription', e.target.value)} placeholder="One-line summary shown on listing cards" /></div>
              <div><Label>Full Description</Label><Textarea value={form.description} onChange={e => setF('description', e.target.value)} placeholder="Describe your resort in detail..." rows={5} /></div>
              <div>
                <Label>Property Type</Label>
                <Select value={form.property_type} onValueChange={v => setF('property_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{propertyTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Location *</Label><Input value={form.location} onChange={e => setF('location', e.target.value)} placeholder="e.g. Candolim Beach, Goa" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>State</Label><Input value={form.state} onChange={e => setF('state', e.target.value)} placeholder="e.g. Goa" /></div>
                <div><Label>City</Label><Input value={form.city} onChange={e => setF('city', e.target.value)} placeholder="e.g. North Goa" /></div>
              </div>
              <div><Label>Full Address</Label><Input value={form.fullAddress} onChange={e => setF('fullAddress', e.target.value)} placeholder="Street, Area, PIN code" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Latitude</Label><Input type="number" step="any" value={form.latitude} onChange={e => setF('latitude', e.target.value)} placeholder="15.5489" /></div>
                <div><Label>Longitude</Label><Input type="number" step="any" value={form.longitude} onChange={e => setF('longitude', e.target.value)} placeholder="73.7534" /></div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader><CardTitle>Property Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Max Guests *</Label><Input type="number" min={1} value={form.max_guests} onChange={e => setF('max_guests', e.target.value)} placeholder="200" /></div>
              <div><Label>Villas / Rooms</Label><Input type="number" min={0} value={form.bedrooms} onChange={e => setF('bedrooms', e.target.value)} placeholder="80" /></div>
              <div><Label>Beds</Label><Input type="number" min={0} value={form.beds} onChange={e => setF('beds', e.target.value)} placeholder="100" /></div>
              <div><Label>Bathrooms</Label><Input type="number" min={0} value={form.bathrooms} onChange={e => setF('bathrooms', e.target.value)} placeholder="80" /></div>
              <div className="md:col-span-2"><Label>Property Size</Label><Input value={form.propertySize} onChange={e => setF('propertySize', e.target.value)} placeholder="e.g. 10 acres" /></div>
            </CardContent>
          </Card>

          {/* Gallery Photos */}
          <Card>
            <CardHeader><CardTitle>Gallery Photos</CardTitle></CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">The first image becomes the featured/thumbnail photo.</p>
              <ListingImageUploader images={form.images} onImagesChange={v => setF('images', v)} label="Click to upload resort photos" showFeaturedBadge />
            </CardContent>
          </Card>

          {/* Room Photos */}
          <Card>
            <CardHeader><CardTitle>Room / Villa Photos</CardTitle></CardHeader>
            <CardContent>
              <ListingImageUploader images={form.roomImages} onImagesChange={v => setF('roomImages', v)} label="Click to upload room / villa interior photos" showFeaturedBadge={false} />
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader><CardTitle>Amenities & Facilities</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {STANDARD_AMENITIES.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                    <Checkbox checked={form[amenityFormKey(key) as keyof typeof form] as boolean} onCheckedChange={checked => setForm(p => ({ ...p, [amenityFormKey(key)]: Boolean(checked) }))} />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <div>
                <Label>Custom Facilities</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.amenityInput} onChange={e => setF('amenityInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomAmenity(); } }} placeholder="e.g. Private Beach, Ayurvedic Spa, Water Sports" />
                  <Button type="button" variant="outline" onClick={addCustomAmenity} className="shrink-0"><Plus className="h-4 w-4" /></Button>
                </div>
                {form.customAmenities.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.customAmenities.map((a, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-secondary text-foreground rounded-full px-3 py-1 text-sm">
                        {a}
                        <button type="button" onClick={() => setForm(p => ({ ...p, customAmenities: p.customAmenities.filter((_, idx) => idx !== i) }))} className="text-muted-foreground hover:text-destructive ml-0.5"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Room Types */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Villa / Room Types</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, bedroomDetails: [...p.bedroomDetails, emptyBedroom()] }))}><Plus className="h-3.5 w-3.5 mr-1" /> Add Room Type</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.bedroomDetails.map((b, i) => (
                <div key={i} className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-border">
                  <div>
                    <Label className="text-xs">Room / Villa Name</Label>
                    <Input value={b.name} onChange={e => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.map((bd, idx) => idx === i ? { ...bd, name: e.target.value } : bd) }))} placeholder="e.g. Beach Villa" className="mt-1 h-8 text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs">Bed Type</Label>
                    <Select value={b.bedType} onValueChange={v => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.map((bd, idx) => idx === i ? { ...bd, bedType: v } : bd) }))}>
                      <SelectTrigger className="mt-1 h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>{bedTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1"><Label className="text-xs">Beds</Label><Input type="number" min={1} value={b.count} onChange={e => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.map((bd, idx) => idx === i ? { ...bd, count: e.target.value } : bd) }))} className="mt-1 h-8 text-sm" /></div>
                    {form.bedroomDetails.length > 1 && (<Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, bedroomDetails: p.bedroomDetails.filter((_, idx) => idx !== i) }))}><X className="h-3.5 w-3.5" /></Button>)}
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
                <div><Label>Check-in Time</Label><Input type="time" value={form.check_in_time} onChange={e => setF('check_in_time', e.target.value)} /></div>
                <div><Label>Check-out Time</Label><Input type="time" value={form.check_out_time} onChange={e => setF('check_out_time', e.target.value)} /></div>
              </div>
              <div>
                <Label>Cancellation Policy</Label>
                <Select value={form.cancellation_policy} onValueChange={v => setF('cancellation_policy', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible — free cancellation up to 24 hrs</SelectItem>
                    <SelectItem value="moderate">Moderate — free cancellation up to 5 days</SelectItem>
                    <SelectItem value="strict">Strict — no refunds after 48 hrs of booking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>House Rules</Label><Textarea value={form.houseRules} onChange={e => setF('houseRules', e.target.value)} placeholder="No outside food, quiet hours after 11 PM..." rows={3} /></div>
              <div><Label>Health & Safety</Label><Textarea value={form.healthSafety} onChange={e => setF('healthSafety', e.target.value)} placeholder="24/7 medical staff, CCTV, lifeguard at pool..." rows={3} /></div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Pricing (₹)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Price per Night *</Label><Input type="number" min={1} value={form.price_per_night} onChange={e => setF('price_per_night', e.target.value)} placeholder="8000" /></div>
              <div><Label>Weekly Rate</Label><Input type="number" min={1} value={form.weeklyPrice} onChange={e => setF('weeklyPrice', e.target.value)} placeholder="Auto-calculated if blank" /></div>
              <div><Label>Monthly Rate</Label><Input type="number" min={1} value={form.monthlyPrice} onChange={e => setF('monthlyPrice', e.target.value)} placeholder="Auto-calculated if blank" /></div>
              <div><Label>Cleaning Fee</Label><Input type="number" min={0} value={form.cleaningFee} onChange={e => setF('cleaningFee', e.target.value)} placeholder="0" /></div>
              <div><Label>Security Deposit</Label><Input type="number" min={0} value={form.securityDeposit} onChange={e => setF('securityDeposit', e.target.value)} placeholder="0" /></div>
              <div><Label>Host Discount (%)</Label><Input type="number" min={0} max={90} value={form.hostDiscountPercent} onChange={e => setF('hostDiscountPercent', e.target.value)} placeholder="0" /></div>
            </CardContent>
          </Card>

          {/* Coupons */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Ticket className="h-4 w-4" /> Coupons</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, coupons: [...p.coupons, emptyCoupon()] }))}><Plus className="h-3.5 w-3.5 mr-1" /> Add</Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.coupons.length === 0 && <p className="text-xs text-muted-foreground">No coupons yet. Click Add to create one.</p>}
              {form.coupons.map((c, i) => (
                <div key={i} className="p-3 rounded-lg border border-border space-y-2">
                  <div className="flex gap-2">
                    <Input value={c.code} onChange={e => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, code: e.target.value.toUpperCase() } : cp) }))} placeholder="RESORT10" className="uppercase flex-1 h-8 text-sm" />
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Generate code" onClick={() => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, code: generateCouponCode() } : cp) }))}><RefreshCw className="h-3.5 w-3.5" /></Button>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setForm(p => ({ ...p, coupons: p.coupons.filter((_, idx) => idx !== i) }))}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={c.type} onValueChange={v => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, type: v as 'percent' | 'flat' } : cp) }))}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="percent">% Off</SelectItem><SelectItem value="flat">₹ Flat Off</SelectItem></SelectContent>
                    </Select>
                    <Input type="number" min={1} value={c.value} onChange={e => setForm(p => ({ ...p, coupons: p.coupons.map((cp, idx) => idx === i ? { ...cp, value: e.target.value } : cp) }))} placeholder={c.type === 'percent' ? '10' : '1000'} className="h-8 text-sm" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-center justify-between"><Label>Available for booking</Label><Switch checked={form.availability_status} onCheckedChange={v => setF('availability_status', v)} /></div>
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
