import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Calendar, Users, Clock, Check, X as XIcon, FileText, Plus, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { PdfViewer } from "@/components/PdfViewer";
import { Dialog, DialogContent } from "@/components/ui/dialog";

function GalleryThumb({ img, index, onClick, className }: { img: any; index: number; onClick: (i: number) => void; className?: string }) {
  return (
    <button
      onClick={() => onClick(index)}
      className={`relative rounded-xl overflow-hidden bg-muted block w-full focus:outline-none focus:ring-2 focus:ring-primary group ${className ?? ''}`}
    >
      <img
        src={img.image_url}
        alt={img.caption || `Photo ${index + 1}`}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
    </button>
  );
}

export default function TourPackageDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<any>(null); // Extended to include relations
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [bookedSeats, setBookedSeats] = useState<number>(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchPackage = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from('tour_packages')
        .select(`
          *,
          package_gallery(*),
          package_itineraries(*),
          package_itinerary_days(*)
        `)
        .eq('id', id)
        .single();
        
      if (!error && data) {
        setPkg(data);
        
        // Only count confirmed/completed bookings — pending (unpaid) do not consume seats
        const { data: bookings } = await supabase
          .from('package_bookings')
          .select('id')
          .eq('package_id', id)
          .in('booking_status', ['confirmed', 'completed']);

        if (bookings && bookings.length > 0) {
          const bookingIds = bookings.map(b => b.id);
          const { count } = await supabase
            .from('package_travellers')
            .select('*', { count: 'exact', head: true })
            .in('booking_id', bookingIds);
          
          setBookedSeats(count || 0);
        } else {
          setBookedSeats(0);
        }
      }
      setLoading(false);
    };
    
    fetchPackage();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xl text-muted-foreground">Package not found</p>
        </div>
        <Footer />
      </div>
    );
  }

  const packageOptions = [
    { type: 'Adult Package', price: pkg?.adult_price },
    { type: 'Child Package', price: pkg?.child_price },
    { type: 'Single Sharing', price: pkg?.single_sharing_price },
    { type: 'Twin Sharing', price: pkg?.twin_sharing_price }
  ].filter(opt => opt.price);

  const updateQuantity = (type: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[type] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [type]: next };
    });
  };

  const totalTravellers = Object.values(quantities).reduce((acc, curr) => acc + curr, 0);
  const grandTotal = packageOptions.reduce((acc, opt) => acc + (opt.price * (quantities[opt.type] || 0)), 0);
  const availableSeats = (pkg?.max_capacity || 0) - bookedSeats;

  const handleBooking = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (totalTravellers === 0) {
      toast.error('Please select at least one traveler before continuing.');
      return;
    }
    if (pkg.max_capacity && totalTravellers > availableSeats) {
      toast.error(`Only ${availableSeats} seats are available for this package.`);
      return;
    }

    const selectedPackages = packageOptions
      .filter(opt => quantities[opt.type] > 0)
      .map(opt => ({
        type: opt.type,
        quantity: quantities[opt.type],
        price: opt.price
      }));

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Save booking state so it survives the auth redirect
      localStorage.setItem('pkg_booking_state', JSON.stringify({
        packageId: pkg.id,
        selectedPackages,
        totalTravellers,
        grandTotal,
        ts: Date.now()
      }));
      localStorage.setItem('intended_url', `/experiences/${pkg.id}/book`);
      navigate('/auth');
      return;
    }

    navigate(`/experiences/${pkg.id}/book`, {
      state: { selectedPackages, totalTravellers, grandTotal }
    });
  };

  const itineraryDays = pkg?.package_itinerary_days?.sort((a: any, b: any) => a.day_number - b.day_number) || [];
  const documents = pkg?.package_itineraries || [];
  const galleryImages = (pkg?.package_gallery || []).filter((g: any) => !g.is_cover && !g.is_banner);
  const isPdfDoc = (d: any) =>
    d.file_type === 'application/pdf' ||
    d.file_type === 'pdf' ||
    d.file_url?.toLowerCase().endsWith('.pdf');
  const isImageDoc = (d: any) =>
    d.file_type?.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(d.file_type?.toLowerCase());

  const pdfItinerary = documents.find(isPdfDoc);
  const imageItineraries = documents.filter(isImageDoc);

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      
      {/* Hero Banner */}
      <div className="relative h-[50vh] md:h-[65vh] bg-muted">
        {pkg.cover_image ? (
          <img src={pkg.cover_image} alt={pkg.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center"></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end pb-12">
          <div className="container mx-auto px-4">
            <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider mb-5 inline-block shadow-sm">
              Group Tour • {pkg.category}
            </span>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 drop-shadow-md">{pkg.name}</h1>
            <div className="flex flex-wrap items-center gap-6 text-white/95 font-medium text-lg">
              <div className="flex items-center gap-2 drop-shadow-sm"><MapPin className="h-6 w-6" /> {pkg.destination}</div>
              <div className="flex items-center gap-2 drop-shadow-sm"><Clock className="h-6 w-6" /> {pkg.duration}</div>
              <div className="flex items-center gap-2 drop-shadow-sm"><Calendar className="h-6 w-6" /> Departs: {pkg.start_date}</div>
              <div className="flex items-center gap-2 drop-shadow-sm"><Users className="h-6 w-6" /> Max {pkg.max_capacity} Seats</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-12">
            <section>
              <h2 className="text-2xl font-bold mb-4">Overview</h2>
              <p className="text-muted-foreground leading-relaxed">
                Experience the best of {pkg.destination} with our carefully curated {pkg.duration} itinerary. 
                Departing from {pkg.departure_city}, this {pkg.category.toLowerCase()} offers an unforgettable journey.
              </p>
            </section>

            {galleryImages.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">Photos</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {galleryImages.map((img: any, i: number) => (
                    <GalleryThumb key={img.id || i} img={img} index={i} onClick={setLightboxIndex} className="aspect-square" />
                  ))}
                </div>

                {/* Lightbox */}
                <Dialog open={lightboxIndex !== null} onOpenChange={(o) => !o && setLightboxIndex(null)}>
                  <DialogContent className="max-w-4xl w-full p-0 bg-black border-0 overflow-hidden">
                    {lightboxIndex !== null && (
                      <div className="relative flex items-center justify-center min-h-[60vh]">
                        <img
                          src={galleryImages[lightboxIndex]?.image_url}
                          alt={galleryImages[lightboxIndex]?.caption || `Photo ${lightboxIndex + 1}`}
                          className="max-h-[80vh] max-w-full object-contain"
                        />

                        {galleryImages.length > 1 && (
                          <>
                            <button
                              onClick={() => setLightboxIndex((lightboxIndex - 1 + galleryImages.length) % galleryImages.length)}
                              className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                            >
                              <ChevronLeft className="h-6 w-6" />
                            </button>
                            <button
                              onClick={() => setLightboxIndex((lightboxIndex + 1) % galleryImages.length)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 transition-colors"
                            >
                              <ChevronRight className="h-6 w-6" />
                            </button>
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {galleryImages.map((_: any, i: number) => (
                                <button
                                  key={i}
                                  onClick={() => setLightboxIndex(i)}
                                  className={`h-1.5 rounded-full transition-all ${i === lightboxIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {galleryImages[lightboxIndex]?.caption && (
                          <p className="absolute bottom-8 left-0 right-0 text-center text-white/80 text-sm px-6">
                            {galleryImages[lightboxIndex].caption}
                          </p>
                        )}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-card border rounded-2xl p-8">
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Check className="h-6 w-6 text-green-500" /> Inclusions</h2>
                <ul className="space-y-3">
                  {pkg.inclusions.map((inc: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 mt-2 shrink-0" />
                      <span className="text-muted-foreground">{inc}</span>
                    </li>
                  ))}
                  {pkg.inclusions.length === 0 && <p className="text-muted-foreground">Not specified</p>}
                </ul>
              </section>
              
              <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><XIcon className="h-6 w-6 text-red-500" /> Exclusions</h2>
                <ul className="space-y-3">
                  {pkg.exclusions.map((exc: string, i: number) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                      <span className="text-muted-foreground">{exc}</span>
                    </li>
                  ))}
                  {pkg.exclusions.length === 0 && <p className="text-muted-foreground">Not specified</p>}
                </ul>
              </section>
            </div>

            {/* Itinerary Section */}
            <section className="bg-card border rounded-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold">Detailed Itinerary</h2>
              </div>
              
              {(itineraryDays.length > 0 || pdfItinerary || imageItineraries.length > 0) ? (
                <div className="space-y-8">
                  
                  {pdfItinerary && (
                    <PdfViewer url={pdfItinerary.file_url} />
                  )}

                  {imageItineraries.length > 0 && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                       {imageItineraries.map((img: any, i: number) => (
                         <div key={i} className="rounded-xl overflow-hidden border border-border bg-muted">
                           <img src={img.file_url} alt={`Itinerary Day ${i + 1}`} className="w-full h-auto object-cover" />
                         </div>
                       ))}
                     </div>
                  )}

                  {itineraryDays.length > 0 && (
                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent mt-8">
                      {itineraryDays.map((day: any, i: number) => (
                        <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 font-bold z-10">
                            {day.day_number}
                          </div>
                          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-background shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg">{day.title}</h3>
                            </div>
                            <p className="text-muted-foreground text-sm whitespace-pre-wrap">{day.description}</p>
                            {day.meals && day.meals.length > 0 && day.meals[0] !== "" && (
                              <div className="mt-3 pt-3 border-t text-sm">
                                <span className="font-semibold mr-2">Meals:</span> 
                                {Array.isArray(day.meals) ? day.meals.join(', ') : day.meals}
                              </div>
                            )}
                            {day.stay_details && (
                              <div className="mt-2 text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground mr-2">Stay:</span> 
                                {day.stay_details}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Detailed itinerary will be shared after booking.</p>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar / Booking Card */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 sticky top-24 shadow-sm">
              <h3 className="text-3xl font-bold mb-6 text-primary">
                ₹{grandTotal > 0 ? grandTotal.toLocaleString('en-IN') : pkg.adult_price.toLocaleString('en-IN')} 
                <span className="text-base font-normal text-muted-foreground">{grandTotal > 0 ? ' total' : ' / person'}</span>
              </h3>
              
              <div className="space-y-6 mb-6">
                <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Select Travelers</h4>
                
                <div className="space-y-4">
                  {packageOptions.map((opt) => (
                    <div key={opt.type} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm md:text-base">{opt.type}</div>
                        <div className="text-sm text-muted-foreground">₹{opt.price.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="flex items-center space-x-3 bg-muted rounded-lg p-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-md" 
                          onClick={() => updateQuantity(opt.type, -1)}
                          disabled={(quantities[opt.type] || 0) === 0}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <span className="w-4 text-center font-bold text-sm">{quantities[opt.type] || 0}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 rounded-md" 
                          onClick={() => updateQuantity(opt.type, 1)}
                          disabled={totalTravellers >= availableSeats}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {totalTravellers > 0 && (
                <div className="bg-primary/5 rounded-xl p-4 mb-6 space-y-2 border border-primary/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Available Seats</span>
                    <span className="font-medium">{availableSeats}</span>
                  </div>
                  {packageOptions.filter(opt => quantities[opt.type] > 0).map(opt => (
                    <div key={opt.type} className="flex justify-between text-sm">
                      <span>{opt.type} x {quantities[opt.type]}</span>
                      <span>₹{(opt.price * quantities[opt.type]).toLocaleString('en-IN')}</span>
                    </div>
                  ))}
                  <div className="border-t border-primary/20 pt-2 mt-2 flex justify-between text-sm font-bold">
                    <span>Total Amount</span>
                    <span className="text-primary">₹{grandTotal.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              )}

              <Button 
                className="w-full h-12 text-base rounded-xl font-bold shadow-md" 
                onClick={handleBooking}
                disabled={totalTravellers === 0}
              >
                Continue Booking
              </Button>
            </div>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  );
}
