import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Check } from 'lucide-react';
import { useCity, City } from '@/contexts/CityContext';
import { useRole, isNonTravelerRole } from '@/hooks/useRole';
import hyderabadImg from '@/assets/destinations/hyderabad.jpg';
import bangaloreImg from '@/assets/destinations/bangalore.jpg';

const CITIES = [
  { id: 'hyderabad' as City, label: 'Hyderabad', sub: 'City of Pearls', img: hyderabadImg },
  { id: 'bangalore' as City, label: 'Bangalore', sub: 'Garden City',    img: bangaloreImg },
];

export function CitySelectionModal() {
  const { showCityPicker, setCity, setShowCityPicker, cityLoading, selectedCity } = useCity();
  const { role } = useRole();
  const [selected, setSelected] = useState<City | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (showCityPicker) {
      setSelected(selectedCity);
      setConfirming(false);
    }
  }, [showCityPicker, selectedCity]);

  const close = useCallback(() => setShowCityPicker(false), [setShowCityPicker]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [close]);

  if (isNonTravelerRole(role) || cityLoading) return null;

  const pick = async (city: City) => {
    if (confirming) return;
    setSelected(city);
    setConfirming(true);
    // Artificially delay for animation
    await new Promise(res => setTimeout(res, 1500));
    await setCity(city);
    setConfirming(false);
  };

  const selectedCityObj = CITIES.find(c => c.id === selected);

  return (
    <AnimatePresence>
      {showCityPicker && (
        <motion.div
        key="city-modal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.target === e.currentTarget && !confirming && close()}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.5)' }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative w-full max-w-md p-8 sm:p-9 overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.27)',
            backdropFilter: 'blur(16px) saturate(1.4)',
            WebkitBackdropFilter: 'blur(16px) saturate(1.4)',
            border: '1px solid rgba(255,255,255,0.25)',
            borderRadius: '2rem',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 20px 60px -10px rgba(0,0,0,0.18), 0 0 120px -40px rgba(0,0,0,0.08)',
          }}
        >
          {/* Loading Overlay */}
          <AnimatePresence>
            {confirming && selectedCityObj && (
              <motion.div
                key="loading-overlay"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-auto"
                style={{ background: 'transparent' }}
              >
                <div className="relative w-24 h-24 mb-6">
                  <svg className="animate-spin w-full h-full text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <MapPin className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 text-primary" />
                </div>
                <h3 className="text-3xl font-bold tracking-tight text-center px-4 text-primary" style={{ letterSpacing: '-0.02em' }}>
                  Welcome to {selectedCityObj.label}!
                </h3>
                <p className="text-base font-medium mt-3 text-center px-4 text-primary">
                  Personalizing your experience...
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Content (fades out but keeps height) */}
          <motion.div
            animate={{ opacity: confirming ? 0 : 1, scale: confirming ? 0.95 : 1 }}
            transition={{ duration: 0.3 }}
            className={confirming ? "pointer-events-none" : ""}
          >
            {/* Header */}
          <div className="flex flex-col items-center mb-8 text-center">
            <div 
              className="h-12 w-12 rounded-full flex items-center justify-center mb-4 shadow-sm"
              style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.4)' }}
            >
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2 text-primary" style={{ letterSpacing: '-0.02em' }}>
              Hello Explorers!
            </h2>
            <p className="text-sm font-medium leading-relaxed max-w-[320px] text-primary">
              Choose the City as per your Choice to Book our Services.
            </p>
          </div>

          {/* City Grid */}
          <div className="grid grid-cols-2 gap-4">
            {CITIES.map((city) => {
              const isSel = selected === city.id;
              return (
                <motion.button
                  key={city.id}
                  onClick={() => pick(city.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={confirming}
                  className={`relative rounded-2xl overflow-hidden cursor-pointer group aspect-square shadow-lg transition-shadow border-2 ${
                    isSel ? 'border-primary shadow-xl' : 'border-transparent hover:shadow-2xl'
                  }`}
                >
                  {/* Full-bleed image */}
                  <img
                    src={city.img}
                    alt={city.label}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" />

                  {/* Content at bottom */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col items-center gap-1 z-10 text-center">
                    <h3 className="font-bold text-white text-base leading-tight w-full">{city.label}</h3>
                    <p className="text-[11px] text-white/70 w-full">{city.sub}</p>

                    {/* Select button */}
                    <div className={`mt-2 flex items-center justify-center gap-1 backdrop-blur-sm rounded-lg px-3 py-2 w-[95%] text-xs font-medium transition-colors ${
                      isSel 
                        ? 'bg-primary border border-primary shadow-md text-emerald-950' 
                        : 'bg-white/20 group-hover:bg-white/30 text-white'
                    }`}>
                      {isSel ? (
                        <>
                          <span>Selected</span>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </>
                      ) : (
                        <span>Select City</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
          </motion.div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
