import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/useAuth';

export interface NicheConfig {
  industry: string;
  display_name: string;
  fields_to_collect: { key: string; label: string; type: string; options: string[]; required: boolean }[];
  scoring_signals: string[];
  conversion_goals: string[];
  pipeline_stages: string[];
  booking_types: string[];
  tone_examples: string[];
  labels: Record<string, string>;
  compliance: string[];
}

interface AppContextType {
  niche: NicheConfig | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isClientUser: boolean;
}

export const AppContext = createContext<AppContextType>({ niche: null, loading: true, isSuperAdmin: false, isClientUser: false });

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuth();
  const [niche, setNiche] = useState<NicheConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isClientUser = user?.role !== 'OWNER' && user?.role !== 'ADMIN';

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    api('/tenants/me/myniche').then((data: any) => {
      if (data?.locked && data?.template) {
        setNiche({
          industry: data.tenant?.industry || 'generic',
          display_name: data.template?.name || 'Business',
          fields_to_collect: [],
          scoring_signals: [],
          conversion_goals: [],
          pipeline_stages: [],
          booking_types: [],
          tone_examples: [],
          labels: { lead: 'Lead' },
          compliance: [],
        });
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, [isLoggedIn]);

  return <AppContext.Provider value={{ niche, loading, isSuperAdmin, isClientUser }}>{children}</AppContext.Provider>;
}

export function useApp() { return useContext(AppContext); }
