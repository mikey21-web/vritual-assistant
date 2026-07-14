import { useState, useRef, useEffect } from 'react';
import { motion, useScroll } from 'framer-motion';
import {
  ArrowRight, Check, Bot, MessageSquare, BarChart3,
  Globe, Zap, Shield, Users, Target, Phone,
  MessageCircle, Route, ShoppingCart, Link, Smartphone,
  Webhook, QrCode, Send, Building2, Calendar,
} from 'lucide-react';
import { getPrimaryColor, getNicheName } from '../lib/niche-config';

const reduced = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : true;

const nicheContent: Record<string, {
  name: string;
  tagline: string;
  hero: string[];
  heroHighlight: string;
  description: string;
  badge: string;
  channels: { label: string; icon: any; color?: string }[];
  features: { icon: any; title: string; desc: string }[];
  painPoints: string[];
  solutions: string[];
}> = {
  agency: {
    name: 'LeadFlow',
    tagline: 'Omnichannel Lead Automation',
    hero: ['Your leads never', 'wait for a reply', 'ever again'],
    heroHighlight: 'ever again',
    description: 'AI agent that captures, qualifies, and converts leads across WhatsApp, chat, email, SMS, and phone, 24/7. Then pushes everything to your CRM.',
    badge: 'Omnichannel Lead Automation',
    channels: [
      { label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
      { label: 'SMS', icon: Smartphone },
      { label: 'Web Widget', icon: Globe, color: '#2563eb' },
      { label: 'Voice', icon: Phone },
      { label: 'Email', icon: MessageSquare },
      { label: 'QR Codes', icon: QrCode },
      { label: 'Telegram', icon: Send, color: '#0088cc' },
    ],
    features: [
      { icon: MessageCircle, title: 'Captures everywhere', desc: 'Chat widget, WhatsApp, SMS, web forms, QR codes, Telegram, social media, phone calls, all route to one inbox.' },
      { icon: Bot, title: 'AI qualifies automatically', desc: 'AI responds in your brand voice. Asks qualifying questions, extracts budget/timeline, scores leads, books appointments.' },
      { icon: Route, title: 'Nurtures on schedule', desc: 'Multi-step sequences over WhatsApp, email, and SMS. Conditional branches, booking links, re-engagement logic.' },
      { icon: Target, title: 'Scores & routes', desc: 'Rule-based scoring (budget, urgency, behavior). Hot leads go to senior reps.' },
      { icon: BarChart3, title: 'Analytics in real-time', desc: 'Pipeline view, source performance, conversion tracking, team metrics.' },
      { icon: Link, title: 'Pushes to CRM', desc: 'HubSpot, Salesforce, Zoho, or 400+ tools via n8n. Custom field mapping.' },
    ],
    painPoints: ['Leads sit for hours before anyone replies', 'Follow-ups get forgotten or delayed', 'Data scattered across 4-5 separate tools', 'Hot leads go cold waiting for attention', 'No visibility into pipeline or conversion'],
    solutions: ['AI responds in under 30 seconds, 24/7', 'Automated follow-ups across every channel', 'Everything unified in one dashboard', 'Smart scoring routes hot leads instantly', 'Real-time analytics and conversion tracking'],
  },
  realestate: {
    name: 'PropConnect',
    tagline: 'Real Estate Lead Conversion Platform',
    hero: ['Never lose a', 'buyer to slow', 'follow-up again'],
    heroHighlight: 'slow follow-up',
    description: 'AI agent that responds to buyer inquiries on WhatsApp 24/7, qualifies budget and preferences, sends listings, schedules showings, and tracks every deal from inquiry to close.',
    badge: 'Real Estate Lead Automation',
    channels: [
      { label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
      { label: 'SMS', icon: Smartphone },
      { label: 'Website Widget', icon: Globe, color: '#2563eb' },
      { label: 'Voice', icon: Phone },
      { label: 'Property Portal', icon: Building2 },
      { label: 'QR Codes', icon: QrCode },
    ],
    features: [
      { icon: MessageCircle, title: 'WhatsApp-first lead capture', desc: 'Buyers message you on WhatsApp. AI responds instantly, qualifies budget & area, sends matching listings.' },
      { icon: Bot, title: 'AI buyer qualification', desc: 'Extracts budget, property type, location preference, timeline. Automatically scores and segments.' },
      { icon: Calendar, title: 'Showing scheduler', desc: 'Syncs with your calendar. Sends available slots, confirms showings, sends reminders.' },
      { icon: Target, title: 'Smart deal pipeline', desc: 'Track every buyer from inquiry → showing → offer → closing. Know your pipeline in real-time.' },
      { icon: BarChart3, title: 'Agent performance', desc: 'See which listings get inquiries, response times, conversion rates. Data-driven selling.' },
      { icon: Link, title: 'Push to CRM', desc: 'Sync leads to your existing CRM. Never double-enter data.' },
    ],
    painPoints: ['Buyers message at night — no reply till morning', 'Hot leads go cold waiting for listing details', 'Follow-ups slip through the cracks', 'No unified view of active deals', 'Manual data entry into CRM'],
    solutions: ['AI responds in seconds, 24/7', 'Auto-sends matching listings instantly', 'Automated follow-up sequences', 'Pipeline view from inquiry to close', 'Auto-syncs to your CRM'],
  },
  hospitality: {
    name: 'StayHub',
    tagline: 'Hotel Guest Communication Platform',
    hero: ['Every guest gets', 'a 5-star check-in', 'starting with the first message'],
    heroHighlight: '5-star check-in',
    description: 'AI concierge that handles guest inquiries, booking confirmations, check-in instructions, room service requests, and feedback collection — all over WhatsApp.',
    badge: 'Hospitality Guest Automation',
    channels: [
      { label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
      { label: 'Website Widget', icon: Globe, color: '#2563eb' },
      { label: 'Voice', icon: Phone },
      { label: 'QR Codes', icon: QrCode },
      { label: 'Email', icon: MessageSquare },
    ],
    features: [
      { icon: MessageCircle, title: 'WhatsApp guest messaging', desc: 'Confirmations, check-in details, WiFi codes, and concierge requests — all on WhatsApp.' },
      { icon: Bot, title: 'AI concierge 24/7', desc: 'Guests ask about amenities, room service, checkout, local attractions. AI answers instantly.' },
      { icon: Calendar, title: 'Booking management', desc: 'Manage inquiries, holds, confirmations, and cancellations. Integrated with your calendar.' },
      { icon: Target, title: 'Guest preference tracking', desc: 'Store room preferences, dietary needs, special requests. Personalized stays every time.' },
      { icon: BarChart3, title: 'Review management', desc: 'Auto-request reviews after checkout. Monitor Google rating. Respond to feedback.' },
      { icon: Link, title: 'Channel sync', desc: 'Connect Booking.com, Expedia, Agoda. Unified booking inbox.' },
    ],
    painPoints: ['Guests text late — no one replies', 'Check-in info sent manually every time', 'Review requests get forgotten', 'No guest preference memory', 'Multiple booking channels, no unified view'],
    solutions: ['AI replies instantly, 24/7', 'Auto-sends check-in details before arrival', 'Auto-review requests after checkout', 'Guest profile with past preferences', 'Unified booking inbox'],
  },
  healthcare: {
    name: 'CareConnect',
    tagline: 'Clinic Patient Communication Platform',
    hero: ['Patients get', 'answers in seconds,', 'not on hold'],
    heroHighlight: 'in seconds',
    description: 'AI assistant that handles appointment booking, prescription refills, lab result delivery, and FAQ — all over WhatsApp. No call waiting, no missed patients.',
    badge: 'Healthcare Patient Automation',
    channels: [
      { label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
      { label: 'Website Widget', icon: Globe, color: '#2563eb' },
      { label: 'SMS', icon: Smartphone },
      { label: 'Voice', icon: Phone },
    ],
    features: [
      { icon: MessageCircle, title: 'WhatsApp patient communication', desc: 'Appointment reminders, follow-ups, prescription refills, lab results — all on WhatsApp.' },
      { icon: Bot, title: 'AI patient assistant', desc: 'Answers FAQs (timings, fees, doctor availability). Books appointments 24/7.' },
      { icon: Calendar, title: 'Appointment scheduling', desc: 'Patients book from WhatsApp or website. Auto-confirm, reschedule, cancel.' },
      { icon: Target, title: 'Patient intake forms', desc: 'Pre-visit forms sent automatically. Collect history before the appointment.' },
      { icon: BarChart3, title: 'Clinic analytics', desc: 'No-show rates, peak hours, popular services. Data-driven scheduling.' },
      { icon: Shield, title: 'Consent & compliance', desc: 'Built-in consent management. DPDP compliant. Full audit trail.' },
    ],
    painPoints: ['Phone rings constantly for appointment bookings', 'Patients forget appointments — high no-show rate', 'Lab result delivery is manual', 'Same questions answered repeatedly', 'Paper forms take up visit time'],
    solutions: ['AI books appointments 24/7', 'Auto-reminders cut no-shows', 'Lab results delivered on WhatsApp', 'AI handles FAQ instantly', 'Digital pre-visit forms'],
  },
  logistics: {
    name: 'FreightConnect',
    tagline: 'Logistics & Transport Lead Platform',
    hero: ['Shipment inquiries', 'get answers before', 'the truck rolls out'],
    heroHighlight: 'before the truck rolls',
    description: 'AI agent that handles shipping inquiries, provides quotes, books shipments, and tracks deliveries across WhatsApp and web. No more missed freight opportunities.',
    badge: 'Logistics Lead Automation',
    channels: [
      { label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
      { label: 'Website Widget', icon: Globe, color: '#2563eb' },
      { label: 'SMS', icon: Smartphone },
      { label: 'Voice', icon: Phone },
    ],
    features: [
      { icon: MessageCircle, title: 'WhatsApp shipment inquiries', desc: 'Shippers ask for quotes, book shipments, track deliveries — all on WhatsApp.' },
      { icon: Bot, title: 'AI quoting agent', desc: 'Asks origin/destination, weight, timeline. Generates instant quotes. Books directly.' },
      { icon: Calendar, title: 'Pickup scheduling', desc: 'Shippers choose pickup windows. Auto-assigns to nearest driver.' },
      { icon: Target, title: 'Shipment pipeline', desc: 'Track every inquiry from quote → booked → picked up → delivered. Pipeline visibility.' },
      { icon: BarChart3, title: 'Operations dashboard', desc: 'Quote conversion, driver performance, on-time delivery rates.' },
      { icon: Link, title: 'Carrier network', desc: 'Manage partner carriers, rate cards, and capacity allocation.' },
    ],
    painPoints: ['Quote requests pile up — slow response loses business', 'Back-and-forth calls for shipment details', 'No record of inquiry-to-booking conversion', 'Carrier assignment is manual', 'Delivery status updates require calls'],
    solutions: ['AI quotes instantly, 24/7', 'WhatsApp-based self-service booking', 'Pipeline tracking from inquiry to delivery', 'Auto-carrier assignment', 'Real-time delivery status updates'],
  },
};

const defaultContent = nicheContent.agency;
let currentNiche = '';

function getContent() {
  const n = getNicheName();
  if (n !== currentNiche) currentNiche = n;
  return nicheContent[n] || defaultContent;
}

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); o.unobserve(el); } }, { threshold });
    o.observe(el);
    return () => o.disconnect();
  }, [threshold]);
  return [ref, inView] as const;
}

export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const { scrollY } = useScroll();
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const [activeSlide, setActiveSlide] = useState(0);

  const prim = getPrimaryColor();
  const accent = prim || '#0d6b6b';
  const accentDim = `${accent}14`;
  const accentBorder = `${accent}33`;
  const t = { accent, accentDim, accentBorder, warm: '#d97706', warmDim: 'rgba(217,119,6,0.08)', text: '#171717', muted: '#6b7280', border: '#e5e7eb', bg: '#faf9f6', card: '#ffffff' };

  const c = getContent();

  const slides = [
    {
      tab: 'Live Chat',
      content: (
        <div className="p-5 space-y-3">
          {[
            { role: 'Visitor', name: 'Rahul', msg: 'Hi, looking for event planning for 500 attendees.' },
            { role: 'AI', name: 'AI Agent', msg: 'Great! What dates and budget are you looking at?' },
            { role: 'Visitor', name: 'Rahul', msg: 'March 2027, around $50k-$75k.' },
            { role: 'AI', name: 'AI Agent', msg: 'Perfect. I\'ve qualified you as a hot lead. Let me book a call.', active: true },
          ].map((m, i) => (
            <div key={i} className={`flex items-start gap-2.5 ${m.role === 'AI' ? '' : ''}`}>
              <div className={`h-6 w-6 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-[9px] font-bold ${m.role === 'AI' ? 'text-white' : 'text-[#6b7280]'}`}
                style={{ background: m.role === 'AI' ? t.accent : '#f3f2ef' }}>
                {m.role === 'AI' ? 'AI' : 'R'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: m.role === 'AI' ? t.accent : t.text }}>{m.name}</span>
                  <span className="text-[9px]" style={{ color: t.muted }}>{['2m ago', '1m ago', '30s ago', 'now'][i]}</span>
                </div>
                <div className={`text-xs leading-relaxed ${m.active ? 'font-medium' : ''}`} style={{ color: m.active ? t.text : t.muted }}>{m.msg}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: 'Lead Profile',
      content: (
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: t.border }}>
            <img src="https://ui-avatars.com/api/?name=Rahul+Mehta&background=ecfdf5&color=0d6b6b&size=32&font-size=0.35" className="h-8 w-8 rounded-full" alt="" />
            <div>
              <div className="text-sm font-semibold">Rahul Mehta</div>
              <div className="text-[10px]" style={{ color: t.muted }}>rahul@example.com · +91 98765 43210</div>
            </div>
            <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: t.accentDim, color: t.accent }}>Score: 85</span>
          </div>
          {[
            { label: 'Source', value: 'Chat Widget' },
            { label: 'Budget', value: '$50k–$75k' },
            { label: 'Timeline', value: 'March 2027' },
            { label: 'Interest', value: 'Event Planning' },
            { label: 'Segment', value: 'Hot' },
            { label: 'Status', value: 'Qualified' },
          ].map((f, i) => (
            <div key={i} className="flex justify-between text-xs py-1">
              <span style={{ color: t.muted }}>{f.label}</span>
              <span className="font-medium">{f.value}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      tab: 'Nurture',
      content: (
        <div className="p-5 space-y-2">
          {[
            { step: 1, day: 'Day 1', action: 'WhatsApp welcome message', done: true },
            { step: 2, day: 'Day 3', action: 'Email with case studies', done: true },
            { step: 3, day: 'Day 5', action: 'Follow-up: "Still interested?"', done: true },
            { step: 4, day: 'Day 7', action: 'Send booking link', done: false, current: true },
            { step: 5, day: 'Day 14', action: 'Final re-engagement email', done: false },
          ].map((s, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${s.current ? 'border' : ''}`}
              style={{ background: s.done ? t.bg : t.card, borderColor: s.current ? t.accent : 'transparent' }}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold ${s.done ? 'text-white' : s.current ? 'text-white' : 'text-[#9ca3af]'} ${s.current ? 'animate-pulse' : ''}`}
                style={{ background: s.done || s.current ? t.accent : '#e5e7eb' }}>
                {s.done ? <Check size={10} /> : s.step}
              </div>
              <span className="text-[10px] font-mono" style={{ color: t.muted }}>{s.day}</span>
              <span className="text-xs" style={{ color: s.done ? t.muted : t.text, fontWeight: s.current ? 600 : 400 }}>{s.action}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: "'DM Sans', sans-serif", minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <motion.nav className="fixed top-0 left-0 right-0 z-50 h-14" style={{
        background: 'rgba(250,249,246,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.04)',
      }}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded flex items-center justify-center" style={{ background: t.accent }}>
              <span className="text-[9px] font-bold text-white">{c.name[0]}{c.name[1]}</span>
            </div>
            <span className="text-sm font-bold font-['Space_Grotesk']">{c.name}</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {['Product', 'Pricing'].map(item => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase())}
                className="text-xs font-medium hover:text-black transition-colors" style={{ color: t.muted }}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-xs font-medium px-4 py-2 rounded-lg hover:opacity-70 transition-all" style={{ color: t.muted }}>Sign in</button>
            <motion.button onClick={onLogin}
              className="text-xs font-semibold px-5 py-2 rounded-lg text-white transition-all"
              style={{ background: t.accent }}
              whileHover={{ scale: 1.02, boxShadow: `0 4px 16px ${t.accentDim}` }}
              whileTap={{ scale: 0.98 }}>
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ─── HERO ─── */}
      <section className="min-h-[90vh] flex items-center relative overflow-hidden pt-20">
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 30%, ${t.accentDim} 0%, transparent 70%)`,
        }} />
        <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={reduced ? undefined : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.25, 0.1, 0.15, 1] }}>
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] mb-5" style={{ color: t.accent }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.accent }} />
                {c.badge}
              </div>
              <h1 className="text-[clamp(2.6rem,6vw,4.4rem)] font-bold font-['Space_Grotesk'] leading-[0.98] tracking-[-0.04em] mb-6">
                {c.hero[0]}<br />{c.hero[1]}<br />
                <span style={{ color: t.accent }}>{c.hero[2]}</span>
              </h1>
              <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color: t.muted }}>
                {c.description}
              </p>
              <div className="flex flex-wrap items-center gap-5">
                <motion.button onClick={onLogin}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold text-white"
                  style={{ background: t.accent }}
                  whileHover={{ scale: 1.02, boxShadow: `0 6px 20px ${t.accentDim}` }}
                  whileTap={{ scale: 0.98 }}>
                  Start Free <ArrowRight size={15} />
                </motion.button>
                <button onClick={() => scrollTo('product')}
                  className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
                  style={{ color: t.text }}>
                  See how it works <ArrowRight size={13} />
                </button>
              </div>
            </motion.div>

            {/* Product mockup */}
            <motion.div initial={reduced ? undefined : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15, ease: [0.25, 0.1, 0.15, 1] }}>
              <div className="rounded-2xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.15)]" style={{ background: t.card, border: '1px solid rgba(0,0,0,0.06)' }}>
                <div className="flex" style={{ background: '#f8f7f4', borderBottom: `1px solid ${t.border}` }}>
                  {slides.map((s, i) => (
                    <button key={i} onClick={() => setActiveSlide(i)}
                      className="flex-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider relative transition-colors"
                      style={{ color: activeSlide === i ? t.accent : t.muted }}>
                      {s.tab}
                      {activeSlide === i && (
                        <motion.div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full" style={{ background: t.accent }} layoutId="slide" />
                      )}
                    </button>
                  ))}
                </div>
                {slides[activeSlide].content}
              </div>
              <div className="flex items-center justify-center gap-1.5 mt-3">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setActiveSlide(i)}
                    className={`h-1.5 rounded-full transition-all ${i === activeSlide ? 'w-6' : 'w-1.5'}`}
                    style={{ background: i === activeSlide ? t.accent : t.border }} />
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ─── CHANNEL STRIP ─── */}
      <section className="py-10 border-y" style={{ borderColor: t.border }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium" style={{ color: t.muted }}>
            <span className="text-[9px] uppercase tracking-widest font-semibold" style={{ color: '#9ca3af' }}>Channels</span>
            {c.channels.map((ch, i) => (
              <span key={i} className="flex items-center gap-1.5">{ch.color ? <ch.icon size={13} style={{ color: ch.color }} /> : <ch.icon size={13} />} {ch.label}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ─── */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '30s', label: 'Avg. first response', accent: true },
              { value: '3x', label: 'Conversion lift', accent: false },
              { value: '8', label: 'Channel support', accent: true },
              { value: '99.9%', label: 'Uptime', accent: false },
            ].map((s, i) => (
              <motion.div key={i} className="text-center p-6 rounded-2xl" style={{ background: t.card, border: `1px solid ${t.border}` }}
                initial={reduced ? undefined : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: i * 0.08 }}>
                <div className="text-3xl font-bold font-['Space_Grotesk']" style={{ color: s.accent ? t.accent : t.text }}>
                  {s.value}
                </div>
                <div className="text-xs mt-1" style={{ color: t.muted }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20" id="product">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: t.accent }}>Product</span>
            <h2 className="text-[30px] md:text-[40px] font-bold font-['Space_Grotesk'] leading-[1.05] tracking-[-0.03em] mt-4 mb-4">
              What {c.name} does
            </h2>
            <p className="text-sm" style={{ color: t.muted }}>{c.description}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mb-16">
            {c.features.map((f, i) => (
              <motion.div key={i} className="p-5 rounded-xl" style={{ background: t.card, border: `1px solid ${t.border}` }}
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-3" style={{ background: t.accentDim }}>
                  <f.icon size={15} style={{ color: t.accent }} />
                </div>
                <h3 className="text-sm font-bold mb-1.5">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: t.muted }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="py-20" style={{ background: '#171717', color: '#f5f5f5' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 md:gap-20">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>Without {c.name}</span>
              <ul className="mt-8 space-y-4">
                {c.painPoints.map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#9ca3af' }}
                    initial={reduced ? undefined : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}>
                    <span style={{ color: '#6b7280' }}>-</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: t.accent }}>With {c.name}</span>
              <ul className="mt-8 space-y-4">
                {c.solutions.map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#d1d5db' }}
                    initial={reduced ? undefined : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06 }}>
                    <span style={{ color: t.accent }}>→</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="py-20" id="pricing">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: t.accent }}>Pricing</span>
            <h2 className="text-[30px] md:text-[40px] font-bold font-['Space_Grotesk'] leading-[1.05] tracking-[-0.03em] mt-4 mb-4">
              Simple, transparent
            </h2>
            <p className="text-sm" style={{ color: t.muted }}>Self-hosted. No per-message fees. No hidden costs.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'Starter', price: '$500', period: '/mo', desc: 'For individual businesses', features: ['1 deployment', '500 leads/mo', 'AI lead agent', 'WhatsApp + web', 'Email support'] },
              { name: 'Growth', price: '$1,000', period: '/mo', desc: 'For growing teams', features: ['Up to 3 deployments', '2,000 leads/mo', 'CRM sync (native)', 'Nurture sequences', 'Priority support'], featured: true },
              { name: 'Agency', price: '$2,000', period: '/mo', desc: 'For agencies & resellers', features: ['Unlimited deployments', 'Unlimited leads', 'White-label dashboard', 'Custom workflows', '24/7 support'] },
            ].map((plan, i) => (
              <motion.div key={i} className="p-6 md:p-8 rounded-2xl relative flex flex-col"
                style={{
                  background: t.card,
                  border: plan.featured ? `2px solid ${t.accent}` : `1px solid ${t.border}`,
                  boxShadow: plan.featured ? `0 4px 24px ${t.accentDim}` : 'none',
                }}
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -4 }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider text-white"
                    style={{ background: t.accent }}>
                    Most popular
                  </div>
                )}
                <div className="text-base font-bold mb-1">{plan.name}</div>
                <div className="text-xs mb-5" style={{ color: t.muted }}>{plan.desc}</div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-['Space_Grotesk']">{plan.price}</span>
                  <span className="text-xs" style={{ color: t.muted }}>{plan.period}</span>
                </div>
                <motion.button onClick={onLogin}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all mb-6"
                  style={{ background: plan.featured ? t.accent : '#f3f2ef', color: plan.featured ? '#fff' : t.text }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}>
                  Get Started
                </motion.button>
                <ul className="space-y-2.5 mt-auto">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs" style={{ color: t.muted }}>
                      <Check size={11} className="mt-0.5 shrink-0" style={{ color: t.accent }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 relative overflow-hidden" style={{ background: '#171717' }}>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: t.accent }}>Get started</span>
          <h2 className="text-[30px] md:text-[40px] font-bold font-['Space_Grotesk'] leading-[1.05] tracking-[-0.03em] mt-4 mb-6" style={{ color: '#f5f5f5' }}>
            Set up in one day.<br />Start converting the same week.
          </h2>
          <p className="text-sm mb-10" style={{ color: '#9ca3af' }}>
            First deployment is on us. No credit card required.
          </p>
          <motion.button onClick={onLogin}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold"
            style={{ background: t.accent, color: '#fff' }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
            whileTap={{ scale: 0.98 }}>
            Start Free <ArrowRight size={18} />
          </motion.button>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-10" style={{ background: '#171717', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded flex items-center justify-center" style={{ background: t.accent }}>
              <span className="text-[7px] font-bold text-white">{c.name[0]}{c.name[1]}</span>
            </div>
            <span className="text-xs font-bold font-['Space_Grotesk']" style={{ color: '#f5f5f5' }}>{c.name}</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: '#6b7280' }}>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
          <p className="text-[10px]" style={{ color: '#525252' }}>© 2026 {c.name}</p>
        </div>
      </footer>
    </div>
  );
}
