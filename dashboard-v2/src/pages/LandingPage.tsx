import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, Bot, MessageSquare, BarChart3, Globe, Gauge, Workflow,
  Shield, Blocks, Zap, ExternalLink, Phone, Mail, QrCode, Smartphone,
  MessageCircle, Clock, TrendingUp, Users, Target, Sparkles, Loader2
} from 'lucide-react';

/* ─── Theme ─── */
const theme = {
  accent: '#0d6b6b',
  accentHover: '#0b5d5d',
  accentLight: '#ecfdf5',
  accentGlow: 'rgba(13,107,107,0.08)',
  secondary: '#d97706',
  secondaryLight: '#fffbeb',
  text: '#1a1a1a',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#faf9f6',
  bgCard: '#ffffff',
  success: '#059669',
  hot: '#dc2626',
  warm: '#d97706',
  cold: '#6b7280',
};

/* ─── Hooks ─── */
function useInView(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInView(true); observer.unobserve(el); }
    }, { threshold: 0.15, ...options });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, inView] as const;
}

function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [ref, inView] = useInView();
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!startOnView || !inView || started.current) return;
    started.current = true;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [inView, end, duration, startOnView]);
  return [ref, count] as const;
}

const prefersReducedMotion = typeof window !== 'undefined'
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : true;

const spring = { type: 'spring' as const, stiffness: 120, damping: 20 };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.06 },
  }),
};

/* ─── Sub-components ─── */
function Label({ children }: { children: string }) {
  return (
    <span className="text-[11px] font-mono uppercase tracking-[0.15em]"
      style={{ color: theme.accent }}>
      {children}
    </span>
  );
}

function SectionHeader({ label, title, desc }: { label: string; title: string; desc?: string }) {
  const [ref, inView] = useInView();
  return (
    <motion.div ref={ref} className="text-center max-w-2xl mx-auto mb-16"
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
      animate={inView || prefersReducedMotion ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}>
      <Label>{label}</Label>
      <h2 className="text-[28px] sm:text-[38px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.1] tracking-[-0.02em]">
        {title}
      </h2>
      {desc && <p className="text-sm mt-4" style={{ color: theme.muted }}>{desc}</p>}
    </motion.div>
  );
}

/* ─── Hero mockup tabs ─── */
const mockupTabs = [
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;
type TabId = typeof mockupTabs[number]['id'];

const tabContent: Record<TabId, React.ReactNode> = {
  leads: (
    <div>
      <div className="p-4 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold" style={{ color: theme.muted }}>Recent Leads</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: theme.accentLight, color: theme.success }}>12 new today</span>
        </div>
        {[
          { name: 'Rahul Mehta', src: 'WhatsApp', status: 'Qualified', score: '85', time: '2m ago' },
          { name: 'Ananya Sharma', src: 'Web Form', status: 'New', score: '42', time: '15m ago' },
          { name: 'Vikram Patel', src: 'QR Code', status: 'Engaged', score: '68', time: '1h ago' },
          { name: 'Sneha Kapoor', src: 'Telegram', status: 'Qualified', score: '91', time: '2h ago' },
        ].map((lead, i) => (
          <motion.div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0"
            style={{ borderColor: theme.border }}
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}>
            <div className="flex items-center gap-3">
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.name)}&background=ecfdf5&color=0d6b6b&size=28&font-size=0.35`}
                className="h-7 w-7 rounded-full" alt="" />
              <div>
                <div className="text-sm font-medium">{lead.name}</div>
                <div className="text-[11px]" style={{ color: theme.muted }}>{lead.src} · {lead.time}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono" style={{ color: theme.accent }}>{lead.score}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: lead.status === 'Qualified' ? theme.accentLight : lead.status === 'New' ? '#eff6ff' : '#fffbeb',
                  color: lead.status === 'Qualified' ? theme.success : lead.status === 'New' ? '#2563eb' : theme.warm,
                }}>
                {lead.status}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="p-3 text-center border-t" style={{ borderColor: theme.border }}>
        <button className="text-xs font-medium" style={{ color: theme.accent }}>View all 48 leads →</button>
      </div>
    </div>
  ),
  conversations: (
    <div className="p-4 space-y-3">
      {[
        { role: 'Lead', name: 'Rahul M.', msg: 'Hi, looking for event planning for our annual conference. About 500 attendees.', time: '2m ago' },
        { role: 'AI', name: 'LeadAuto AI', msg: 'Great! Could you share your preferred dates and approximate budget range?', time: '1m ago' },
        { role: 'Lead', name: 'Rahul M.', msg: 'Looking at March 2027. Budget around $50k-$75k.', time: '30s ago' },
        { role: 'AI', name: 'LeadAuto AI', msg: 'Perfect. Marked as hot lead. Let me share premium packages and book a call.', time: 'now' },
      ].map((m, i) => (
        <motion.div key={i} className="flex items-start gap-2.5"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.1 }}>
          <img src={m.role === 'AI'
            ? `https://ui-avatars.com/api/?name=AI&background=ecfdf5&color=0d6b6b&size=24&font-size=0.3&bold=true`
            : `https://ui-avatars.com/api/?name=RM&background=f3f2ef&color=6b7280&size=24&font-size=0.3`}
            className="h-6 w-6 rounded-full shrink-0 mt-0.5" alt="" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-xs font-semibold" style={{ color: m.role === 'AI' ? theme.accent : theme.text }}>{m.name}</span>
              <span className="text-[9px]" style={{ color: theme.muted }}>{m.time}</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: theme.muted }}>{m.msg}</p>
          </div>
        </motion.div>
      ))}
      <motion.div className="flex items-center gap-2 pt-1"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}>
        <span className="h-2 w-2 rounded-full" style={{ background: theme.success }} />
        <span className="text-[10px] font-mono" style={{ color: theme.muted }}>AI is typing...</span>
      </motion.div>
    </div>
  ),
  analytics: (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total Leads', value: '1,247', color: theme.accent },
          { label: 'Converted', value: '187', color: theme.success },
          { label: 'Conversion', value: '15.2%', color: theme.warm },
        ].map((s, i) => (
          <motion.div key={i} className="text-center p-3 rounded-xl" style={{ background: theme.bg }}
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 + i * 0.1, ...spring }}>
            <div className="text-lg font-bold font-['Space_Grotesk']" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[9px] font-mono uppercase tracking-wider mt-0.5" style={{ color: theme.muted }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="space-y-1.5">
        <div className="text-[10px] font-mono font-semibold mb-2" style={{ color: theme.muted }}>Leads by source</div>
        {[
          { label: 'WhatsApp', pct: 35, color: theme.accent },
          { label: 'Web Forms', pct: 25, color: '#2563eb' },
          { label: 'QR Codes', pct: 20, color: theme.warm },
          { label: 'Telegram', pct: 12, color: '#7c3aed' },
          { label: 'Other', pct: 8, color: theme.cold },
        ].map((s, i) => (
          <motion.div key={i} className="flex items-center gap-2"
            initial={prefersReducedMotion ? undefined : { opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}>
            <span className="text-[10px] w-16 shrink-0" style={{ color: theme.muted }}>{s.label}</span>
            <div className="flex-1 h-3 rounded-full" style={{ background: theme.border }}>
              <motion.div className="h-full rounded-full"
                style={{ background: s.color }}
                initial={{ width: 0 }}
                animate={{ width: `${s.pct}%` }}
                transition={{ duration: 1, delay: 0.3 + i * 0.1, ease: 'easeOut' }} />
            </div>
            <span className="text-[10px] font-mono w-6 text-right" style={{ color: theme.muted }}>{s.pct}%</span>
          </motion.div>
        ))}
      </div>
    </div>
  ),
};

/* ─── Main ─── */
export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>('leads');
  const { scrollY } = useScroll();
  const navShadow = useTransform(scrollY, [0, 50], ['0 0 0 rgba(0,0,0,0)', '0 1px 3px rgba(0,0,0,0.06)']);
  const navBg = useTransform(scrollY, [0, 50], ['rgba(250,249,246,0.9)', 'rgba(250,249,246,1)']);
  const [statsRef, statsInView] = useInView();
  const [comparisonRef, comparisonInView] = useInView();

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  const sectionClass = prefersReducedMotion ? '' : undefined;

  return (
    <div style={{ background: theme.bg, color: theme.text, fontFamily: "'DM Sans', sans-serif", minHeight: '100vh' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* Scroll progress */}
      <motion.div className="fixed top-0 left-0 right-0 z-[60] h-0.5 origin-left"
        style={{ background: theme.accent, scaleX: useTransform(scrollY, [0, document.body.scrollHeight - window.innerHeight], [0, 1]) }} />

      {/* NAV */}
      <motion.nav className="fixed top-0 left-0 right-0 z-50 h-16"
        style={{ background: navBg, borderBottom: '1px solid rgba(0,0,0,0.04)', boxShadow: navShadow }}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: theme.accent }}>
              <span className="text-[10px] font-bold font-['Space_Grotesk']" style={{ color: '#ffffff' }}>LA</span>
            </div>
            <span className="text-sm font-bold font-['Space_Grotesk']">LeadAuto</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'How it works', target: 'how' },
              { label: 'Features', target: 'features' },
              { label: 'Pricing', target: 'pricing' },
            ].map(item => (
              <button key={item.target} onClick={() => scrollTo(item.target)}
                className="text-sm relative transition-colors duration-200 hover:text-black"
                style={{ color: theme.muted }}>
                {item.label}
                <motion.span className="absolute -bottom-0.5 left-0 right-0 h-px origin-left"
                  style={{ background: theme.text }}
                  initial={{ scaleX: 0 }} whileHover={{ scaleX: 1 }} />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80" style={{ color: theme.muted }}>Sign in</button>
            <motion.button onClick={onLogin}
              className="text-sm font-medium px-5 py-2 rounded-lg transition-all duration-200" style={{ background: theme.accent, color: '#ffffff' }}
              whileHover={{ scale: 1.02, boxShadow: `0 4px 12px ${theme.accentGlow}` }}
              whileTap={{ scale: 0.98 }}>
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* HERO */}
      <section className="min-h-[85vh] flex items-center pt-24 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 70% 40% at 70% 30%, ${theme.accentGlow} 0%, transparent 70%),
                        radial-gradient(ellipse 50% 30% at 20% 60%, rgba(217,119,6,0.04) 0%, transparent 60%)`,
          }} />
        <div className="max-w-6xl mx-auto px-6 w-full relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <motion.div
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.15em] px-3 py-1.5 rounded-full"
                  style={{ color: theme.accent, background: theme.accentLight, border: `1px solid rgba(13,107,107,0.15)` }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.accent }} />
                  AI Lead Automation
                </span>
              </motion.div>
              <motion.h1 className="text-[clamp(2rem,5vw,3.8rem)] font-bold font-['Space_Grotesk'] leading-[1.05] tracking-[-0.03em] mt-6 mb-5"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}>
                Capture, qualify, and convert leads —<br/>
                <span style={{ color: theme.accent }}>on autopilot</span>
              </motion.h1>
              <motion.p className="text-base sm:text-lg leading-relaxed mb-8" style={{ color: theme.muted, maxWidth: '480px' }}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}>
                AI that responds to every lead in under 30 seconds. Qualifies them, scores them,
                follows up automatically, and pushes everything to your CRM — across WhatsApp, web, email, and more.
              </motion.p>
              <motion.div className="flex flex-wrap items-center gap-4"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}>
                <motion.button onClick={onLogin}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold"
                  style={{ background: theme.accent, color: '#ffffff' }}
                  whileHover={{ scale: 1.02, boxShadow: `0 6px 20px ${theme.accentGlow}` }}
                  whileTap={{ scale: 0.98 }}>
                  Start Free <ArrowRight size={15} />
                </motion.button>
                <button onClick={() => scrollTo('how')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ border: `1px solid ${theme.border}`, color: theme.muted }}>
                  See how it works
                </button>
              </motion.div>
            </div>

            {/* Hero mockup with tabs */}
            <motion.div
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.25, 0.1, 0.15, 1] }}>
              <div className="rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_20px_40px_-12px_rgba(0,0,0,0.1)]"
                style={{ background: theme.bgCard }}>
                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: theme.border, background: '#f8f7f4' }}>
                  {mockupTabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all duration-200 relative`}
                      style={{ color: activeTab === tab.id ? theme.accent : theme.muted }}>
                      <tab.icon size={13} />
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full"
                          style={{ background: theme.accent }} layoutId="tab-underline" />
                      )}
                    </button>
                  ))}
                </div>
                {/* Content */}
                <AnimatePresence mode="wait">
                  <motion.div key={activeTab}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2 }}>
                    {tabContent[activeTab]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <motion.section ref={statsRef} className="py-14" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { end: 30, suffix: 's', label: 'Avg. first response' },
              { end: 3, suffix: 'x', label: 'Conversion lift', decimals: 1, accent: true },
              { end: 400, suffix: '+', label: 'Tool integrations' },
              { end: 99, suffix: '.9%', label: 'Uptime guarantee' },
            ].map((stat, i) => {
              const [ref, count] = useCountUp(stat.end, 2000, statsInView);
              return (
                <motion.div key={i} ref={ref} className="text-center"
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
                  animate={statsInView || prefersReducedMotion ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: i * 0.1 }}>
                  <div className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] mb-1"
                    style={{ color: stat.accent ? theme.secondary : theme.accent }}>
                    {count}{stat.suffix}
                  </div>
                  <div className="text-xs font-mono uppercase tracking-wider" style={{ color: theme.muted }}>{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* COMPARISON */}
      <section className="py-24" ref={comparisonRef}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="The difference" title="Without vs. with LeadAuto" />
          <motion.div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto"
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            animate={comparisonInView || prefersReducedMotion ? { opacity: 1 } : {}}
            transition={{ duration: 0.5 }}>
            {/* Without */}
            <motion.div className="p-6 sm:p-8 rounded-2xl" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}
              initial={prefersReducedMotion ? undefined : { x: -20, opacity: 0 }}
              animate={comparisonInView || prefersReducedMotion ? { x: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5 }}>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-lg">❌</span>
                <h3 className="text-base font-bold">Without LeadAuto</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'Leads sit for hours before anyone replies',
                  'Follow-ups get forgotten or delayed',
                  'Data scattered across WhatsApp, email, spreadsheets',
                  'Hot leads go cold waiting',
                  'No visibility into pipeline or conversion',
                  'Paying for 4-5 separate tools',
                ].map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: theme.muted }}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
                    animate={comparisonInView || prefersReducedMotion ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 + i * 0.05 }}>
                    <span className="text-red-400 mt-0.5 shrink-0">✕</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            {/* With */}
            <motion.div className="p-6 sm:p-8 rounded-2xl" style={{ background: theme.accentLight, border: '1px solid rgba(13,107,107,0.15)' }}
              initial={prefersReducedMotion ? undefined : { x: 20, opacity: 0 }}
              animate={comparisonInView || prefersReducedMotion ? { x: 0, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="flex items-center gap-2 mb-6">
                <span className="text-lg">✅</span>
                <h3 className="text-base font-bold" style={{ color: theme.accent }}>With LeadAuto</h3>
              </div>
              <ul className="space-y-3">
                {[
                  'AI responds in under 30 seconds, 24/7',
                  'Automated follow-ups on WhatsApp, email, SMS',
                  'Every channel unified in one dashboard',
                  'Smart scoring routes hot leads instantly',
                  'Real-time analytics and conversion tracking',
                  'One platform — one price',
                ].map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: theme.text }}
                    initial={prefersReducedMotion ? undefined : { opacity: 0, x: 8 }}
                    animate={comparisonInView || prefersReducedMotion ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.15 + i * 0.05 }}>
                    <Check size={14} className="mt-0.5 shrink-0" style={{ color: theme.accent }} />
                    {item}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24" id="how" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="How it works" title="From lead to customer in 5 steps" desc="One system handles everything. No stitching tools together. No manual data entry." />
          <div className="space-y-20">
            {[
              {
                num: '01', title: 'Lead arrives from any channel',
                desc: 'WhatsApp, web forms, QR codes, Telegram, Instagram, phone calls, campaign links — all captured in one unified inbox. Each lead gets a profile with full context.',
                mockup: (
                  <div className="space-y-2">
                    {[
                      { icon: MessageCircle, label: 'WhatsApp', count: '23 leads', color: '#25D366' },
                      { icon: Globe, label: 'Web Forms', count: '12 leads', color: '#2563eb' },
                      { icon: QrCode, label: 'QR Codes', count: '8 leads', color: theme.accent },
                      { icon: Send, label: 'Telegram', count: '5 leads', color: '#0088cc' },
                      { icon: Smartphone, label: 'Phone Calls', count: '3 leads', color: theme.warm },
                    ].map((ch, i) => (
                      <motion.div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg"
                        style={{ background: theme.bg }}
                        initial={prefersReducedMotion ? undefined : { opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}>
                        <div className="flex items-center gap-2.5">
                          <ch.icon size={16} style={{ color: ch.color }} />
                          <span className="text-sm font-medium">{ch.label}</span>
                        </div>
                        <span className="text-xs font-mono" style={{ color: theme.accent }}>{ch.count}</span>
                      </motion.div>
                    ))}
                  </div>
                ),
              },
              {
                num: '02', title: 'AI engages and qualifies',
                desc: 'An AI agent responds in under 30 seconds. It asks qualifying questions, extracts contact info, budget, timeline, and pain points. Trained on your business voice.',
                mockup: (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${theme.border}` }}>
                    <div className="px-4 py-2.5 text-xs font-semibold" style={{ background: '#f8f7f4', borderBottom: `1px solid ${theme.border}`, color: theme.muted }}>AI Conversation</div>
                    <div className="p-4 space-y-3">
                      {[
                        { role: 'Lead', name: 'Rahul', msg: 'Hi, I\'m looking for event planning for our annual conference. About 500 attendees.' },
                        { role: 'AI', name: 'LeadAuto', msg: 'Great! We\'d love to help. Could you share your preferred dates and approximate budget range?' },
                        { role: 'Lead', name: 'Rahul', msg: 'Looking at March 2027. Budget is around $50k-$75k.' },
                        { role: 'AI', name: 'LeadAuto', msg: 'Perfect. Based on that, I\'ve marked you as a hot lead. Let me share our premium packages.' },
                      ].map((m, i) => (
                        <motion.div key={i} className="flex items-start gap-2.5"
                          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 6 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.08 }}>
                          <img src={m.role === 'AI'
                            ? 'https://ui-avatars.com/api/?name=AI&background=ecfdf5&color=0d6b6b&size=24&font-size=0.3&bold=true'
                            : 'https://ui-avatars.com/api/?name=R&background=f3f2ef&color=6b7280&size=24&font-size=0.3'}
                            className="h-6 w-6 rounded-full shrink-0 mt-0.5" alt="" />
                          <div>
                            <div className="text-xs font-semibold mb-0.5" style={{ color: m.role === 'AI' ? theme.accent : theme.text }}>{m.name}</div>
                            <div className="text-xs leading-relaxed" style={{ color: theme.muted }}>{m.msg}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                num: '03', title: 'Scored, segmented, and routed',
                desc: 'Leads are scored automatically based on your rules. Hot leads go to senior reps instantly. Warm leads enter nurture. Cold leads get re-engagement sequences.',
                mockup: (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Hot', count: '18', color: theme.hot, bg: '#fef2f2', desc: 'Immediate call' },
                      { label: 'Warm', count: '42', color: theme.warm, bg: '#fffbeb', desc: 'Nurture sequence' },
                      { label: 'Cold', count: '76', color: theme.cold, bg: '#f3f2ef', desc: 'Re-engagement' },
                    ].map((s, i) => (
                      <motion.div key={i} className="text-center p-4 rounded-xl" style={{ background: s.bg }}
                        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.08 }}>
                        <div className="text-2xl font-bold font-['Space_Grotesk'] mb-0.5" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs font-mono uppercase tracking-wider" style={{ color: s.color }}>{s.label}</div>
                        <div className="text-[10px] mt-1" style={{ color: theme.muted }}>{s.desc}</div>
                      </motion.div>
                    ))}
                  </div>
                ),
              },
              {
                num: '04', title: 'Automated follow-ups',
                desc: 'Drip sequences send WhatsApp messages, emails, and SMS on schedule. Follow-ups, reminders, re-engagement — all on autopilot.',
                mockup: (
                  <div className="space-y-1.5">
                    {[
                      { day: 'Day 1', action: 'WhatsApp welcome message', done: true },
                      { day: 'Day 3', action: 'Email with case studies', done: true },
                      { day: 'Day 5', action: 'WhatsApp: "Still interested?"', done: true },
                      { day: 'Day 7', action: 'Send booking link', done: false },
                      { day: 'Day 14', action: 'Final re-engagement email', done: false },
                    ].map((s, i) => (
                      <motion.div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                        style={{ background: s.done ? theme.bg : theme.bgCard, border: `1px solid ${s.done ? 'transparent' : theme.border}` }}
                        initial={prefersReducedMotion ? undefined : { opacity: 0, x: -6 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.06 }}>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${s.done ? '' : 'border-2'}`}
                          style={{ background: s.done ? theme.accent : 'transparent', borderColor: s.done ? 'transparent' : theme.border }}>
                          {s.done && <Check size={10} color="#ffffff" />}
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: theme.muted }}>{s.day}</span>
                        <span className="text-xs" style={{ color: s.done ? theme.muted : theme.text }}>{s.action}</span>
                      </motion.div>
                    ))}
                  </div>
                ),
              },
              {
                num: '05', title: 'Pushed to your CRM',
                desc: 'Every enriched lead lands in HubSpot, Salesforce, Zoho, Google Sheets — or any of 400+ tools via n8n. Custom field mapping included.',
                mockup: (
                  <motion.div className="flex flex-wrap items-center justify-center gap-3"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}>
                    {[
                      { name: 'HubSpot', bg: '#ff7a59' },
                      { name: 'Salesforce', bg: '#00a1e0' },
                      { name: 'Zoho', bg: '#e42527' },
                      { name: 'Sheets', bg: '#34a853' },
                      { name: 'Slack', bg: '#4a154b' },
                    ].map((crm, i) => (
                      <motion.div key={i} variants={itemVariants}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm"
                        style={{ background: theme.bgCard, border: `1px solid ${theme.border}`, color: crm.bg }}>
                        <span>{crm.name}</span>
                      </motion.div>
                    ))}
                    <span className="text-xs" style={{ color: theme.muted }}>+ 400+ more</span>
                  </motion.div>
                ),
              },
            ].map((s, i) => (
              <motion.div key={i} className="grid md:grid-cols-2 gap-10 items-center"
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.5, delay: i * 0.05 }}>
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="text-[11px] font-mono font-semibold mb-2" style={{ color: theme.accent }}>{s.num}</div>
                  <h3 className="text-xl font-bold font-['Space_Grotesk'] mb-3">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{s.desc}</p>
                </div>
                <div className={i % 2 === 1 ? 'md:order-1' : ''}>
                  {s.mockup}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" id="features" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="Everything included" title="A complete lead operating system" />
          <motion.div className="grid md:grid-cols-3 gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}>
            {[
              { icon: Bot, title: 'AI Lead Agent', desc: 'Conversational AI that chats with leads 24/7. Extracts data, scores, and books appointments. Trained on your business voice.' },
              { icon: Blocks, title: 'Multi-channel intake', desc: 'WhatsApp, web forms, QR codes, Telegram, phone. All channels route to one inbox. No lead slips through.' },
              { icon: Gauge, title: 'Smart scoring', desc: 'Rule-based scoring by budget, interest, behavior. 70+ = hot, 40+ = warm. Auto-routes to the right rep instantly.' },
              { icon: Workflow, title: 'Nurture sequences', desc: 'Automated drip campaigns over WhatsApp, email, SMS. Conditions, wait steps, booking links. Set once, runs forever.' },
              { icon: BarChart3, title: 'Pipeline analytics', desc: 'Real-time conversion tracking, source performance, team metrics, revenue. Know where every lead is.' },
              { icon: Shield, title: 'CRM sync', desc: 'Push enriched leads to HubSpot, Salesforce, Zoho, Sheets, or 400+ tools via n8n. Field mapping in 2 clicks.' },
            ].map((f, i) => (
              <motion.div key={i} variants={cardVariants} custom={i}
                className="p-6 sm:p-8 rounded-2xl transition-all duration-200 group"
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}
                whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(0,0,0,0.06)`, borderColor: theme.accent }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4" style={{ background: theme.accentLight }}>
                  <f.icon size={18} style={{ color: theme.accent }} />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="Use cases" title="Built for businesses that live and die by leads" />
          <motion.div className="grid md:grid-cols-3 gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}>
            {[
              { title: 'Marketing Agencies', items: ['White-label dashboard for your clients', 'Deploy in 1 hour per client', 'Charge $500–2,000/mo per deployment', 'Client manages everything themselves'] },
              { title: 'Real Estate & Consulting', items: ['QR codes on flyers → AI books visits', 'WhatsApp auto-reply for inquiries', 'Score by budget, timeline, location', 'Auto-sync to your CRM'] },
              { title: 'Service Businesses', items: ['Web form → AI qualifies & schedules', 'Auto-booking via Calendly/Google', 'Review & referral follow-up automation', 'Abandoned lead recovery'] },
            ].map((u, i) => (
              <motion.div key={i} variants={cardVariants} custom={i}
                className="p-6 sm:p-8 rounded-2xl" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}
                whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(0,0,0,0.06)` }}>
                <h3 className="text-base font-semibold mb-5">{u.title}</h3>
                <ul className="space-y-3">
                  {u.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: theme.muted }}>
                      <Check size={14} className="mt-0.5 shrink-0" style={{ color: theme.accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="Testimonials" title="Trusted by businesses like yours" />
          <motion.div className="grid md:grid-cols-2 gap-5"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}>
            {[
              { name: 'Amit Kapoor', role: 'Real Estate Agency Owner', company: 'Kapoor Properties', text: 'We were losing leads on WhatsApp because nobody replied after hours. Now the AI handles everything at 2 AM. We closed 3 deals from midnight inquiries in the first week.' },
              { name: 'Priya Sharma', role: 'Marketing Agency Founder', company: 'GrowthBox Studio', text: 'We deployed this for 12 clients in a month. Each one thinks it\'s custom-built for them. The white-label dashboard is a game changer for our agency.' },
              { name: 'Rahul Verma', role: 'Consulting Firm Partner', company: 'Verma & Associates', text: 'Setup took one day. We went from missing 40% of leads to responding to every single one within 30 seconds. Conversion rate doubled in 3 weeks.' },
              { name: 'Neha Gupta', role: 'CEO', company: 'Eventful Media', text: 'The QR code feature alone changed our business. Flyers now lead to AI conversations that book consultations automatically. Best ROI we\'ve seen.' },
            ].map((t, i) => (
              <motion.div key={i} variants={cardVariants} custom={i}
                className="p-6 rounded-2xl" style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}
                whileHover={{ y: -2, boxShadow: `0 8px 24px rgba(0,0,0,0.06)` }}>
                <div className="flex items-center gap-3 mb-4">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(t.name)}&background=ecfdf5&color=0d6b6b&size=40&font-size=0.4`}
                    className="h-10 w-10 rounded-full" alt="" />
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs" style={{ color: theme.muted }}>{t.role} · {t.company}</div>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{ color: theme.muted }}>"{t.text}"</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24" id="pricing" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <SectionHeader label="Pricing" title="Simple, transparent pricing" />
          <motion.div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}>
            {[
              { name: 'Starter', price: '$500', period: '/mo', desc: 'For individual businesses', features: ['1 deployment', '500 leads/mo', 'AI lead agent', 'Basic n8n workflows', 'WhatsApp + web forms', 'Email support'] },
              { name: 'Growth', price: '$1,000', period: '/mo', desc: 'For growing teams', features: ['Up to 3 deployments', '2,000 leads/mo', 'Advanced scoring', 'CRM sync (HubSpot/SF/Zoho)', 'Nurture sequences', 'Priority support'], featured: true },
              { name: 'Agency', price: '$2,000', period: '/mo', desc: 'For agencies & resellers', features: ['Unlimited deployments', 'Unlimited leads', 'White-label dashboard', 'Custom n8n workflows', 'Dedicated infrastructure', '24/7 phone support'] },
            ].map((plan, i) => (
              <motion.div key={i} variants={cardVariants} custom={i}
                className="p-6 sm:p-8 rounded-2xl transition-all duration-200 relative"
                style={{
                  background: plan.featured ? theme.bgCard : theme.bgCard,
                  border: plan.featured ? `2px solid ${theme.accent}` : `1px solid ${theme.border}`,
                  boxShadow: plan.featured ? `0 4px 24px ${theme.accentGlow}` : 'none',
                }}
                whileHover={{ y: -4, boxShadow: plan.featured ? `0 8px 32px ${theme.accentGlow}` : `0 8px 24px rgba(0,0,0,0.06)` }}>
                {plan.featured && (
                  <motion.div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider"
                    style={{ background: theme.accent, color: '#ffffff' }}
                    animate={{ boxShadow: [`0 0 0 ${theme.accentGlow}`, `0 0 12px ${theme.accentGlow}`, `0 0 0 ${theme.accentGlow}`] }}
                    transition={{ duration: 2, repeat: Infinity }}>
                    Most popular
                  </motion.div>
                )}
                <div className="text-base font-semibold mb-1">{plan.name}</div>
                <div className="text-xs mb-5" style={{ color: theme.muted }}>{plan.desc}</div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-['Space_Grotesk']">{plan.price}</span>
                  <span className="text-sm" style={{ color: theme.muted }}>{plan.period}</span>
                </div>
                <motion.button onClick={onLogin}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 mb-6"
                  style={{ background: plan.featured ? theme.accent : '#f3f2ef', color: plan.featured ? '#ffffff' : theme.text }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}>
                  Get Started
                </motion.button>
                <ul className="space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs" style={{ color: theme.muted }}>
                      <Check size={12} className="mt-0.5 shrink-0" style={{ color: theme.accent }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-3xl mx-auto px-6">
          <SectionHeader label="FAQ" title="Common questions" />
          <div className="space-y-2">
            {[
              { q: 'How long does setup take?', a: 'First deployment takes about a day. Subsequent ones take under an hour. We have a template system that automates most of the configuration.' },
              { q: 'Can I connect my existing CRM?', a: 'Yes. We have direct integrations with HubSpot, Salesforce, and Zoho. For anything else, our n8n engine connects to 400+ tools.' },
              { q: 'Do I need a developer?', a: 'No. The dashboard lets you control everything — forms, scoring rules, templates, workflows. No coding required.' },
              { q: 'What about my data privacy?', a: 'The system runs on your own infrastructure. We never see your data. Full encryption at rest and in transit.' },
              { q: 'Can I white-label for my agency?', a: 'Yes. The Agency plan gives you a fully white-label dashboard. Your clients see your brand, not ours.' },
            ].map((faq, i) => (
              <motion.details key={i} className="group rounded-xl overflow-hidden transition-all duration-200"
                style={{ background: theme.bgCard, border: `1px solid ${theme.border}` }}
                initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}>
                <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer text-sm font-medium list-none">
                  {faq.q}
                  <motion.span className="text-xs shrink-0" style={{ color: theme.muted }}
                    animate={{ rotate: undefined }}
                    whileHover={{ rotate: 15 }}>
                    ▾
                  </motion.span>
                </summary>
                <div className="px-5 pb-3.5 text-sm leading-relaxed" style={{ color: theme.muted }}>{faq.a}</div>
              </motion.details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden" style={{ background: theme.accent }}>
        <div className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            backgroundSize: '256px 256px',
          }} />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-[28px] sm:text-[36px] font-bold font-['Space_Grotesk'] mb-6 leading-[1.1] tracking-[-0.02em]" style={{ color: '#ffffff' }}>
            Ready to stop losing leads?
          </h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            Set up in one day. Start converting leads the same week. Your first deployment is on us.
          </p>
          <motion.button onClick={onLogin}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold"
            style={{ background: '#ffffff', color: theme.accent }}
            whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}
            whileTap={{ scale: 0.98 }}>
            Get Started <ArrowRight size={18} />
          </motion.button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12" style={{ borderTop: `1px solid ${theme.border}` }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: theme.accent }}>
              <span className="text-[8px] font-bold font-['Space_Grotesk']" style={{ color: '#ffffff' }}>LA</span>
            </div>
            <span className="text-xs font-bold font-['Space_Grotesk']">LeadAuto</span>
          </div>
          <div className="text-xs" style={{ color: theme.muted }}>© 2026 LeadAuto. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}

function Send(props: any) { return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0088cc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
