import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, ImagePlus, X, Plus, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useCreateExperience } from '@/hooks/useListings';
import { toast } from 'sonner';
import { createDiscountConfig } from '@/lib/discounts';

const categories = ['Adventure', 'Cultural', 'Food & Drink', 'Nature', 'Wellness', 'Photography', 'Water Sports', 'Trekking', 'Wildlife'];

export function AddExperienceForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createExperience = useCreateExperience();

  const [form, setForm] = useState({
    title: '', description: '', location: '', price_per_person: '',
    category: '', duration: '', group_size: '',
    inclusions: [''] as string[], exclusions: [''] as string[],
    availability_status: true, images: [] as string[], imageInput: '',
    hostDiscountPercent: '',
  });

  const handleAddImage = () => {
    if (form.imageInput.trim()) {
      setForm(p => ({ ...p, images: [...p.images, p.imageInput.trim()], imageInput: '' }));
    }
  };

  const updateListItem = (key: 'inclusions' | 'exclusions', index: number, value: string) => {
    setForm(p => ({ ...p, [key]: p[key].map((item, i) => i === index ? value : item) }));
  };

  const addListItem = (key: 'inclusions' | 'exclusions') => {
    setForm(p => ({ ...p, [key]: [...p[key], ''] }));
  };

  const removeListItem = (key: 'inclusions' | 'exclusions', index: number) => {
    setForm(p => ({ ...p, [key]: p[key].filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.title || !form.location || !form.price_per_person) {
      toast.error('Please fill in all required fields'); return;
    }
    const inclusions = form.inclusions.filter(i => i.trim());
    const exclusions = form.exclusions.filter(i => i.trim());
    try {
      const hostDiscountPercent = Number(form.hostDiscountPercent || 0);
      const discountsConfig = createDiscountConfig(hostDiscountPercent, []);
      await createExperience.mutateAsync({
        host_id: user.id, title: form.title, description: form.description || null,
        location: form.location, price_per_person: Number(form.price_per_person),
        category: form.category || null, duration: form.duration || null,
        group_size: form.group_size ? Number(form.group_size) : null,
        inclusions: inclusions.length > 0 ? inclusions : null,
        exclusions: exclusions.length > 0 ? exclusions : null,
        availability_status: form.availability_status,
        images: form.images.length > 0 ? form.images : null,
        currency: 'INR',
        discounts:
          discountsConfig.hostDiscountPercent > 0 || discountsConfig.coupons.length > 0
            ? discountsConfig
            : null,
        itinerary: null,
        latitude: null, longitude: null, slug: null, tags: null,
      });
      toast.success('Experience listing created!');
      navigate('/host/experiences');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    }
  };

  const set = (key: string, val: any) => setForm(p => ({ ...p, [key]: val }));


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/host/experiences')}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Add New Experience</h1>
          <p className="text-muted-foreground">Create a new tour or activity listing</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Title *</Label><Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Sunset Trek to Triund Peak" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the experience..." rows={4} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Location *</Label><Input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. McLeod Ganj, Himachal Pradesh" /></div>
                <div><Label>Category</Label>
                  <Select value={form.category} onValueChange={v => set('category', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Pricing & Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><Label>Price/Person (₹) *</Label><Input type="number" value={form.price_per_person} onChange={e => set('price_per_person', e.target.value)} placeholder="1500" /></div>
              <div><Label>Duration</Label><Input value={form.duration} onChange={e => set('duration', e.target.value)} placeholder="e.g. 6 hours" /></div>
              <div><Label>Max Group Size</Label><Input type="number" value={form.group_size} onChange={e => set('group_size', e.target.value)} placeholder="12" /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>What's Included</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {form.inclusions.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={e => updateListItem('inclusions', i, e.target.value)} placeholder="e.g. Guide, Lunch, Transport" className="flex-1" />
                  {form.inclusions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem('inclusions', i)}><Minus className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addListItem('inclusions')}><Plus className="h-3 w-3 mr-1" /> Add inclusion</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Exclusions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {form.exclusions.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={e => updateListItem('exclusions', i, e.target.value)} placeholder="e.g. Personal expenses" className="flex-1" />
                  {form.exclusions.length > 1 && <Button type="button" variant="ghost" size="icon" onClick={() => removeListItem('exclusions', i)}><Minus className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => addListItem('exclusions')}><Plus className="h-3 w-3 mr-1" /> Add exclusion</Button>
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
          <Button type="submit" className="w-full" disabled={createExperience.isPending}>
            <Save className="h-4 w-4 mr-2" />{createExperience.isPending ? 'Creating...' : 'Create Experience Listing'}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
