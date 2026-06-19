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
import { MediaUploads, PackageMedia } from './components/MediaUploads';
import { ItineraryDocuments, ItineraryDocument } from './components/ItineraryDocuments';
import { ManualItineraryBuilder, ItineraryDay } from './components/ManualItineraryBuilder';
import { PackagePreviewModal } from './components/PackagePreviewModal';

export default function CreatePackage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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

  const [media, setMedia] = useState<PackageMedia>({
    coverImage: null,
    galleryImages: [],
    destinationImages: [],
    promotionalBanners: []
  });

  const [documents, setDocuments] = useState<ItineraryDocument[]>([]);
  const [itineraryDays, setItineraryDays] = useState<ItineraryDay[]>([]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.name) return 'Package Name is required';
    if (!formData.destination) return 'Destination is required';
    if (!formData.start_date || !formData.end_date) return 'Travel Dates are required';
    if (!formData.max_capacity) return 'Capacity is required';
    if (!formData.adult_price) return 'Adult Price is required';
    if (!media.coverImage) return 'At least one Cover Image is required';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      // 1. Upload Cover Image
      let coverImageUrl = null;
      if (media.coverImage && typeof media.coverImage !== 'string') {
        const fileExt = media.coverImage.name.split('.').pop();
        const filePath = `covers/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('package-gallery')
          .upload(filePath, media.coverImage);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('package-gallery').getPublicUrl(filePath);
        coverImageUrl = publicUrl;
      }

      const inclusionsArray = formData.inclusions.split(',').map(s => s.trim()).filter(Boolean);
      const exclusionsArray = formData.exclusions.split(',').map(s => s.trim()).filter(Boolean);

      // 2. Insert Package
      const { data: pkgData, error: pkgError } = await supabase.from('tour_packages').insert({
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

      if (pkgError) throw pkgError;
      const packageId = pkgData.id;

      // 3. Upload Gallery Images
      for (const img of media.galleryImages) {
        if (typeof img !== 'string') {
          const fileExt = img.name.split('.').pop();
          const filePath = `gallery/${packageId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from('package-gallery').upload(filePath, img);
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('package-gallery').getPublicUrl(filePath);
            await supabase.from('package_gallery').insert({
              package_id: packageId,
              image_url: publicUrl,
              is_cover: false
            });
          }
        }
      }

      // 4. Upload Documents
      for (const doc of documents) {
        const fileExt = doc.file.name.split('.').pop();
        const filePath = `${packageId}/${Date.now()}_${doc.file.name}`;
        const { error: uploadError } = await supabase.storage.from('package-itineraries').upload(filePath, doc.file);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('package-itineraries').getPublicUrl(filePath);
          await supabase.from('package_itineraries').insert({
            package_id: packageId,
            file_url: publicUrl,
            file_type: doc.type,
            uploaded_by: userData.user.id,
            version: 1
          });
        }
      }

      // 5. Insert Manual Itinerary Days
      if (itineraryDays.length > 0) {
        const daysToInsert = itineraryDays.map(day => ({
          package_id: packageId,
          day_number: day.day_number,
          title: day.title,
          description: day.description,
          meals: day.meals ? [day.meals] : [],
          stay_details: day.stay_details,
          activities: day.activities ? [day.activities] : []
        }));
        await supabase.from('package_itinerary_days').insert(daysToInsert);
      }

      toast.success('Package created successfully');
      navigate('/admin/experiences');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Create Experience</h1>
        <PackagePreviewModal formData={formData} media={media} documents={documents} itineraryDays={itineraryDays} />
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package Name <span className="text-destructive">*</span></Label>
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
                <Label>Destination <span className="text-destructive">*</span></Label>
                <Input required value={formData.destination} onChange={e => handleChange('destination', e.target.value)} placeholder="e.g. Coorg" />
              </div>
              <div className="space-y-2">
                <Label>Departure City</Label>
                <Input value={formData.departure_city} onChange={e => handleChange('departure_city', e.target.value)} placeholder="e.g. Hyderabad" />
              </div>
              <div className="space-y-2">
                <Label>Start Date <span className="text-destructive">*</span></Label>
                <Input required type="date" value={formData.start_date} onChange={e => handleChange('start_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Date <span className="text-destructive">*</span></Label>
                <Input required type="date" value={formData.end_date} onChange={e => handleChange('end_date', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Input value={formData.duration} onChange={e => handleChange('duration', e.target.value)} placeholder="e.g. 3D/2N" />
              </div>
              <div className="space-y-2 grid grid-cols-2 gap-2">
                <div>
                  <Label>Min Capacity</Label>
                  <Input type="number" value={formData.min_capacity} onChange={e => handleChange('min_capacity', Number(e.target.value))} />
                </div>
                <div>
                  <Label>Max Capacity <span className="text-destructive">*</span></Label>
                  <Input required type="number" value={formData.max_capacity} onChange={e => handleChange('max_capacity', Number(e.target.value))} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Media Uploads */}
        <MediaUploads media={media} onChange={setMedia} />

        {/* Itinerary Management */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Itinerary Details</h2>
          <div className="grid grid-cols-1 gap-6">
            <ManualItineraryBuilder days={itineraryDays} onChange={setItineraryDays} />
            <ItineraryDocuments documents={documents} onChange={setDocuments} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inclusions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Adult Price <span className="text-destructive">*</span></Label>
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

        <div className="flex justify-end gap-4 border-t pt-6">
          <Button variant="outline" type="button" onClick={() => navigate('/admin/experiences')}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} size="lg">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Package
          </Button>
        </div>
      </form>
    </div>
  );
}
