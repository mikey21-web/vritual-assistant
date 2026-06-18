'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/useAuth';
import {
  Building2, Layers, Shield, Globe, Clock, CheckCircle, AlertTriangle,
  Users, PhoneCall, Megaphone, MessageSquare,
} from 'lucide-react';

interface TenantNiche {
  locked: boolean;
  reason?: string;
  tenant?: { id: string; key: string; name: string; industry: string; status: string };
  template?: { id: string; key: string; name: string; industry: string; version: number } | null;
  installedVersion?: number;
  installedAt?: string;
}

export default function ClientWorkspacePage() {
  const { user } = useAuth();
  const [niche, setNiche] = useState<TenantNiche | null>(null);

  useEffect(() => {
    api('/tenants/me/myniche').then(setNiche).catch(() => {});
  }, []);

  if (!niche) return <div className="text-center text-gray-400 py-12">Loading workspace...</div>;

  if (!niche.locked) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <AlertTriangle size={48} className="mx-auto text-amber-400 mb-4" />
        <h2 className="font-semibold text-lg mb-2">No Workspace Configured</h2>
        <p className="text-gray-500 text-sm mb-4">
          {niche.reason || 'Your account is not assigned to any client workspace. Contact your administrator.'}
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left text-xs text-gray-500 space-y-1">
          <p><strong>What this means:</strong> A "niche template" hasn't been assigned to your account yet. Once your admin provisions a template, you will see a fully configured workspace here with custom fields, pipeline stages, campaigns, forms, and messaging templates tailored to your industry.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
            <Building2 size={24} />
          </div>
          <div>
            <h2 className="font-semibold text-lg">{niche.tenant?.name}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
              <span className="flex items-center gap-1"><Globe size={10} /> {niche.tenant?.industry}</span>
              <span className="flex items-center gap-1"><Clock size={10} /> Provisioned {niche.installedAt ? new Date(niche.installedAt).toLocaleDateString() : '-'}</span>
            </div>
          </div>
          <div className="ml-auto">
            <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
              <CheckCircle size={10} /> Active
            </span>
          </div>
        </div>

        {niche.template && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Layers size={14} className="text-blue-600" />
              <span className="font-medium text-sm text-blue-800">Niche Template: {niche.template.name}</span>
            </div>
            <div className="text-xs text-blue-600 space-y-1">
              <div>Industry: <strong>{niche.template.industry}</strong></div>
              <div>Version: <strong>{niche.installedVersion}</strong></div>
              <div>Template Key: <strong>{niche.template.key}</strong></div>
            </div>
            <div className="mt-2 flex items-center gap-1 text-xs text-blue-500">
              <Shield size={10} /> Your workspace is locked to this template. Contact your admin for template changes.
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Users size={14} /> Leads</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><PhoneCall size={14} /> Contacts</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><Megaphone size={14} /> Campaigns</div>
          <div className="text-2xl font-bold">—</div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-1"><MessageSquare size={14} /> Messages</div>
          <div className="text-2xl font-bold">—</div>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="font-medium text-sm mb-3">What's Included in Your Workspace</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
          {[
            'Custom Fields', 'Pipeline Stages', 'Campaigns', 'Lead Forms',
            'Message Templates', 'Scoring Rules', 'Routing Rules',
            'Automation Rules', 'Nurture Sequences', 'Booking Settings',
            'CRM Mappings', 'Reports & Dashboards',
          ].map(item => (
            <div key={item} className="flex items-center gap-1.5 bg-gray-50 rounded px-2.5 py-1.5">
              <CheckCircle size={12} className="text-green-500" />
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
