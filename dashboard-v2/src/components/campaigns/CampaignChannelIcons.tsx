import React from 'react';
import { Facebook, Globe, Mail, MessageSquare, MessageCircle } from 'lucide-react';

const CHANNEL_ICONS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  facebook: { label: 'Facebook', color: '#1877F2', icon: Facebook },
  google: { label: 'Google', color: '#4285F4', icon: Globe },
  email: { label: 'Email', color: '#EA4335', icon: Mail },
  sms: { label: 'SMS', color: '#34A853', icon: MessageSquare },
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: MessageCircle },
  'direct-mail': { label: 'Direct Mail', color: '#8B5CF6', icon: Mail },
  'direct mail': { label: 'Direct Mail', color: '#8B5CF6', icon: Mail },
};

interface CampaignChannelIconsProps {
  channels: string[];
  size?: number;
  showLabel?: boolean;
  max?: number;
}

export default function CampaignChannelIcons({ channels, size = 16, showLabel, max = 5 }: CampaignChannelIconsProps) {
  const visible = channels.slice(0, max);
  const overflow = channels.length - max;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((ch) => {
        const info = CHANNEL_ICONS[ch.toLowerCase()] || { label: ch, color: '#666', icon: Mail };
        const Icon = info.icon;
        return (
          <span
            key={ch}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium"
            style={{ color: info.color }}
            title={info.label}
          >
            <Icon size={size} />
            {showLabel && info.label}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px] text-[var(--muted-foreground)]">+{overflow}</span>
      )}
    </div>
  );
}
