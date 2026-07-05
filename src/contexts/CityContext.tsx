import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type City = 'hyderabad' | 'bangalore';

const CITY_KEY = 'xplorwing_city';

interface CityContextValue {
  selectedCity: City | null;
  setCity: (city: City) => Promise<void>;
  showCityPicker: boolean;
  setShowCityPicker: (show: boolean) => void;
  cityLoading: boolean;
}

const CityContext = createContext<CityContextValue>({
  selectedCity: null,
  setCity: async () => {},
  showCityPicker: false,
  setShowCityPicker: () => {},
  cityLoading: true,
});

export function CityProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [cityLoading, setCityLoading] = useState(true);

  useEffect(() => {
    // Wait until Supabase auth has resolved before deciding anything.
    // This prevents the guest branch from firing for users whose session
    // is still being restored from localStorage.
    if (authLoading) return;

    const stored = localStorage.getItem(CITY_KEY) as City | null;

    if (!user) {
      // Confirmed guest — no active session.
      // Use localStorage; show picker if nothing is stored.
      setSelectedCity(stored);
      setShowCityPicker(!stored);
      setCityLoading(false);
      return;
    }

    // Authenticated user — check profile first.
    setCityLoading(true);
    supabase
      .from('profiles')
      .select('selected_city')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const profileCity = (data as any)?.selected_city as City | null;
        if (profileCity) {
          // Profile has a city — use it and keep localStorage in sync.
          setSelectedCity(profileCity);
          localStorage.setItem(CITY_KEY, profileCity);
          setShowCityPicker(false);
        } else if (stored) {
          // No profile city but localStorage has one — sync up silently.
          setSelectedCity(stored);
          setShowCityPicker(false);
          supabase
            .from('profiles')
            .update({ selected_city: stored } as any)
            .eq('id', user.id);
        } else {
          // Nothing saved anywhere — show picker.
          setSelectedCity(null);
          setShowCityPicker(true);
        }
        setCityLoading(false);
      });
  }, [user?.id, authLoading]);

  const setCity = async (city: City) => {
    setSelectedCity(city);
    setShowCityPicker(false);
    localStorage.setItem(CITY_KEY, city);
    if (user) {
      await supabase
        .from('profiles')
        .update({ selected_city: city } as any)
        .eq('id', user.id);
    }
  };

  return (
    <CityContext.Provider value={{ selectedCity, setCity, showCityPicker, setShowCityPicker, cityLoading }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity() {
  return useContext(CityContext);
}
