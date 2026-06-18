import re

with open("src/pages/Admin/Packages/EditPackage.tsx", "r") as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { useState } from 'react';",
    "import { useState, useEffect } from 'react';"
)
content = content.replace(
    "import { useNavigate } from 'react-router-dom';",
    "import { useNavigate, useParams } from 'react-router-dom';"
)

# 2. Component Name
content = content.replace("export default function CreatePackage() {", "export default function EditPackage() {")

# 3. Add useParams and useEffect
fetch_logic = """
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
"""

content = content.replace("const [loading, setLoading] = useState(false);\n  const navigate = useNavigate();", "const [loading, setLoading] = useState(false);\n  const navigate = useNavigate();\n" + fetch_logic)

# 4. Modify handleSubmit
# We need to change inserting to tour_packages to updating where id=id
content = content.replace(
"""      // 2. Insert Package
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
        adult_price: formData.adult_price,
        child_price: formData.child_price || null,
        single_sharing_price: formData.single_sharing_price || null,
        twin_sharing_price: formData.twin_sharing_price || null,
        extra_person_price: formData.extra_person_price || null,
        inclusions: inclusionsArray,
        exclusions: exclusionsArray,
        cover_image: coverImageUrl,
        created_by: userData.user.id
      }).select().single();

      if (pkgError) throw pkgError;
      const packageId = pkgData.id;""",
"""      // 2. Update Package
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
        adult_price: formData.adult_price,
        child_price: formData.child_price || null,
        single_sharing_price: formData.single_sharing_price || null,
        twin_sharing_price: formData.twin_sharing_price || null,
        extra_person_price: formData.extra_person_price || null,
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
"""
)

# Fix cover image logic to handle strings
content = content.replace(
"""      // 1. Upload Cover Image
      let coverImageUrl = null;
      if (media.coverImage) {""",
"""      // 1. Upload Cover Image
      let coverImageUrl = null;
      if (media.coverImage && typeof media.coverImage !== 'string') {"""
)
content = content.replace(
"""        coverImageUrl = publicUrl;
      }""",
"""        coverImageUrl = publicUrl;
      } else if (typeof media.coverImage === 'string') {
        coverImageUrl = media.coverImage;
      }"""
)

content = content.replace("toast.success('Package created successfully!');", "toast.success('Package updated successfully!');")
content = content.replace("<h1 className=\"text-2xl font-semibold tracking-tight\">Create New Package</h1>", "<h1 className=\"text-2xl font-semibold tracking-tight\">Edit Package</h1>")
content = content.replace("<Button type=\"submit\" disabled={loading}>", "<Button type=\"submit\" disabled={loading}>")
content = content.replace("{loading && <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />}\n            Create Package", "{loading && <Loader2 className=\"mr-2 h-4 w-4 animate-spin\" />}\n            Update Package")

# Ensure gallery images check for type
content = content.replace(
"""        if (media.galleryImages.length > 0) {
          for (const img of media.galleryImages) {""",
"""        if (media.galleryImages.length > 0) {
          for (const img of media.galleryImages) {
            let imgUrl = img;
            if (typeof img !== 'string') {
              const fileExt = img.name.split('.').pop();
              const filePath = `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
              await supabase.storage.from('package-gallery').upload(filePath, img);
              imgUrl = supabase.storage.from('package-gallery').getPublicUrl(filePath).data.publicUrl;
            }"""
)
content = content.replace(
"""            const fileExt = img.name.split('.').pop();
            const filePath = `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            await supabase.storage.from('package-gallery').upload(filePath, img);
            const { data: { publicUrl } } = supabase.storage.from('package-gallery').getPublicUrl(filePath);
            
            await supabase.from('package_gallery').insert({
              package_id: packageId,
              image_url: publicUrl,
              is_cover: false
            });""",
"""            await supabase.from('package_gallery').insert({
              package_id: packageId,
              image_url: imgUrl,
              is_cover: false
            });"""
)

# And documents
content = content.replace(
"""        if (documents.length > 0) {
          for (const doc of documents) {""",
"""        if (documents.length > 0) {
          for (const doc of documents) {
            let docUrl = doc.file;
            if (typeof doc.file !== 'string') {
              const fileExt = doc.file.name.split('.').pop();
              const filePath = `itineraries/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
              await supabase.storage.from('package-itineraries').upload(filePath, doc.file);
              docUrl = supabase.storage.from('package-itineraries').getPublicUrl(filePath).data.publicUrl;
            }"""
)
content = content.replace(
"""            const fileExt = doc.file.name.split('.').pop();
            const filePath = `itineraries/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
            await supabase.storage.from('package-itineraries').upload(filePath, doc.file);
            const { data: { publicUrl } } = supabase.storage.from('package-itineraries').getPublicUrl(filePath);
            
            await supabase.from('package_itineraries').insert({
              package_id: packageId,
              file_url: publicUrl,
              file_type: doc.type
            });""",
"""            await supabase.from('package_itineraries').insert({
              package_id: packageId,
              file_url: docUrl,
              file_type: doc.type
            });"""
)

with open("src/pages/Admin/Packages/EditPackage.tsx", "w") as f:
    f.write(content)

print("Modification complete.")
