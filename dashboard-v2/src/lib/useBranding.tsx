import { useState, useEffect, createContext, useContext } from 'react';
import { api } from './api';

interface Branding {
  businessName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  labels: Record<string, string>;
}

const defaultBranding: Branding = {
  businessName: '',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#0B5',
  labels: {},
};

const BrandingContext = createContext<Branding>(defaultBranding);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding);

  const fetchBranding = async () => {
    try {
      const res = await api('/branding');
      setBranding(res);
      document.title = res.businessName || 'Lead Auto';
      if (res.faviconUrl) {
        const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (link) link.href = res.faviconUrl;
      }
      if (res.primaryColor) {
        document.documentElement.style.setProperty('--primary', res.primaryColor);
      }
    } catch {
      document.title = 'Lead Auto';
    }
  };

  useEffect(() => { fetchBranding(); }, []);

  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

export function useBranding() {
  return useContext(BrandingContext);
}
