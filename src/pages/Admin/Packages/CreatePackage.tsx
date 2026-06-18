import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function CreatePackage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    destination: '',
    departure_city: '',
    start_date: '',
    end_date: '',
    duration: '',
    min_capacity: 1,
    max_capacity: 10,
    adult_price: '',
    child_price: '',
    single_sharing_price: '',
    twin_sharing_price: '',
    extra_person_price: '',
    inclusions: '',
    exclusions: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      let coverImageUrl = null;
      if (coverImageFile) {
        const fileExt = coverImageFile.name.split('.').pop();
        const filePath = `covers/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('package-gallery')
          .upload(filePath, coverImageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('package-gallery')
          .getPublicUrl(filePath);
          
        coverImageUrl = publicUrl;
      }

      const inclusionsArray = formData.inclusions.split(',').map(s => s.trim()).filter(Boolean);
      const exclusionsArray = formData.exclusions.split(',').map(s => s.trim()).filter(Boolean);

      const { data, error } = await supabase.from('tour_packages').insert({
        name: formData.name,
        category: formData.category,
        destination: formData.destination,
        departure_city: formData.departure_city,
        start_date: formData.start_date,
        end_date: formData.end_date,
        duration: formData.duration,
        min_capacity: formData.min_capacity,
        max_capacity: formData.max_capacity,
        adult_price: Number(formData.adult_price),
        child_price: formData.child_price ? Number(formData.child_price) : null,
        single_sharing_price: formData.single_sharing_price ? Number(formData.single_sharing_price) : null,
        twin_sharing_price: formData.twin_sharing_price ? Number(formData.twin_sharing_price) : null,
        extra_person_price: formData.extra_person_price ? Number(formData.extra_person_price) : null,
        inclusions: inclusionsArray,
        exclusions: exclusionsArray,
        cover_image: coverImageUrl,
        created_by: userData.user.id,
        status: 'draft'
      }).select().single();

      if (error) throw error;

      toast.success('Package created successfully');
      navigate('/admin/experiences');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Create Experience</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package Name</Label>
                <Input required value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="e.g. Coorg Monsoon Special" />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={v => handleChange('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Weekend Trip">Weekend Trip</SelectItem>
                    <SelectItem value="Fixed Departure">Fixed Departure</SelectItem>
                    <SelectItem value="Group Tour">Group Tour</SelectItem>
                    <SelectItem value="Pilgrimage">Pilgrimage</SelectItem>
                    <SelectItem value="Adventure">Adventure</SelectItem>
                    <SelectItem value="International">International</SelectItem>
                    <SelectItem value="Corporate Tour">Corporate Tour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Destination</Label>
                <Input required value={formData.destination} onChange={e => handleChange('destination', e.target.value)} placeholder="e.g. Coorg" />
              </div>
              <div className="space-y-2">
                <Label>Departure City</Label>
                <Input required value={formData.departure_city} onChange={e => handleChange('departure_city', e.target.value)} placeholder="e.g. Hyderabad" />
              </div>
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input required type="date" value={formData.start_date} onChange={e => handleChange('start_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input required type="date" value={formData.end_date} onChange={e => handleChange('end_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input required value={formData.duration} onChange={e => handleChange('duration', e.target.value)} placeholder="e.g. 3D/2N" />
              </div>
              <div className="space-y-2 grid grid-cols-2 gap-2">
                <div>
                  <Label>Min Capacity</Label>
                  <Input required type="number" value={formData.min_capacity} onChange={e => handleChange('min_capacity', Number(e.target.value))} />
                </div>
                <div>
                  <Label>Max Capacity</Label>
                  <Input required type="number" value={formData.max_capacity} onChange={e => handleChange('max_capacity', Number(e.target.value))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cover Image</Label>
                <Input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCoverImageFile(e.target.files[0]);
                    }
                  }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pricing & inclusions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Adult Price</Label>
                <Input required type="number" value={formData.adult_price} onChange={e => handleChange('adult_price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Child Price</Label>
                <Input type="number" value={formData.child_price} onChange={e => handleChange('child_price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Single Sharing Price</Label>
                <Input type="number" value={formData.single_sharing_price} onChange={e => handleChange('single_sharing_price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Twin Sharing Price</Label>
                <Input type="number" value={formData.twin_sharing_price} onChange={e => handleChange('twin_sharing_price', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Extra Person Price</Label>
                <Input type="number" value={formData.extra_person_price} onChange={e => handleChange('extra_person_price', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Inclusions (comma separated)</Label>
                <Textarea value={formData.inclusions} onChange={e => handleChange('inclusions', e.target.value)} placeholder="Meals, Transport, Guide" />
              </div>
              <div className="space-y-2">
                <Label>Exclusions (comma separated)</Label>
                <Textarea value={formData.exclusions} onChange={e => handleChange('exclusions', e.target.value)} placeholder="Entry tickets, Personal expenses" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Experience
          </Button>
        </div>
      </form>
    </div>
  );
}
