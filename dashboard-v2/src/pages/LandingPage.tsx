import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  ArrowRight, Check, Bot, MessageSquare, BarChart3, Globe,
  Zap, Shield, Users, Target, Sparkles, Phone, Mail,
  Clock, TrendingUp, QrCode, Smartphone, MessageCircle, ChevronDown,
  ExternalLink, Linkedin, Send,
} from 'lucide-react';

/* ─── Theme ─── */
const t = {
  accent: '#0d6b6b',
  accentDim: 'rgba(13,107,107,0.08)',
  accentBorder: 'rgba(13,107,107,0.2)',
  warm: '#d97706',
  text: '#171717',
  muted: '#6b7280',
  border: '#e5e7eb',
  bg: '#faf9f6',
  card: '#ffffff',
  darkBg: '#171717',
  darkText: '#f5f5f5',
  red: '#dc2626',
  green: '#059669',
};

/* ─── Hooks ─── */
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

const reduced = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : true;

/* ─── Animations ─── */
const fadeUp = (d: number) => reduced ? {} : { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: d, ease: [0.25, 0.1, 0.15, 1] } } };

/* ─── Section label ─── */
function Label({ children }: { children: string }) {
  return <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: t.accent }}>{children}</span>;
}

/* ─── Grain overlay ─── */
const grainStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999,
  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E")`,
  backgroundSize: '256px 256px',
};

/* ─── Main ─── */
export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const { scrollY } = useScroll();
  const navHidden = useTransform(scrollY, [0, 80], ['0', '-100%']);
  const progress = useTransform(scrollY, [0, 800], [0, 1]);
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const [activeDemo, setActiveDemo] = useState(0);

  const demos = [
    { label: 'Lead capture', desc: 'Every inbound message auto-creates a lead profile. Name, source, score, timeline — all populated in real-time.', stat: '1,247 leads captured' },
    { label: 'AI conversation', desc: 'Agent asks qualifying questions, extracts budget/timeline, scores the lead, and books appointments — all in natural language.', stat: '30s avg response' },
    { label: 'CRM sync', desc: 'Enriched lead data pushed to HubSpot, Salesforce, or Zoho. Custom field mapping, no duplicates, no data loss.', stat: '15% conversion lift' },
  ];

  return (
    <div style={{ background: t.bg, color: t.text, fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', position: 'relative' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <div style={grainStyle} />

      {/* Scroll progress */}
      <motion.div className="fixed top-0 left-0 right-0 z-[60] h-[2px] origin-left" style={{ background: t.accent, scaleX: progress }} />

      {/* NAV */}
      <motion.nav className="fixed top-0 left-0 right-0 z-50" style={{ transform: `translateY(${navHidden})`, background: 'rgba(250,249,246,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded flex items-center justify-center" style={{ background: t.accent }}>
              <span className="text-[9px] font-bold" style={{ color: '#fff' }}>LF</span>
            </div>
            <span className="text-sm font-bold font-['Space_Grotesk']">LeadFlow</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            {['How it works', 'Features', 'Pricing'].map(item => (
              <button key={item} onClick={() => scrollTo(item.toLowerCase().replace(' ', ''))}
                className="text-xs font-medium transition-colors duration-200 hover:text-black" style={{ color: t.muted }}>
                {item}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-xs font-medium px-4 py-2 rounded-lg transition-all hover:opacity-70" style={{ color: t.muted }}>Sign in</button>
            <motion.button onClick={onLogin}
              className="text-xs font-semibold px-5 py-2 rounded-lg transition-all"
              style={{ background: t.accent, color: '#fff' }}
              whileHover={{ scale: 1.02, boxShadow: `0 4px 16px ${t.accentDim}` }}
              whileTap={{ scale: 0.98 }}>
              Get Started
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* ──────── HERO ──────── */}
      <section className="min-h-screen flex items-end relative overflow-hidden">
        <div className="absolute inset-0" style={{
          background: `linear-gradient(180deg, rgba(13,107,107,0.04) 0%, transparent 40%, transparent 70%, rgba(13,107,107,0.02) 100%)`,
        }} />
        <div className="max-w-7xl mx-auto px-6 w-full pb-16 md:pb-24 pt-28 relative z-10">
          <div className="grid md:grid-cols-[1fr_1.1fr] gap-12 md:gap-20 items-end">
            {/* Left */}
            <div {...fadeUp(0)}>
              <div className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] px-3 py-1.5 rounded-full mb-6"
                style={{ color: t.accent, background: t.accentDim, border: `1px solid ${t.accentBorder}` }}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                AI Lead Automation Platform
              </div>
              <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold font-['Space_Grotesk'] leading-[0.95] tracking-[-0.04em] mb-6">
                Capture, qualify,<br />
                <span style={{ color: t.accent }}>convert</span> — on<br />
                autopilot
              </h1>
              <p className="text-base leading-relaxed mb-8 max-w-md" style={{ color: t.muted }}>
                AI that responds to every lead in under 30 seconds. Qualifies, scores, follows up, and pushes to your CRM — across every channel.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <motion.button onClick={onLogin}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold"
                  style={{ background: t.accent, color: '#fff' }}
                  whileHover={{ scale: 1.02, boxShadow: `0 6px 20px ${t.accentDim}` }}
                  whileTap={{ scale: 0.98 }}>
                  Start Free <ArrowRight size={15} />
                </motion.button>
                <button onClick={() => scrollTo('howitworks')}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-medium"
                  style={{ border: `1px solid ${t.border}`, color: t.muted }}>
                  Watch demo
                </button>
              </div>
            </div>

            {/* Right - Demo switcher */}
            <div {...fadeUp(0.15)}>
              <div className="rounded-2xl overflow-hidden" style={{ background: t.card, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
                {/* Switcher */}
                <div className="flex border-b" style={{ borderColor: t.border, background: '#f8f7f4' }}>
                  {demos.map((d, i) => (
                    <button key={i} onClick={() => setActiveDemo(i)}
                      className="flex-1 py-3 text-[11px] font-semibold transition-all relative"
                      style={{ color: activeDemo === i ? t.accent : t.muted }}>
                      {d.label}
                      {activeDemo === i && <motion.div className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-current" layoutId="demo" />}
                    </button>
                  ))}
                </div>
                {/* Content */}
                <AnimatePresence mode="wait">
                  <motion.div key={activeDemo}
                    initial={reduced ? undefined : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}>
                    {activeDemo === 0 && (
                      <div className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[11px] font-semibold" style={{ color: t.muted }}>Recent Leads</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono" style={{ background: t.accentDim, color: t.green }}>12 new today</span>
                        </div>
                        <div className="space-y-1">
                          {[
                            ['Rahul Mehta', 'WhatsApp', 'Qualified', '85'],
                            ['Ananya Sharma', 'Web Form', 'New', '42'],
                            ['Vikram Patel', 'QR Code', 'Engaged', '68'],
                            ['Sneha Kapoor', 'Email', 'Qualified', '91'],
                            ['Arjun Singh', 'Phone', 'Scoring', '57'],
                          ].map((r, i) => (
                            <motion.div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0"
                              style={{ borderColor: t.border }}
                              initial={reduced ? undefined : { opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + i * 0.06 }}>
                              <div className="flex items-center gap-3">
                                <img src={`https://ui-avatars.com/api/?name=${r[0][0]}${r[0].split(' ')[1][0]}&background=ecfdf5&color=0d6b6b&size=28&font-size=0.35`} className="h-7 w-7 rounded-full" alt="" />
                                <div>
                                  <div className="text-sm font-medium">{r[0]}</div>
                                  <div className="text-[10px]" style={{ color: t.muted }}>{r[1]}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono" style={{ color: t.accent }}>{r[3]}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: r[2] === 'Qualified' ? t.accentDim : r[2] === 'New' ? '#eff6ff' : '#fffbeb',
                                    color: r[2] === 'Qualified' ? t.green : r[2] === 'New' ? '#2563eb' : t.warm,
                                  }}>
                                  {r[2]}
                                </span>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                        <div className="text-center pt-3 text-[11px] font-medium" style={{ color: t.accent }}>View all leads →</div>
                      </div>
                    )}
                    {activeDemo === 1 && (
                      <div className="p-5 space-y-3">
                        {[
                          { role: 'Lead', name: 'Rahul M.', msg: 'Hi, looking for event planning for our annual conference. About 500 attendees.' },
                          { role: 'AI', name: 'LeadFlow AI', msg: 'Great! Could you share your preferred dates and approximate budget range?' },
                          { role: 'Lead', name: 'Rahul M.', msg: 'Looking at March 2027. Budget around $50k-$75k.' },
                          { role: 'AI', name: 'LeadFlow AI', msg: 'Perfect. Marked as hot lead. Let me share premium packages and book a call.', highlighted: true },
                        ].map((m, i) => (
                          <motion.div key={i} className="flex items-start gap-2.5"
                            initial={reduced ? undefined : { opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + i * 0.1 }}>
                            <img src={m.role === 'AI'
                              ? 'https://ui-avatars.com/api/?name=LF&background=ecfdf5&color=0d6b6b&size=24&font-size=0.3&bold=true'
                              : 'https://ui-avatars.com/api/?name=R&background=f3f2ef&color=6b7280&size=24&font-size=0.3'}
                              className="h-6 w-6 rounded-full shrink-0 mt-0.5" alt="" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold" style={{ color: m.role === 'AI' ? t.accent : t.text }}>{m.name}</span>
                                <span className="text-[9px]" style={{ color: t.muted }}>{i === 3 ? 'now' : `${i + 1}m ago`}</span>
                              </div>
                              <p className="text-xs leading-relaxed" style={{ ...(m.highlighted ? { color: t.text, fontWeight: 500 } : { color: t.muted }) }}>{m.msg}</p>
                            </div>
                          </motion.div>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.green }} />
                          <span className="text-[10px] font-mono" style={{ color: t.muted }}>AI is typing...</span>
                        </div>
                      </div>
                    )}
                    {activeDemo === 2 && (
                      <div className="p-5 space-y-4">
                        <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: t.accentDim }}>
                          <Check size={16} style={{ color: t.accent }} />
                          <div>
                            <div className="text-xs font-semibold">Lead pushed to HubSpot</div>
                            <div className="text-[10px]" style={{ color: t.muted }}>Rahul Mehta · Score: 85 · Hot · 2s ago</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { name: 'HubSpot', color: '#ff7a59' },
                            { name: 'Salesforce', color: '#00a1e0' },
                            { name: 'Zoho', color: '#e42527' },
                          ].map((c, i) => (
                            <motion.div key={i} className="text-center p-3 rounded-xl text-[10px] font-semibold"
                              style={{ background: t.bg }}>{c.name}</motion.div>
                          ))}
                        </div>
                        <div className="text-[10px]" style={{ color: t.muted }}>Field mapping: Name → Name, Phone → Phone, Budget → Budget__c, Score → Lead_Score__c</div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              {/* caption */}
              <p className="text-[10px] text-center mt-3 font-mono" style={{ color: t.muted }}>{demos[activeDemo].stat}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── LOGO TICKER ──────── */}
      <section className="py-12 border-t border-b" style={{ borderColor: t.border }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-center mb-6" style={{ color: t.muted }}>Used by teams at</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['Kapoor Properties', 'GrowthBox', 'Verma & Associates', 'Eventful Media', 'Summit Digital', 'NovaTech'].map((name, i) => (
              <span key={i} className="text-sm font-semibold font-['Space_Grotesk']" style={{ color: '#9ca3af' }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ──────── ASYMMETRIC STATS ──────── */}
      <section className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-[1fr_1.5fr] gap-12 items-end">
            <div>
              <p className="text-[64px] md:text-[80px] font-bold font-['Space_Grotesk'] leading-[0.85] tracking-[-0.04em]" style={{ color: t.text }}>
                30<span style={{ color: t.accent }}>s</span>
              </p>
              <p className="text-sm font-medium uppercase tracking-[0.15em] mt-3" style={{ color: t.muted }}>Average first response</p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {[
                { value: '3x', label: 'Conversion lift', accent: true },
                { value: '400+', label: 'Tool integrations' },
                { value: '99.9%', label: 'Uptime' },
                { value: '24/7', label: 'Lead coverage' },
              ].map((s, i) => (
                <motion.div key={i} className="p-6 rounded-2xl" style={{ background: t.card, border: `1px solid ${t.border}` }}
                  initial={reduced ? undefined : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}>
                  <p className="text-3xl font-bold font-['Space_Grotesk']" style={{ color: s.accent ? t.warm : t.accent }}>{s.value}</p>
                  <p className="text-xs mt-1" style={{ color: t.muted }}>{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────── COMPARISON: BREAKOUT SECTION ──────── */}
      <section className="py-20 md:py-28" style={{ background: t.darkBg, color: t.darkText }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 md:gap-24">
            {/* Before */}
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: '#6b7280' }}>Before</span>
              <h3 className="text-2xl font-bold font-['Space_Grotesk'] mt-4 mb-8" style={{ color: '#f5f5f5' }}>The old way</h3>
              <ul className="space-y-4">
                {[
                  'Leads sit for hours before anyone replies',
                  'Follow-ups get forgotten or delayed',
                  'Data scattered across WhatsApp, email, spreadsheets',
                  'Hot leads go cold waiting for attention',
                  'Paying for 4–5 separate tools',
                ].map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#9ca3af' }}
                    initial={reduced ? undefined : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06 }}>
                    <span className="text-sm mt-0.5 shrink-0" style={{ color: '#6b7280' }}>—</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
            {/* After */}
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.2em]" style={{ color: t.accent }}>After</span>
              <h3 className="text-2xl font-bold font-['Space_Grotesk'] mt-4 mb-8" style={{ color: '#f5f5f5' }}>With LeadFlow</h3>
              <ul className="space-y-4">
                {[
                  'AI responds in under 30 seconds, 24/7',
                  'Automated follow-ups on WhatsApp, email, SMS',
                  'Every channel unified in one dashboard',
                  'Smart scoring routes hot leads instantly',
                  'One platform — one price',
                ].map((item, i) => (
                  <motion.li key={i} className="flex items-start gap-3 text-sm" style={{ color: '#d1d5db' }}
                    initial={reduced ? undefined : { opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 + i * 0.06 }}>
                    <span className="text-sm mt-0.5 shrink-0" style={{ color: t.accent }}>→</span>
                    {item}
                  </motion.li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── HOW IT WORKS ──────── */}
      <section className="py-20 md:py-28" id="howitworks">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <Label>Process</Label>
            <h2 className="text-[32px] md:text-[44px] font-bold font-['Space_Grotesk'] leading-[1.0] tracking-[-0.03em] mt-4">
              From lead to<br />customer in 5 steps
            </h2>
          </div>
          <div className="space-y-16">
            {[
              {
                num: '01', title: 'Lead arrives from any channel',
                desc: 'WhatsApp, web forms, QR codes, Telegram, Instagram, phone calls — all captured in one unified inbox. Each lead gets a full profile with source, context, and timeline.',
                stat: '8 channels',
              },
              {
                num: '02', title: 'AI engages and qualifies',
                desc: 'AI agent responds in under 30 seconds. It asks qualifying questions, extracts contact info, budget, timeline, and pain points — trained on your business, in your voice.',
                stat: '30s response',
              },
              {
                num: '03', title: 'Scored, segmented, routed',
                desc: 'Rule-based scoring (budget, urgency, interest) segments leads into Hot/Warm/Cold. Hot leads route to senior reps instantly. Warm leads enter nurture sequences.',
                stat: '3 segments',
              },
              {
                num: '04', title: 'Automated nurture sequences',
                desc: 'Multi-step drip campaigns over WhatsApp, email, and SMS. Conditional branches, booking links, re-engagement logic. Set once, runs forever.',
                stat: '8 step types',
              },
              {
                num: '05', title: 'Pushed to your CRM',
                desc: 'Every enriched lead lands in HubSpot, Salesforce, Zoho, or 400+ tools via n8n. Custom field mapping, dedup, and audit trail included.',
                stat: '3 native CRMs',
              },
            ].map((s, i) => (
              <motion.div key={i} className="grid md:grid-cols-[80px_1fr_1fr] gap-6 md:gap-10 items-start"
                initial={reduced ? undefined : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: i * 0.05 }}>
                <div className="text-[40px] md:text-[56px] font-bold font-['Space_Grotesk'] leading-none" style={{ color: t.accent, opacity: 0.3 }}>{s.num}</div>
                <div>
                  <h3 className="text-lg font-bold font-['Space_Grotesk'] mb-3">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: t.muted }}>{s.desc}</p>
                </div>
                <div className="hidden md:flex items-center gap-3 p-4 rounded-xl" style={{ background: t.accentDim }}>
                  <Zap size={14} style={{ color: t.accent }} />
                  <span className="text-xs font-medium" style={{ color: t.accent }}>{s.stat}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div className="mt-12 p-6 rounded-2xl border" style={{ background: t.card, borderColor: t.border }}
            initial={reduced ? undefined : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}>
            <div className="flex flex-wrap items-center gap-4 justify-center">
              {[
                { channel: 'WhatsApp', icon: MessageCircle, count: 23, color: '#25D366' },
                { channel: 'Web Forms', icon: Globe, count: 12, color: '#2563eb' },
                { channel: 'QR Codes', icon: QrCode, count: 8, color: t.accent },
                { channel: 'Telegram', icon: Send, count: 5, color: '#0088cc' },
                { channel: 'Phone', icon: Phone, count: 3, color: t.warm },
              ].map((ch, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs" style={{ background: t.bg }}>
                  <ch.icon size={14} style={{ color: ch.color }} />
                  <span className="font-medium">{ch.channel}</span>
                  <span className="font-mono" style={{ color: t.accent }}>{ch.count}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ──────── FEATURES: MAGAZINE GRID ──────── */}
      <section className="py-20 md:py-28" id="features" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <Label>Platform</Label>
            <h2 className="text-[32px] md:text-[44px] font-bold font-['Space_Grotesk'] leading-[1.0] tracking-[-0.03em] mt-4">
              A complete lead<br />operating system
            </h2>
          </div>
          <div className="grid md:grid-cols-6 gap-4">
            {[
              { icon: Bot, title: 'AI Lead Agent', desc: '24/7 conversational AI that qualifies, scores, and books. Trained on your business voice.', span: 'col-span-2', row: 'row-span-1' },
              { icon: Globe, title: 'Multi-channel intake', desc: 'WhatsApp, web, QR, Telegram, phone. All routes to one inbox.', span: 'col-span-2', row: 'row-span-1' },
              { icon: Target, title: 'Smart scoring', desc: 'Rule-based by budget, urgency, behavior. Auto-routes hot leads to reps.', span: 'col-span-2', row: 'row-span-1' },
              { icon: Zap, title: 'Nurture sequences', desc: 'Multi-step drips over WhatsApp, email, SMS. Conditions, wait steps, booking links.', span: 'col-span-3', row: 'row-span-1' },
              { icon: Shield, title: 'CRM sync', desc: 'HubSpot, Salesforce, Zoho + 400+ tools via n8n. 2-click field mapping.', span: 'col-span-3', row: 'row-span-1' },
            ].map((f, i) => (
              <motion.div key={i} className={`${f.span} ${f.row} p-6 md:p-8 rounded-2xl transition-all duration-200`}
                style={{ background: t.card, border: `1px solid ${t.border}` }}
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)', borderColor: t.accent }}>
                <div className="h-8 w-8 rounded-lg flex items-center justify-center mb-4" style={{ background: t.accentDim }}>
                  <f.icon size={15} style={{ color: t.accent }} />
                </div>
                <h3 className="text-sm font-bold mb-2">{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: t.muted }}>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────── TESTIMONIALS: PULL QUOTES ──────── */}
      <section className="py-20 md:py-28" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <Label>Testimonials</Label>
            <h2 className="text-[32px] md:text-[44px] font-bold font-['Space_Grotesk'] leading-[1.0] tracking-[-0.03em] mt-4">
              Trusted by<br />businesses like yours
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { quote: 'We were losing leads on WhatsApp because nobody replied after hours. Now the AI handles everything at 2 AM. We closed 3 deals from midnight inquiries in the first week.', name: 'Amit Kapoor', role: 'Kapoor Properties' },
              { quote: 'Deployed this for 12 clients in a month. Each one thinks it\'s custom-built for them. The white-label dashboard is a game changer for our agency.', name: 'Priya Sharma', role: 'GrowthBox Studio' },
              { quote: 'Setup took one day. We went from missing 40% of leads to responding to every single one within 30 seconds. Conversion rate doubled in 3 weeks.', name: 'Rahul Verma', role: 'Verma & Associates' },
              { quote: 'The QR code feature alone changed our business. Flyers now lead to AI conversations that book consultations automatically. Best ROI we\'ve seen.', name: 'Neha Gupta', role: 'Eventful Media' },
            ].map((tst, i) => (
              <motion.div key={i} className="p-6 md:p-8 rounded-2xl" style={{ background: t.card, border: `1px solid ${t.border}` }}
                initial={reduced ? undefined : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,0,0,0.06)' }}>
                <p className="text-sm leading-relaxed mb-6" style={{ color: t.muted }}>"{tst.quote}"</p>
                <div className="flex items-center gap-3">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(tst.name)}&background=ecfdf5&color=0d6b6b&size=36&font-size=0.35`}
                    className="h-9 w-9 rounded-full" alt="" />
                  <div>
                    <div className="text-sm font-semibold">{tst.name}</div>
                    <div className="text-xs" style={{ color: t.muted }}>{tst.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ──────── PRICING ──────── */}
      <section className="py-20 md:py-28" id="pricing" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-xl mb-16">
            <Label>Pricing</Label>
            <h2 className="text-[32px] md:text-[44px] font-bold font-['Space_Grotesk'] leading-[1.0] tracking-[-0.03em] mt-4">
              Simple, transparent<br />pricing
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {[
              { name: 'Starter', price: '$500', period: '/mo', desc: 'For individual businesses', features: ['1 deployment', '500 leads/mo', 'AI lead agent', 'Basic integrations', 'WhatsApp + web forms', 'Email support'] },
              { name: 'Growth', price: '$1,000', period: '/mo', desc: 'For growing teams', features: ['Up to 3 deployments', '2,000 leads/mo', 'Advanced scoring', 'CRM sync (native)', 'Nurture sequences', 'Priority support'], featured: true },
              { name: 'Agency', price: '$2,000', period: '/mo', desc: 'For agencies & resellers', features: ['Unlimited deployments', 'Unlimited leads', 'White-label dashboard', 'Custom workflows', 'Dedicated infra', '24/7 phone support'] },
            ].map((plan, i) => (
              <motion.div key={i} className="p-6 md:p-8 rounded-2xl transition-all duration-200 relative flex flex-col"
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
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider"
                    style={{ background: t.accent, color: '#fff' }}>
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

      {/* ──────── CTA ──────── */}
      <section className="py-28 relative overflow-hidden" style={{ background: t.darkBg }}>
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
        }} />
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <Label>Get started</Label>
          <h2 className="text-[32px] md:text-[44px] font-bold font-['Space_Grotesk'] leading-[1.0] tracking-[-0.03em] mt-4 mb-6" style={{ color: '#f5f5f5' }}>
            Ready to stop<br />losing leads?
          </h2>
          <p className="text-sm mb-10" style={{ color: '#9ca3af' }}>
            Set up in one day. Start converting the same week.
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

      {/* ──────── FOOTER ──────── */}
      <footer className="py-12" style={{ background: t.darkBg, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded flex items-center justify-center" style={{ background: t.accent }}>
              <span className="text-[7px] font-bold" style={{ color: '#fff' }}>LF</span>
            </div>
            <span className="text-xs font-bold font-['Space_Grotesk']" style={{ color: '#f5f5f5' }}>LeadFlow</span>
          </div>
          <div className="flex items-center gap-6 text-xs" style={{ color: '#6b7280' }}>
            <span>Privacy</span>
            <span>Terms</span>
            <span>Contact</span>
          </div>
          <p className="text-[10px]" style={{ color: '#525252' }}>© 2026 LeadFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
