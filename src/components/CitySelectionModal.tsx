import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin } from 'lucide-react';
import { useCity, City } from '@/contexts/CityContext';
import { useRole, isNonTravelerRole } from '@/hooks/useRole';
import charminarImg from '@/assets/charminar-hyd.jpg';
import hampiImg from '@/assets/hampi-karnataka.jpg';

const CITIES = [
  { id: 'hyderabad' as City, label: 'Hyderabad', sub: 'City of Pearls', img: charminarImg },
  { id: 'bangalore' as City, label: 'Bangalore', sub: 'Garden City',    img: hampiImg     },
];

const ROSE = '#f43f5e';

export function CitySelectionModal() {
  const { showCityPicker, setCity, setShowCityPicker, cityLoading } = useCity();
  const { role } = useRole();
  const [selected,   setSelected]   = useState<City | null>(null);
  const [confirming, setConfirming] = useState(false);

  const close = useCallback(() => setShowCityPicker(false), [setShowCityPicker]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [close]);

  if (isNonTravelerRole(role) || cityLoading || !showCityPicker) return null;

  const pick = async (city: City) => {
    if (confirming) return;
    setSelected(city);
    setConfirming(true);
    await setCity(city);
    setConfirming(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.target === e.currentTarget && close()}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
        style={{ background: 'rgba(10,10,10,0.72)', backdropFilter: 'blur(14px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 32 }}
          animate={{ scale: 1,   opacity: 1, y: 0  }}
          exit={{    scale: 0.9, opacity: 0, y: 32 }}
          transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="flex flex-col items-center"
          style={{ width: '100%', maxWidth: 700 }}
        >
          {/* Pin icon */}
          <div
            className="flex items-center justify-center mb-5"
            style={{
              width: 72, height: 72,
              borderRadius: 20,
              background: 'rgba(255,228,236,0.92)',
            }}
          >
            <MapPin size={32} color={ROSE} strokeWidth={2} />
          </div>

          {/* Heading */}
          <h2
            className="font-extrabold text-white text-center mb-3"
            style={{ fontSize: 'clamp(2rem, 5vw, 2.75rem)', lineHeight: 1.15 }}
          >
            Choose Your City
          </h2>

          {/* Subtitle */}
          <p
            className="text-center mb-10"
            style={{ fontSize: 15, color: 'rgba(255,255,255,0.62)', maxWidth: '36ch', lineHeight: 1.6 }}
          >
            We'll personalise cab services, routes, and destinations based on your city.
          </p>

          {/* City circles */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-10 sm:gap-16 mb-10">
            {CITIES.map((city) => {
              const isSel = selected === city.id;
              return (
                <div key={city.id} className="flex flex-col items-center gap-4">

                  <motion.button
                    onClick={() => pick(city.id)}
                    whileHover={{ scale: 1.05, y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    disabled={confirming}
                    aria-label={`Select ${city.label}`}
                    className="relative cursor-pointer focus-visible:outline-none"
                    style={{
                      width: 210, height: 210,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '3px solid rgba(255,255,255,0.18)',
                      boxShadow: isSel
                        ? '0 16px 48px rgba(0,0,0,0.4)'
                        : '0 8px 32px rgba(0,0,0,0.35)',
                      transition: 'border-color .22s, box-shadow .22s',
                    }}
                  >
                    {/* Photo */}
                    <motion.img
                      src={city.img}
                      alt={city.label}
                      draggable={false}
                      className="absolute inset-0 w-full h-full object-cover"
                      animate={{ scale: isSel ? 1.06 : 1 }}
                      transition={{ duration: 0.35 }}
                    />

                    {/* Ripple on select */}
                    <AnimatePresence>
                      {isSel && (
                        <motion.span
                          key="ripple"
                          initial={{ scale: 0.7, opacity: 0.8 }}
                          animate={{ scale: 1.25, opacity: 0 }}
                          transition={{ duration: 0.55 }}
                          className="absolute inset-0 rounded-full pointer-events-none"
                          style={{ border: '3px solid rgba(255,255,255,0.5)' }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Check badge */}
                    <AnimatePresence>
                      {isSel && (
                        <motion.div
                          key="check"
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ type: 'spring', stiffness: 340, damping: 18 }}
                          className="absolute top-3 right-3 z-10 flex items-center justify-center rounded-full"
                          style={{ width: 30, height: 30, background: ROSE }}
                        >
                          <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
                            <path d="M1 4.5L4 7.5L11 1" stroke="#fff"
                              strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Label */}
                  <div className="text-center">
                    <p style={{ fontSize: 18, fontWeight: 700, color: '#ffffff' }}>{city.label}</p>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{city.sub}</p>
                  </div>

                </div>
              );
            })}
          </div>

          {/* Footer */}
          <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.38)', textAlign: 'center' }}>
            You can change your city anytime from Settings → Profile
          </p>

        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
