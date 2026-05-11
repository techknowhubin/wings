import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, ImagePlus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCreateCar } from '@/hooks/useListings';
import { toast } from 'sonner';
import { createDiscountConfig } from '@/lib/discounts';

const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'CNG'];
const transmissionTypes = ['Manual', 'Automatic'];
const vehicleTypes = ['Sedan', 'SUV', 'Hatchback', 'MUV', 'Luxury', 'Convertible'];

export function AddCarForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createCar = useCreateCar();

  const [form, setForm] = useState({
    title: '', description: '', location: '', price_per_day: '',
    brand: '', model: '', year: '', fuel_type: '', transmission: '',
    vehicle_type: '', seating_capacity: '', mileage_limit: '',
    availability_status: true, images: [] as string[], imageInput: '',
    hostDiscountPercent: '',
  });

  const handleAddImage = () => {
    if (form.imageInput.trim()) {
      setForm(p => ({ ...p, images: [...p.images, p.imageInput.trim()], imageInput: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.location || !form.price_per_day) {
      toast.error('Please fill in all required fields'); return;
    }
    try {
      const hostDiscountPercent = Number(form.hostDiscountPercent || 0);
      const discountsConfig = createDiscountConfig(hostDiscountPercent, []);
      await createCar.mutateAsync({
        host_id: user.id, title: form.title, description: form.description || null,
        location: form.location, price_per_day: Number(form.price_per_day),
        brand: form.brand || null, model: form.model || null,
        year: form.year ? Number(form.year) : null,
        fuel_type: form.fuel_type || null, transmission: form.transmission || null,
        vehicle_type: form.vehicle_type || null,
        seating_capacity: form.seating_capacity ? Number(form.seating_capacity) : null,
        mileage_limit: form.mileage_limit ? Number(form.mileage_limit) : null,
        availability_status: form.availability_status,
        images: form.images.length > 0 ? form.images : null,
        amenities: null,
        currency: 'INR',
        discounts:
          discountsConfig.hostDiscountPercent > 0 || discountsConfig.coupons.length > 0
            ? discountsConfig
            : null,
        latitude: null, longitude: null, slug: null, tags: null,
      });
      toast.success('Car listing created!');
      navigate('/host/cars');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    }
  };

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/cars')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Car</h1>
          <p className="text-muted-foreground">Create a new rental car listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Honda City 2023 - Self Drive" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the car..." rows={4} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Location *</Label><Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Mumbai, Maharashtra" /></div>
                <div><Label>Price/Day (₹) *</Label><Input type="number" value={form.price_per_day} onChange={e => set('price_per_day', e.target.value)} placeholder="1500" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Vehicle Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Brand</Label><Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Honda" /></div>
              <div><Label>Model</Label><Input value={form.model} onChange={e => set('model', e.target.value)} placeholder="City" /></div>
              <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2023" /></div>
              <div><Label>Fuel Type</Label>
                <Select value={form.fuel_type} onValueChange={v => set('fuel_type', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{fuelTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Transmission</Label>
                <Select value={form.transmission} onValueChange={v => set('transmission', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{transmissionTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle Type</Label>
                <Select value={form.vehicle_type} onValueChange={v => set('vehicle_type', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{vehicleTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Seats</Label><Input type="number" value={form.seating_capacity} onChange={e => set('seating_capacity', e.target.value)} placeholder="5" /></div>
              <div><Label>Mileage Limit (km)</Label><Input type="number" value={form.mileage_limit} onChange={e => set('mileage_limit', e.target.value)} placeholder="300" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Images</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input value={form.imageInput} onChange={e => set('imageInput', e.target.value)} placeholder="Paste image URL..." className="flex-1" />
                <Button type="button" variant="outline" onClick={handleAddImage}><ImagePlus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
              {form.images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {form.images.map((img, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, idx) => idx !== i) }))} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Available for booking</Label>
                <Switch checked={form.availability_status} onCheckedChange={v => set('availability_status', v)} />
              </div>
              <div>
                <Label htmlFor="host-discount">Host Discount (%)</Label>
                <Input
                  id="host-discount"
                  type="number"
                  min={0}
                  max={90}
                  value={form.hostDiscountPercent}
                  onChange={(e) => set('hostDiscountPercent', e.target.value)}
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full" disabled={createCar.isPending}>
            <Save className="h-4 w-4 mr-2" />{createCar.isPending ? 'Creating...' : 'Create Car Listing'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
