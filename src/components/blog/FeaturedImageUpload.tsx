import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImageIcon, Upload, X, Loader2, Link as LinkIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FeaturedImageUploadProps {
  value: string;
  onChange: (url: string) => void;
}

export default function FeaturedImageUpload({ value, onChange }: FeaturedImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file.'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB.'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `blog/featured/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('blog-images').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('blog-images').getPublicUrl(path);
      onChange(publicUrl);
      toast.success('Featured image uploaded!');
    } catch (e: any) {
      toast.error(e?.message ?? 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) void upload(file);
  };

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        {(['upload', 'url'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize
              ${tab === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            {t === 'upload' ? <><Upload className="h-3 w-3 inline mr-1" />Upload</> : <><LinkIcon className="h-3 w-3 inline mr-1" />URL</>}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && fileRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
            ${value ? 'border-primary/30' : 'border-border hover:border-primary/50'}
            ${uploading ? 'cursor-wait' : ''}`}
        >
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ''; }} />

          {value ? (
            <div className="relative group">
              <img src={value} alt="Featured" className="w-full h-48 object-cover rounded-xl" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-3">
                <Button size="sm" variant="secondary" type="button" onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Replace
                </Button>
                <Button size="sm" variant="destructive" type="button" onClick={(e) => { e.stopPropagation(); onChange(''); }}>
                  <X className="h-3.5 w-3.5 mr-1.5" /> Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
              {uploading ? (
                <><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="text-sm">Uploading…</p></>
              ) : (
                <><ImageIcon className="h-8 w-8" /><p className="text-sm font-medium">Drop image here or click to upload</p><p className="text-xs">JPG, PNG, WebP · Max 10MB</p></>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="flex-1 text-sm"
            />
            <Button type="button" size="sm" onClick={() => { if (urlInput.trim()) { onChange(urlInput.trim()); setUrlInput(''); } }}>
              Set
            </Button>
          </div>
          {value && (
            <div className="relative group rounded-xl overflow-hidden">
              <img src={value} alt="Featured" className="w-full h-48 object-cover" onError={(e) => e.currentTarget.style.display = 'none'} />
              <button type="button" onClick={() => onChange('')}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
