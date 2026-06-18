import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Share2, Megaphone, Check, X, MapPin, Calendar, Clock, Users, IndianRupee, FileText, Download } from 'lucide-react';
import { TourPackage } from '@/types/tour-packages';

interface HubPackageDetailsModalProps {
  pkg: any | null; // using any to bypass strict type since we have nested data now
  assignment: any;
  isOpen: boolean;
  onClose: () => void;
  onTogglePublish: (id: string, status: string) => void;
}

export function HubPackageDetailsModal({ pkg, assignment, isOpen, onClose, onTogglePublish }: HubPackageDetailsModalProps) {
  if (!pkg || !assignment) return null;

  const isPublished = assignment.status === 'published';
  
  // Safe extraction of related arrays
  const gallery = pkg.package_gallery || [];
  const itineraries = pkg.package_itineraries || [];
  const itineraryDays = [...(pkg.package_itinerary_days || [])].sort((a, b) => a.day_number - b.day_number);
  
  // Capacity calculations (mocking booked seats as 0 if not present since we don't have departure linked here)
  const totalCapacity = pkg.max_capacity || 0;
  const bookedSeats = pkg.booked_seats || 0; 
  const availableSeats = Math.max(0, totalCapacity - bookedSeats);
  const occupancyPercent = totalCapacity > 0 ? Math.round((bookedSeats / totalCapacity) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-11/12 max-h-[95vh] overflow-y-auto p-0 gap-0 bg-background">
        <DialogHeader className="p-4 bg-muted/30 sticky top-0 z-20 border-b flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-xl">Package Details</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">Review complete package information before publishing.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant={isPublished ? "outline" : "default"} onClick={() => onTogglePublish(assignment.id, assignment.status)}>
              {isPublished ? 'Unpublish Package' : 'Publish Package'}
            </Button>
            <Button variant="outline" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Hero & Basic Info */}
            <div className="space-y-4">
              <div className="rounded-xl overflow-hidden relative h-72 border">
                <img 
                  src={pkg.cover_image || 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1200'} 
                  alt="Cover" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm ${
                    isPublished ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                  }`}>
                    {assignment.status}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">{pkg.category}</span>
                  <span className="text-xs text-muted-foreground uppercase font-bold">Status: {pkg.status}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold mb-3">{pkg.name}</h1>
                <div className="flex flex-wrap items-center gap-5 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4"/> {pkg.destination} (From {pkg.departure_city})</span>
                  <span className="flex items-center gap-1.5"><Clock className="h-4 w-4"/> {pkg.duration}</span>
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4"/> {new Date(pkg.start_date).toLocaleDateString()} - {new Date(pkg.end_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Media Gallery */}
            {gallery.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-bold text-xl border-b pb-2">Media Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {gallery.map((img: any, i: number) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border">
                      <img src={img.image_url} alt="Gallery" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusions & Exclusions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/20 p-5 rounded-xl border border-green-100 dark:border-green-900/30">
                <h3 className="font-semibold text-green-800 dark:text-green-400 mb-3 flex items-center"><Check className="h-4 w-4 mr-2" /> Inclusions</h3>
                <ul className="space-y-2 text-sm text-green-700 dark:text-green-500">
                  {pkg.inclusions?.length ? pkg.inclusions.map((inc: string, i: number) => (
                    <li key={i} className="flex items-start"><Check className="h-3.5 w-3.5 mr-2 mt-0.5 shrink-0"/> {inc}</li>
                  )) : <li>No inclusions specified</li>}
                </ul>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-xl border border-red-100 dark:border-red-900/30">
                <h3 className="font-semibold text-red-800 dark:text-red-400 mb-3 flex items-center"><X className="h-4 w-4 mr-2" /> Exclusions</h3>
                <ul className="space-y-2 text-sm text-red-700 dark:text-red-500">
                  {pkg.exclusions?.length ? pkg.exclusions.map((exc: string, i: number) => (
                    <li key={i} className="flex items-start"><X className="h-3.5 w-3.5 mr-2 mt-0.5 shrink-0"/> {exc}</li>
                  )) : <li>No exclusions specified</li>}
                </ul>
              </div>
            </div>

            {/* Itinerary Section */}
            <div className="space-y-6">
              <h3 className="font-bold text-xl border-b pb-2">Itinerary</h3>
              
              {/* Documents */}
              {itineraries.length > 0 && (
                <div className="grid gap-3">
                  <h4 className="font-semibold text-sm text-muted-foreground">Attached Documents</h4>
                  {itineraries.map((doc: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-500" />
                        <span className="text-sm font-medium">{doc.file_type.toUpperCase()} Document</span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => window.open(doc.file_url, '_blank')}>
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Day by Day */}
              {itineraryDays.length > 0 && (
                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent pt-4">
                  {itineraryDays.map((day: any) => (
                    <div key={day.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 font-bold">
                        {day.day_number}
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-5 rounded-xl border bg-card shadow-sm">
                        <h4 className="font-bold text-lg mb-2">{day.title || `Day ${day.day_number}`}</h4>
                        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{day.description}</p>
                        
                        {(day.meals?.length > 0 || day.stay_details || day.activities?.length > 0) && (
                          <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-2">
                            {day.meals?.length > 0 && <p><span className="font-semibold text-foreground">Meals:</span> {day.meals.join(', ')}</p>}
                            {day.stay_details && <p><span className="font-semibold text-foreground">Stay:</span> {day.stay_details}</p>}
                            {day.activities?.length > 0 && <p><span className="font-semibold text-foreground">Activities:</span> {day.activities.join(', ')}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {itineraries.length === 0 && itineraryDays.length === 0 && (
                <p className="text-sm text-muted-foreground">No itinerary details provided.</p>
              )}
            </div>

          </div>

          {/* Sidebar Area */}
          <div className="space-y-6">
            
            {/* Pricing Card */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg border-b pb-3 mb-4">Pricing Breakdown</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Adult Price</span>
                  <span className="font-bold text-xl">₹{pkg.adult_price}</span>
                </div>
                {pkg.child_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Child Price</span>
                    <span className="font-medium text-lg">₹{pkg.child_price}</span>
                  </div>
                )}
                {pkg.single_sharing_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Single Sharing</span>
                    <span className="font-medium text-lg">₹{pkg.single_sharing_price}</span>
                  </div>
                )}
                {pkg.twin_sharing_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Twin Sharing</span>
                    <span className="font-medium text-lg">₹{pkg.twin_sharing_price}</span>
                  </div>
                )}
                {pkg.extra_person_price && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Extra Person</span>
                    <span className="font-medium text-lg">₹{pkg.extra_person_price}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Capacity Card */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg border-b pb-3 mb-4">Capacity Status</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Total Capacity</span>
                  <span className="font-medium">{totalCapacity} Seats</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Booked Seats</span>
                  <span className="font-medium text-amber-600">{bookedSeats} Seats</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Available Seats</span>
                  <span className="font-bold text-emerald-600">{availableSeats} Seats</span>
                </div>
                <div className="pt-2">
                  <div className="flex justify-between items-center text-xs mb-1">
                    <span className="font-semibold">Occupancy</span>
                    <span>{occupancyPercent}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="bg-primary rounded-full h-2" style={{ width: `${occupancyPercent}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Assignment Info */}
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg border-b pb-3 mb-4">Assignment Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assignment Date</span>
                  <span className="font-medium">{new Date(assignment.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{assignment.status}</span>
                </div>
              </div>
            </div>

            {/* Hub Permissions Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg border-b border-primary/10 pb-3 mb-4">Hub Permissions</h3>
              
              <div className="space-y-4">
                <div className="space-y-2.5">
                  <h4 className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center"><Check className="h-4 w-4 mr-1.5"/> Allowed Actions</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground ml-1">
                    <li className="flex items-center gap-2"><Eye className="h-3.5 w-3.5"/> View full details</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5"/> Publish & Unpublish</li>
                    <li className="flex items-center gap-2"><Megaphone className="h-3.5 w-3.5"/> Promote to customers</li>
                    <li className="flex items-center gap-2"><Share2 className="h-3.5 w-3.5"/> Share package link</li>
                  </ul>
                </div>
                
                <div className="space-y-2.5 pt-2">
                  <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center"><X className="h-4 w-4 mr-1.5"/> Restricted Actions</h4>
                  <ul className="text-sm space-y-2 text-muted-foreground opacity-70 ml-1">
                    <li className="flex items-center gap-2 line-through"><IndianRupee className="h-3.5 w-3.5"/> Edit Pricing (Read-only)</li>
                    <li className="flex items-center gap-2 line-through"><Calendar className="h-3.5 w-3.5"/> Edit Travel Dates (Read-only)</li>
                    <li className="flex items-center gap-2 line-through"><Clock className="h-3.5 w-3.5"/> Edit Itinerary (Read-only)</li>
                    <li className="flex items-center gap-2 line-through"><X className="h-3.5 w-3.5"/> Delete Package (Read-only)</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button variant="outline" className="w-full bg-white dark:bg-transparent" disabled={!isPublished}>
                <Share2 className="h-4 w-4 mr-2" /> Share
              </Button>
              <Button variant="default" className="w-full" disabled={!isPublished}>
                <Megaphone className="h-4 w-4 mr-2" /> Promote
              </Button>
            </div>
            
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
