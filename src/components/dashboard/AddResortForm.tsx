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
import { useCreateResort } from '@/hooks/useListings';
import { toast } from 'sonner';
import { createDiscountConfig } from '@/lib/discounts';

const propertyTypes = ['Resort', 'Beach Resort', 'Mountain Resort', 'Spa Resort', 'Eco Resort'];

export function AddResortForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createResort = useCreateResort();
  const [form, setForm] = useState({
    title: '', description: '', location: '', price_per_night: '', max_guests: '', bedrooms: '', bathrooms: '',
    property_type: 'Resort', check_in_time: '14:00', check_out_time: '11:00', cancellation_policy: 'moderate',
    availability_status: true, images: [] as string[], imageInput: '', hostDiscountPercent: '',
  });

  const handleAddImage = () => form.imageInput.trim() && setForm(prev => ({ ...prev, images: [...prev.images, prev.imageInput.trim()], imageInput: '' }));
  const handleRemoveImage = (index: number) => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.location || !form.price_per_night || !form.max_guests) return toast.error('Please fill in all required fields');
    try {
      const discountsConfig = createDiscountConfig(Number(form.hostDiscountPercent || 0), []);
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
        amenities: null,
        currency: 'INR',
        discounts: discountsConfig.hostDiscountPercent > 0 || discountsConfig.coupons.length > 0 ? discountsConfig : null,
        latitude: null,
        longitude: null,
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
        <div><h1 className="text-2xl font-bold text-foreground">Add New Resort</h1><p className="text-muted-foreground">Create a new resort listing</p></div>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card><CardHeader><CardTitle>Basic Information</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Title *</Label><Input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea rows={4} value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Location *</Label><Input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} /></div>
              <div><Label>Property Type</Label><Select value={form.property_type} onValueChange={v => setForm(p => ({ ...p, property_type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{propertyTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Pricing & Capacity</CardTitle></CardHeader><CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><Label>Price/Night *</Label><Input type="number" value={form.price_per_night} onChange={e => setForm(p => ({ ...p, price_per_night: e.target.value }))} /></div>
            <div><Label>Max Guests *</Label><Input type="number" value={form.max_guests} onChange={e => setForm(p => ({ ...p, max_guests: e.target.value }))} /></div>
            <div><Label>Bedrooms</Label><Input type="number" value={form.bedrooms} onChange={e => setForm(p => ({ ...p, bedrooms: e.target.value }))} /></div>
            <div><Label>Bathrooms</Label><Input type="number" value={form.bathrooms} onChange={e => setForm(p => ({ ...p, bathrooms: e.target.value }))} /></div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle>Images</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex gap-2"><Input value={form.imageInput} onChange={e => setForm(p => ({ ...p, imageInput: e.target.value }))} className="flex-1" placeholder="Paste image URL..." /><Button type="button" variant="outline" onClick={handleAddImage}><ImagePlus className="h-4 w-4 mr-1" />Add</Button></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{form.images.map((img, i) => <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video"><img src={img} alt="" className="w-full h-full object-cover" /><button type="button" onClick={() => handleRemoveImage(i)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button></div>)}</div>
          </CardContent></Card>
        </div>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Settings</CardTitle></CardHeader><CardContent className="space-y-4">
            <div className="flex items-center justify-between"><Label>Available for booking</Label><Switch checked={form.availability_status} onCheckedChange={v => setForm(p => ({ ...p, availability_status: v }))} /></div>
            <div><Label>Cancellation Policy</Label><Select value={form.cancellation_policy} onValueChange={v => setForm(p => ({ ...p, cancellation_policy: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="flexible">Flexible</SelectItem><SelectItem value="moderate">Moderate</SelectItem><SelectItem value="strict">Strict</SelectItem></SelectContent></Select></div>
            <div><Label>Host Discount (%)</Label><Input type="number" min={0} max={90} value={form.hostDiscountPercent} onChange={e => setForm(p => ({ ...p, hostDiscountPercent: e.target.value }))} /></div>
          </CardContent></Card>
          <Button type="submit" className="w-full" disabled={createResort.isPending}><Save className="h-4 w-4 mr-2" />{createResort.isPending ? 'Creating...' : 'Create Resort Listing'}</Button>
        </div>
      </form>
    </motion.div>
  );
}
