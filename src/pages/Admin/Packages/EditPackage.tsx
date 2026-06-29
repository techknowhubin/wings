import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { uploadImage, uploadDocument } from '@/lib/r2-upload';
import { Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { MediaUploads, PackageMedia } from './components/MediaUploads';
import { ItineraryDocuments, ItineraryDocument } from './components/ItineraryDocuments';
import { ManualItineraryBuilder, ItineraryDay } from './components/ManualItineraryBuilder';
import { PackagePreviewModal } from './components/PackagePreviewModal';

export default function EditPackage() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { id } = useParams();

  useEffect(() => {
    if (id) {
      fetchPackageData();
    }
  }, [id]);

  const fetchPackageData = async () => {
    try {
      const { data: pkg, error } = await supabase.from('tour_packages').select(`
        *,
        package_gallery(*),
        package_itineraries(*),
        package_itinerary_days(*)
      `).eq('id', id).single();
      
      if (error) throw error;
      if (pkg) {
        setFormData({
          name: pkg.name || '',
          category: pkg.category || '',
          destination: pkg.destination || '',
          departure_city: pkg.departure_city || '',
          start_date: pkg.start_date || '',
          end_date: pkg.end_date || '',
          duration: pkg.duration || '',
          min_capacity: pkg.min_capacity || 1,
          max_capacity: pkg.max_capacity || 10,
          adult_price: pkg.adult_price || '',
          child_price: pkg.child_price || '',
          single_sharing_price: pkg.single_sharing_price || '',
          twin_sharing_price: pkg.twin_sharing_price || '',
          extra_person_price: pkg.extra_person_price || '',
          inclusions: pkg.inclusions?.join(', ') || '',
          exclusions: pkg.exclusions?.join(', ') || '',
        });

        const cover = pkg.package_gallery?.find((g: any) => g.is_cover);
        const gallery = pkg.package_gallery?.filter((g: any) => !g.is_cover && !g.is_banner);
        setMedia({
          coverImage: cover ? cover.image_url : null,
          galleryImages: gallery?.map((g: any) => g.image_url) || [],
          destinationImages: [],
          promotionalBanners: []
        });

        const docs = pkg.package_itineraries?.map((doc: any) => ({
          file: doc.file_url,
          type: doc.file_type
        })) || [];
        setDocuments(docs);

        const days = pkg.package_itinerary_days?.map((day: any) => ({
          dayNumber: day.day_number,
          title: day.title,
          description: day.description,
          accommodation: day.accommodation || '',
          meals: day.meals || []
        })) || [];
        days.sort((a: any, b: any) => a.dayNumber - b.dayNumber);
        setItineraryDays(days);
      }
    } catch (err: any) {
      toast.error('Failed to load package details: ' + err.message);
    }
  };


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
        const { publicUrl } = await uploadImage(media.coverImage, 'listing-gallery/covers');
        coverImageUrl = publicUrl;
      } else if (typeof media.coverImage === 'string') {
        coverImageUrl = media.coverImage;
      }

      const inclusionsArray = (formData.inclusions || '').split(',').map(s => s.trim()).filter(Boolean);
      const exclusionsArray = (formData.exclusions || '').split(',').map(s => s.trim()).filter(Boolean);

      // 2. Update Package
      const { data: pkgData, error: pkgError } = await supabase.from('tour_packages').update({
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
        cover_image: coverImageUrl || undefined,
        updated_at: new Date().toISOString()
      }).eq('id', id).select().single();

      if (pkgError) throw pkgError;
      const packageId = pkgData.id;

      // Clean up old relations to replace them cleanly
      await supabase.from('package_gallery').delete().eq('package_id', packageId);
      await supabase.from('package_itineraries').delete().eq('package_id', packageId);
      await supabase.from('package_itinerary_days').delete().eq('package_id', packageId);

      // 3. Upload Gallery Images
      for (const img of media.galleryImages) {
        let imageUrl: string | null = null;
        if (typeof img !== 'string') {
          try {
            const { publicUrl } = await uploadImage(img, `listing-gallery/gallery/${packageId}`);
            imageUrl = publicUrl;
          } catch (e: any) {
            console.error('[EditPackage] gallery upload error:', e.message);
          }
        } else {
          imageUrl = img;
        }
        if (imageUrl) {
          await supabase.from('package_gallery').insert({
            package_id: packageId,
            image_url: imageUrl,
            is_cover: false,
          });
        }
      }

      // 4. Upload Documents
      for (const doc of documents) {
        let fileUrl: string | null = null;
        if (typeof doc.file !== 'string') {
          try {
            const { publicUrl } = await uploadDocument(doc.file, `documents/${packageId}`);
            fileUrl = publicUrl;
          } catch (e: any) {
            console.error('[EditPackage] document upload error:', e.message);
          }
        } else {
          fileUrl = doc.file;
        }
        if (fileUrl) {
          await supabase.from('package_itineraries').insert({
            package_id: packageId,
            file_url: fileUrl,
            file_type: doc.type,
            uploaded_by: userData.user.id,
            version: 1,
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

      toast.success('Package updated successfully!');
      navigate('/admin/experiences');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update package');
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
            Update Package
          </Button>
        </div>
      </form>
    </div>
  );
}
