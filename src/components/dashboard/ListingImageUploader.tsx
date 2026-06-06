import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ImagePlus, Star, X } from "lucide-react";
import { toast } from "sonner";

interface ListingImageUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  /** Set the first image as the "featured/thumbnail" image */
  showFeaturedBadge?: boolean;
  label?: string;
  maxFiles?: number;
}

const BUCKET = "listings";

export function ListingImageUploader({
  images,
  onImagesChange,
  showFeaturedBadge = true,
  label = "Click to upload photos",
  maxFiles = 20,
}: ListingImageUploaderProps) {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    const remaining = maxFiles - images.length;
    if (remaining <= 0) {
      toast.error(`Maximum ${maxFiles} images allowed.`);
      return;
    }

    setIsUploading(true);
    const newImages = [...images];

    try {
      const filesToUpload = Array.from(files).slice(0, remaining);

      for (const file of filesToUpload) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is larger than 5 MB — skipped.`);
          continue;
        }
        if (!file.type.startsWith("image/")) {
          toast.error(`${file.name} is not an image — skipped.`);
          continue;
        }

        const ext = file.name.split(".").pop() ?? "jpg";
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(filePath, file, { contentType: file.type });

        if (uploadError) {
          const msg = uploadError.message.toLowerCase();
          if (msg.includes("bucket not found") || msg.includes("not found")) {
            toast.error(
              'Storage bucket "listings" not found. Go to Supabase Dashboard → Storage → New Bucket → name: listings → Public: ON.',
              { duration: 8000 }
            );
            break;
          }
          if (msg.includes("row-level security") || msg.includes("violates") || msg.includes("security policy")) {
            toast.error(
              'Upload blocked by storage permissions. In Supabase Dashboard → SQL Editor, run:\n\nCREATE POLICY "listings_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = \'listings\');\nCREATE POLICY "listings_select" ON storage.objects FOR SELECT TO public USING (bucket_id = \'listings\');',
              { duration: 12000 }
            );
            break;
          }
          toast.error(`Upload failed for ${file.name}: ${uploadError.message}`);
          continue;
        }

        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
        newImages.push(data.publicUrl);
      }

      if (newImages.length > images.length) {
        onImagesChange(newImages);
        toast.success(`${newImages.length - images.length} image(s) uploaded.`);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image(s). Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  const setAsFeatured = (index: number) => {
    if (index === 0) return;
    const reordered = [...images];
    const [item] = reordered.splice(index, 1);
    reordered.unshift(item);
    onImagesChange(reordered);
    toast.success("Featured image updated.");
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          className="w-full h-14 border-dashed border-2 gap-2 text-muted-foreground hover:text-foreground hover:border-primary transition-colors"
          disabled={isUploading || images.length >= maxFiles}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
          <span>
            {isUploading
              ? "Uploading…"
              : images.length >= maxFiles
              ? `Maximum ${maxFiles} images reached`
              : `${label} (${images.length}/${maxFiles})`}
          </span>
        </Button>
        <p className="text-xs text-muted-foreground mt-1.5 ml-1">
          JPG, PNG, WebP · Max 5 MB each · First image is shown as the featured thumbnail.
          {showFeaturedBadge && images.length > 1 && " Click ★ on any image to make it the featured photo."}
        </p>
      </div>

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <div
              key={img + i}
              className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-muted/30"
            >
              <img src={img} alt="" className="w-full h-full object-cover" />

              {/* Featured badge */}
              {showFeaturedBadge && i === 0 && (
                <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                  <Star className="h-2.5 w-2.5 fill-white" /> Featured
                </span>
              )}

              {/* Set as featured button */}
              {showFeaturedBadge && i > 0 && (
                <button
                  type="button"
                  title="Set as featured"
                  onClick={() => setAsFeatured(i)}
                  className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full bg-black/50 text-amber-300 hover:bg-amber-500 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Star className="h-3 w-3" />
                </button>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveImage(i)}
                className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-destructive transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>

              {/* Index label */}
              <span className="absolute bottom-1.5 right-1.5 bg-black/50 text-white text-[9px] px-1 py-0.5 rounded">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
