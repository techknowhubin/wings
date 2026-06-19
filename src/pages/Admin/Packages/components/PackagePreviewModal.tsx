import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, Users, MapPin, Calendar, Clock, Check, X } from 'lucide-react';
import { PackageMedia } from './MediaUploads';
import { ItineraryDocument } from './ItineraryDocuments';
import { ItineraryDay } from './ManualItineraryBuilder';

interface PackagePreviewModalProps {
  formData: any;
  media: PackageMedia;
  documents: ItineraryDocument[];
  itineraryDays: ItineraryDay[];
}

export function PackagePreviewModal({ formData, media, documents, itineraryDays }: PackagePreviewModalProps) {
  const coverUrl = media.coverImage 
    ? (typeof media.coverImage === 'string' ? media.coverImage : URL.createObjectURL(media.coverImage))
    : 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1200&auto=format&fit=crop'; // fallback
    
  const inclusions = formData.inclusions.split(',').map((s: string) => s.trim()).filter(Boolean);
  const exclusions = formData.exclusions.split(',').map((s: string) => s.trim()).filter(Boolean);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="secondary" type="button">
          <Eye className="h-4 w-4 mr-2" />
          Preview Package
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-11/12 max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="p-4 bg-background sticky top-0 z-10 border-b">
          <DialogTitle>Package Preview</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted/10 pb-8">
          {/* Hero Banner */}
          <div className="relative w-full h-[50vh] md:h-[65vh] bg-slate-800">
            <img src={coverUrl} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-end pb-12">
              <div className="container mx-auto px-4 md:px-8">
                <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-5 inline-block shadow-sm">
                  Group Tour • {formData.category || 'Category'}
                </span>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 drop-shadow-md">{formData.name || 'Package Name'}</h1>
                <div className="flex flex-wrap items-center gap-6 text-white/95 font-medium text-lg">
                  <div className="flex items-center gap-2 drop-shadow-sm"><MapPin className="h-6 w-6"/> {formData.destination || 'Destination'}</div>
                  <div className="flex items-center gap-2 drop-shadow-sm"><Clock className="h-6 w-6"/> {formData.duration || 'Duration'}</div>
                  <div className="flex items-center gap-2 drop-shadow-sm"><Calendar className="h-6 w-6"/> Departs: {formData.start_date || 'Start'}</div>
                  <div className="flex items-center gap-2 drop-shadow-sm"><Users className="h-6 w-6"/> Max {formData.max_capacity || '0'} Seats</div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Content */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* Gallery Images (Preview) */}
              {media.galleryImages.length > 0 && (
                <section>
                  <h2 className="text-2xl font-bold mb-4">Gallery</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {media.galleryImages.slice(0, 3).map((img, idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden">
                        <img 
                          src={typeof img === 'string' ? img : URL.createObjectURL(img)} 
                          className="w-full h-full object-cover" 
                          alt="Gallery" 
                        />
                      </div>
                    ))}
                    {media.galleryImages.length > 3 && (
                      <div className="aspect-square rounded-xl bg-muted flex items-center justify-center font-bold text-lg">
                        +{media.galleryImages.length - 3} More
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Itinerary */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold">Itinerary</h2>
                  {documents.length > 0 && (
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download PDF
                    </Button>
                  )}
                </div>
                
                {itineraryDays.length > 0 ? (
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {itineraryDays.map((day) => (
                      <div key={day.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold">
                          {day.day_number}
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm">
                          <div className="flex items-center justify-between space-x-2 mb-1">
                            <h3 className="font-bold text-lg">{day.title || `Day ${day.day_number}`}</h3>
                          </div>
                          <p className="text-muted-foreground text-sm mb-3">{day.description}</p>
                          {(day.meals || day.stay_details || day.activities) && (
                            <div className="text-xs bg-muted/50 p-2 rounded-md space-y-1">
                              {day.meals && <p><strong>Meals:</strong> {day.meals}</p>}
                              {day.stay_details && <p><strong>Stay:</strong> {day.stay_details}</p>}
                              {day.activities && <p><strong>Activities:</strong> {day.activities}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">Itinerary details will be provided soon.</p>
                )}
              </section>

              {/* Inclusions & Exclusions */}
              <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-5">
                  <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center"><Check className="mr-2 h-5 w-5" /> Inclusions</h3>
                  <ul className="space-y-2">
                    {inclusions.length > 0 ? inclusions.map((inc: string, i: number) => (
                      <li key={i} className="flex items-start text-sm"><Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 shrink-0" /> {inc}</li>
                    )) : <li className="text-sm text-muted-foreground">Not specified</li>}
                  </ul>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5">
                  <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center"><X className="mr-2 h-5 w-5" /> Exclusions</h3>
                  <ul className="space-y-2">
                    {exclusions.length > 0 ? exclusions.map((exc: string, i: number) => (
                      <li key={i} className="flex items-start text-sm"><X className="h-4 w-4 text-red-500 mr-2 mt-0.5 shrink-0" /> {exc}</li>
                    )) : <li className="text-sm text-muted-foreground">Not specified</li>}
                  </ul>
                </div>
              </section>

            </div>

            {/* Right Sidebar - Pricing Card */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
                <h3 className="text-3xl font-bold mb-6 text-primary">₹{formData.adult_price || '0'} <span className="text-base font-normal text-muted-foreground">/ person</span></h3>
                
                <div className="space-y-6 mb-8">
                  <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Accommodation Type</h4>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between space-x-2 border p-3 rounded-xl cursor-pointer transition-colors border-primary bg-primary/5">
                      <div className="flex items-center space-x-2">
                        <span className="h-4 w-4 rounded-full border border-primary bg-primary shrink-0 flex items-center justify-center"><span className="h-2 w-2 rounded-full bg-white"/></span>
                        <span className="font-medium">Adult Package</span>
                      </div>
                      <span className="font-semibold">₹{formData.adult_price || '0'}</span>
                    </div>

                    {formData.child_price && (
                      <div className="flex items-center justify-between space-x-2 border p-3 rounded-xl hover:bg-muted opacity-50 cursor-not-allowed">
                        <div className="flex items-center space-x-2">
                          <span className="h-4 w-4 rounded-full border border-input" />
                          <span className="font-medium">Child Package</span>
                        </div>
                        <span className="font-semibold">₹{formData.child_price}</span>
                      </div>
                    )}
                    
                    {formData.single_sharing_price && (
                      <div className="flex items-center justify-between space-x-2 border p-3 rounded-xl hover:bg-muted opacity-50 cursor-not-allowed">
                        <div className="flex items-center space-x-2">
                          <span className="h-4 w-4 rounded-full border border-input" />
                          <span className="font-medium">Single Sharing</span>
                        </div>
                        <span className="font-semibold">₹{formData.single_sharing_price}</span>
                      </div>
                    )}

                    {formData.twin_sharing_price && (
                      <div className="flex items-center justify-between space-x-2 border p-3 rounded-xl hover:bg-muted opacity-50 cursor-not-allowed">
                        <div className="flex items-center space-x-2">
                          <span className="h-4 w-4 rounded-full border border-input" />
                          <span className="font-medium">Twin Sharing</span>
                        </div>
                        <span className="font-semibold">₹{formData.twin_sharing_price}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-primary/5 rounded-lg p-3 flex items-center justify-between text-sm mb-4">
                  <span className="font-medium text-primary">Available Seats</span>
                  <span className="font-bold text-primary">{formData.max_capacity || '0'}</span>
                </div>

                <Button className="w-full h-12 text-base rounded-xl font-bold shadow-md" size="lg">Book Selected Package</Button>
                
                <p className="text-center text-xs text-muted-foreground mt-4">
                  Preview Mode
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
