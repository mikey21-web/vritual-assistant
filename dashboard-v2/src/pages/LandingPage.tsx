import { ArrowRight, Check, Bot, MessageSquare, BarChart3, Globe, Gauge, Workflow, Shield, Users, Blocks, Zap, ExternalLink } from 'lucide-react';

const fadeUp = `@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}`;

function Label({ children }: { children: string }) {
  return <span className="text-[11px] font-mono uppercase tracking-[0.15em]" style={{ color: '#0d6b6b' }}>{children}</span>;
}

function FadeIn({ children, delay = '0s', className = '' }: { children: React.ReactNode; delay?: string; className?: string }) {
  return <div className={className} style={{ animation: `fadeUp 0.7s ease forwards`, animationDelay: delay, opacity: 0 }}>{children}</div>;
}

const text = '#1a1a1a';
const muted = '#6b7280';
const accent = '#0d6b6b';
const border = '#e5e7eb';
const bgCard = '#ffffff';
const bgSection = '#faf9f6';

export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ background: bgSection, color: text, fontFamily: "'DM Sans', sans-serif", minHeight: '100vh' }}>
      <style>{fadeUp}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16" style={{ background: 'rgba(250,249,246,0.9)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: accent }}>
              <span className="text-[10px] font-bold font-['Space_Grotesk']" style={{ color: '#ffffff' }}>LA</span>
            </div>
            <span className="text-sm font-bold font-['Space_Grotesk']">LeadAuto</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'How it works', target: 'how' },
              { label: 'Features', target: 'features' },
              { label: 'Use cases', target: 'use-cases' },
              { label: 'Pricing', target: 'pricing' },
            ].map(item => (
              <button key={item.target} onClick={() => scrollTo(item.target)}
                className="text-sm transition-colors duration-200 hover:text-black" style={{ color: muted }}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin} className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80" style={{ color: muted }}>Sign in</button>
            <button onClick={onLogin} className="text-sm font-medium px-5 py-2 rounded-lg transition-all duration-200 hover:opacity-90" style={{ background: accent, color: '#ffffff' }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-[85vh] flex items-center pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <FadeIn delay="0.1s">
                <Label>Lead automation platform</Label>
              </FadeIn>
              <FadeIn delay="0.2s">
                <h1 className="text-[clamp(2.2rem,5.5vw,4rem)] font-bold font-['Space_Grotesk'] leading-[1.05] tracking-[-0.03em] mt-5 mb-6">
                  Capture, qualify, and convert leads — on autopilot
                </h1>
              </FadeIn>
              <FadeIn delay="0.3s">
                <p className="text-base sm:text-lg leading-relaxed mb-8" style={{ color: muted, maxWidth: '480px' }}>
                  AI that responds to every lead in under 30 seconds. Qualifies them, scores them, 
                  follows up automatically, and pushes everything to your CRM. Works across WhatsApp, 
                  web, email, and every channel your customers use.
                </p>
              </FadeIn>
              <FadeIn delay="0.4s" className="flex flex-wrap items-center gap-4">
                <button onClick={onLogin}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                  style={{ background: accent, color: '#ffffff' }}>
                  Start Free <ArrowRight size={15} />
                </button>
                <button onClick={() => scrollTo('how')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-medium transition-all duration-200"
                  style={{ border: `1px solid ${border}`, color: muted }}>
                  See how it works
                </button>
              </FadeIn>
            </div>

            {/* HERO DASHBOARD MOCKUP */}
            <FadeIn delay="0.5s">
              <div className="rounded-2xl overflow-hidden shadow-[0_0_0_1px_rgba(0,0,0,0.04),0_20px_40px_-12px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: '#f3f2ef', borderBottom: `1px solid ${border}` }}>
                  {['#e8643c', '#fbbf24', '#22c55e'].map((c, i) => <div key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />)}
                  <span className="text-[10px] font-mono ml-2" style={{ color: '#9ca3af' }}>leads — LeadAuto</span>
                </div>
                <div style={{ background: '#ffffff' }}>
                  <div className="p-4 border-b" style={{ borderColor: border }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-semibold" style={{ color: muted }}>Recent Leads</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full" style={{ background: '#ecfdf5', color: '#059669' }}>12 new today</span>
                    </div>
                    {[
                      { name: 'Rahul Mehta', source: 'WhatsApp', status: 'Qualified', score: '85', time: '2m ago' },
                      { name: 'Ananya Sharma', source: 'Web Form', status: 'New', score: '42', time: '15m ago' },
                      { name: 'Vikram Patel', source: 'QR Code', status: 'Engaged', score: '68', time: '1h ago' },
                    ].map((lead, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: border }}>
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-semibold" style={{ background: '#eef2ff', color: '#4f46e5' }}>
                            {lead.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{lead.name}</div>
                            <div className="text-[11px]" style={{ color: muted }}>{lead.source} · {lead.time}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-mono" style={{ color: accent }}>{lead.score}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              background: lead.status === 'Qualified' ? '#ecfdf5' : lead.status === 'New' ? '#eff6ff' : '#fffbeb',
                              color: lead.status === 'Qualified' ? '#059669' : lead.status === 'New' ? '#2563eb' : '#d97706',
                            }}>
                            {lead.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div className="mt-3 pt-3 border-t text-center" style={{ borderColor: border }}>
                      <button className="text-xs font-medium" style={{ color: accent }}>View all 48 leads →</button>
                    </div>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section className="py-14" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-5xl mx-auto px-6">
          <p className="text-xs font-mono uppercase tracking-[0.15em] text-center mb-8" style={{ color: muted }}>Trusted by agencies and businesses</p>
          <div className="flex flex-wrap justify-center gap-8 opacity-50">
            {['Agency 1', 'Agency 2', 'Company 3', 'Brand 4', 'Studio 5', 'Firm 6'].map((name, i) => (
              <span key={i} className="text-sm font-semibold font-['Space_Grotesk']" style={{ color: muted }}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24" id="how">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Label>How it works</Label>
            <h2 className="text-[28px] sm:text-[38px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.1] tracking-[-0.02em]">
              From lead to customer in 5 steps
            </h2>
            <p className="text-sm mt-4" style={{ color: muted }}>
              One system handles everything. No stitching tools together. No manual data entry.
            </p>
          </div>

          {/* STEP BY STEP */}
          <div className="space-y-20">
            {[
              {
                num: '01', title: 'Lead arrives from any channel',
                desc: 'WhatsApp, web forms, QR codes, Telegram, Instagram, phone calls, campaign links — all captured in one place. Each lead gets a unified profile with full context.',
                icon: Globe,
                mockup: (
                  <div className="space-y-2">
                    {[
                      { icon: '💬', label: 'WhatsApp', count: '23 leads' },
                      { icon: '📋', label: 'Web Forms', count: '12 leads' },
                      { icon: '📱', label: 'QR Codes', count: '8 leads' },
                      { icon: '✈️', label: 'Telegram', count: '5 leads' },
                    ].map((ch, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg" style={{ background: '#f3f2ef' }}>
                        <div className="flex items-center gap-2.5">
                          <span>{ch.icon}</span>
                          <span className="text-sm font-medium">{ch.label}</span>
                        </div>
                        <span className="text-xs font-mono" style={{ color: accent }}>{ch.count}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '02', title: 'AI engages and qualifies',
                desc: 'An AI agent responds in under 30 seconds. It asks qualifying questions, extracts contact info, budget, timeline, and pain points. Trained on your business, your tone.',
                icon: Bot,
                mockup: (
                  <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${border}` }}>
                    <div className="px-4 py-2.5 text-xs font-semibold" style={{ background: '#f3f2ef', borderBottom: `1px solid ${border}`, color: muted }}>AI Conversation</div>
                    <div className="p-4 space-y-3">
                      {[
                        { role: 'Lead', msg: 'Hi, I\'m looking for event planning for our annual conference. About 500 attendees.' },
                        { role: 'AI', msg: 'Great! We\'d love to help. Could you share your preferred dates and approximate budget range?' },
                        { role: 'Lead', msg: 'Looking at March 2027. Budget is around $50k-$75k.' },
                        { role: 'AI', msg: 'Perfect. Based on that, I\'ve marked you as a hot lead. Let me share our premium packages and book a call with our senior planner.' },
                      ].map((m, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5 ${m.role === 'AI' ? 'bg-teal-100' : 'bg-gray-100'}`}
                            style={{ background: m.role === 'AI' ? '#ccfbf1' : '#f3f2ef', color: m.role === 'AI' ? accent : muted }}>
                            {m.role === 'AI' ? 'AI' : 'L'}
                          </div>
                          <div>
                            <div className="text-xs font-semibold mb-0.5" style={{ color: m.role === 'AI' ? accent : text }}>{m.role}</div>
                            <div className="text-xs leading-relaxed" style={{ color: muted }}>{m.msg}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ),
              },
              {
                num: '03', title: 'Scored, segmented, and routed',
                desc: 'Leads are scored automatically based on your rules. Hot leads go to senior reps instantly. Warm leads enter nurture. Cold leads get re-engagement sequences.',
                icon: Gauge,
                mockup: (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Hot', count: '18', color: '#dc2626', bg: '#fef2f2' },
                      { label: 'Warm', count: '42', color: '#d97706', bg: '#fffbeb' },
                      { label: 'Cold', count: '76', color: '#6b7280', bg: '#f3f2ef' },
                    ].map((s, i) => (
                      <div key={i} className="text-center p-4 rounded-xl" style={{ background: s.bg }}>
                        <div className="text-2xl font-bold font-['Space_Grotesk'] mb-1" style={{ color: s.color }}>{s.count}</div>
                        <div className="text-xs font-mono uppercase tracking-wider" style={{ color: s.color }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '04', title: 'Automated follow-ups',
                desc: 'Drip sequences send WhatsApp messages, emails, and SMS on schedule. Follow-ups, reminders, re-engagement — all on autopilot.',
                icon: Workflow,
                mockup: (
                  <div className="space-y-1.5">
                    {[
                      { day: 'Day 1', action: 'WhatsApp welcome message', done: true },
                      { day: 'Day 3', action: 'Email with case studies', done: true },
                      { day: 'Day 5', action: 'WhatsApp: "Still interested?"', done: true },
                      { day: 'Day 7', action: 'Send booking link', done: false },
                      { day: 'Day 14', action: 'Final re-engagement email', done: false },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg" style={{ background: s.done ? '#faf9f6' : '#ffffff', border: `1px solid ${s.done ? 'transparent' : border}` }}>
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center ${s.done ? '' : 'border-2'}`}
                          style={{ background: s.done ? accent : 'transparent', borderColor: s.done ? 'transparent' : border }}>
                          {s.done && <Check size={10} color="#ffffff" />}
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: muted }}>{s.day}</span>
                        <span className="text-xs" style={{ color: s.done ? muted : text }}>{s.action}</span>
                      </div>
                    ))}
                  </div>
                ),
              },
              {
                num: '05', title: 'Pushed to your CRM',
                desc: 'Every enriched lead lands in HubSpot, Salesforce, Zoho, Google Sheets — or any of 400+ tools via n8n. Custom field mapping included.',
                icon: Shield,
                mockup: (
                  <div className="flex items-center gap-4 flex-wrap justify-center">
                    {[
                      { name: 'HubSpot', color: '#ff7a59' },
                      { name: 'Salesforce', color: '#00a1e0' },
                      { name: 'Zoho', color: '#e42527' },
                      { name: 'Google Sheets', color: '#34a853' },
                      { name: 'Slack', color: '#4a154b' },
                    ].map((crm, i) => (
                      <div key={i} className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold" style={{ background: '#ffffff', border: `1px solid ${border}`, color: crm.color }}>
                        <span>{crm.name}</span>
                      </div>
                    ))}
                    <div className="text-xs" style={{ color: muted }}>+ 400+ more</div>
                  </div>
                ),
              },
            ].map((s, i) => (
              <div key={i} className="grid md:grid-cols-2 gap-10 items-center" style={{ animation: `fadeUp 0.7s ease forwards`, animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                <div className={i % 2 === 1 ? 'md:order-2' : ''}>
                  <div className="text-[11px] font-mono font-semibold mb-2" style={{ color: accent }}>{s.num}</div>
                  <h3 className="text-xl font-bold font-['Space_Grotesk'] mb-3">{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: muted }}>{s.desc}</p>
                </div>
                <div className={i % 2 === 1 ? 'md:order-1' : ''}>
                  {s.mockup}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" id="features" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Label>Everything included</Label>
            <h2 className="text-[28px] sm:text-[38px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.1] tracking-[-0.02em]">
              A complete lead operating system
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Bot, title: 'AI Lead Agent', desc: 'Conversational AI that chats with leads 24/7. Extracts data, scores, and books appointments. Trained on your business voice.' },
              { icon: Blocks, title: 'Multi-channel intake', desc: 'WhatsApp, web forms, QR codes, Telegram, phone. All channels route to one inbox. No lead slips through.' },
              { icon: Gauge, title: 'Smart scoring', desc: 'Rule-based scoring by budget, interest, behavior. 70+ = hot, 40+ = warm. Auto-routes to the right rep.' },
              { icon: Workflow, title: 'Nurture sequences', desc: 'Automated drip campaigns over WhatsApp, email, SMS. Conditions, wait steps, booking links. Set once, runs forever.' },
              { icon: BarChart3, title: 'Pipeline analytics', desc: 'Conversion tracking, source performance, team metrics, revenue. Know where every lead is in real time.' },
              { icon: Shield, title: 'CRM sync', desc: 'Push enriched leads to HubSpot, Salesforce, Zoho, Sheets, or 400+ tools. Field mapping in 2 clicks.' },
            ].map((f, i) => (
              <div key={i} className="p-6 sm:p-8 rounded-2xl transition-all duration-200 hover:shadow-sm" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4" style={{ background: '#ecfdf5' }}>
                  <f.icon size={18} style={{ color: accent }} />
                </div>
                <h3 className="text-base font-semibold mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: muted }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24" id="use-cases">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Label>Use cases</Label>
            <h2 className="text-[28px] sm:text-[38px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.1] tracking-[-0.02em]">
              Built for businesses that live and die by leads
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                title: 'Marketing Agencies',
                items: ['White-label dashboard for your clients', 'Deploy in 1 hour per client', 'Charge $500–2,000/mo per deployment', 'Client manages everything themselves'],
              },
              {
                title: 'Real Estate & Consulting',
                items: ['QR codes on flyers → AI books visits', 'WhatsApp auto-reply for inquiries', 'Score by budget, timeline, location', 'Auto-sync to your CRM'],
              },
              {
                title: 'Service Businesses',
                items: ['Web form → AI qualifies & schedules', 'Auto-booking via Calendly/Google', 'Review & referral follow-up automation', 'Abandoned lead recovery'],
              },
            ].map((u, i) => (
              <div key={i} className="p-6 sm:p-8 rounded-2xl" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <h3 className="text-base font-semibold mb-5">{u.title}</h3>
                <ul className="space-y-3">
                  {u.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-sm" style={{ color: muted }}>
                      <Check size={14} className="mt-0.5 shrink-0" style={{ color: accent }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="py-24" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <Label>Testimonials</Label>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { name: 'Amit Kapoor', role: 'Real Estate Agency Owner', text: 'We were losing leads on WhatsApp because nobody replied after hours. Now the AI handles everything at 2 AM. We closed 3 deals from midnight inquiries in the first week.' },
              { name: 'Priya Sharma', role: 'Marketing Agency Founder', text: 'We deployed this for 12 clients in a month. Each one thinks it\'s custom-built for them. The white-label dashboard is a game changer for our agency.' },
              { name: 'Rahul Verma', role: 'Consulting Firm Partner', text: 'Setup took one day. We went from missing 40% of our leads to responding to every single one within 30 seconds. Our conversion rate doubled in 3 weeks.' },
              { name: 'Neha Gupta', role: 'Event Management CEO', text: 'The QR code feature alone changed our business. Flyers now lead to AI conversations that book consultations automatically. Best ROI we\'ve seen.' },
            ].map((t, i) => (
              <div key={i} className="p-6 rounded-2xl" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <p className="text-sm leading-relaxed mb-4" style={{ color: muted }}>"{t.text}"</p>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs" style={{ color: muted }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24" id="pricing" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <Label>Pricing</Label>
            <h2 className="text-[28px] sm:text-[38px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.1] tracking-[-0.02em]">
              Simple, transparent pricing
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {[
              {
                name: 'Starter', price: '$500', period: '/mo', desc: 'For individual businesses',
                features: ['1 deployment', '500 leads/mo', 'AI lead agent', 'Basic n8n workflows', 'WhatsApp + web forms', 'Email support'],
              },
              {
                name: 'Growth', price: '$1,000', period: '/mo', desc: 'For growing teams',
                features: ['Up to 3 deployments', '2,000 leads/mo', 'Advanced scoring', 'CRM sync (HubSpot/SF/Zoho)', 'Nurture sequences', 'Priority support'],
                featured: true,
              },
              {
                name: 'Agency', price: '$2,000', period: '/mo', desc: 'For agencies & resellers',
                features: ['Unlimited deployments', 'Unlimited leads', 'White-label dashboard', 'Custom n8n workflows', 'Dedicated infrastructure', '24/7 phone support'],
              },
            ].map((plan, i) => (
              <div key={i} className="p-6 sm:p-8 rounded-2xl transition-all duration-200 relative" style={{
                background: plan.featured ? '#ffffff' : bgCard,
                border: plan.featured ? `2px solid ${accent}` : `1px solid ${border}`,
                boxShadow: plan.featured ? '0 4px 20px rgba(13,107,107,0.08)' : 'none',
              }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-wider" style={{ background: accent, color: '#ffffff' }}>
                    Most popular
                  </div>
                )}
                <div className="text-base font-semibold mb-1">{plan.name}</div>
                <div className="text-xs mb-5" style={{ color: muted }}>{plan.desc}</div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-['Space_Grotesk']">{plan.price}</span>
                  <span className="text-sm" style={{ color: muted }}>{plan.period}</span>
                </div>
                <button onClick={onLogin}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 mb-6"
                  style={{ background: plan.featured ? accent : '#f3f2ef', color: plan.featured ? '#ffffff' : text }}>
                  Get Started
                </button>
                <ul className="space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5 text-xs" style={{ color: muted }}>
                      <Check size={12} className="mt-0.5 shrink-0" style={{ color: accent }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <Label>FAQ</Label>
            <h2 className="text-[28px] sm:text-[38px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.1] tracking-[-0.02em]">
              Common questions
            </h2>
          </div>
          <div className="space-y-2">
            {[
              { q: 'How long does setup take?', a: 'First deployment takes about a day. Subsequent ones take under an hour. We have a template system that automates most of the configuration.' },
              { q: 'Can I connect my existing CRM?', a: 'Yes. We have direct integrations with HubSpot, Salesforce, and Zoho. For anything else, our n8n engine connects to 400+ tools.' },
              { q: 'Do I need a developer?', a: 'No. The dashboard lets you control everything — forms, scoring rules, templates, workflows. No coding required.' },
              { q: 'What about my data privacy?', a: 'The system runs on your own infrastructure. We never see your data. Full encryption at rest and in transit.' },
              { q: 'Can I white-label for my agency?', a: 'Yes. The Agency plan gives you a fully white-label dashboard. Your clients see your brand, not ours.' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl overflow-hidden transition-all duration-200" style={{ background: bgCard, border: `1px solid ${border}` }}>
                <summary className="flex items-center justify-between px-5 py-3.5 cursor-pointer text-sm font-medium list-none">
                  {faq.q}
                  <span className="transition-transform duration-200 group-open:rotate-180 text-xs" style={{ color: muted }}>▾</span>
                </summary>
                <div className="px-5 pb-3.5 text-sm leading-relaxed" style={{ color: muted }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ background: accent }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-[28px] sm:text-[36px] font-bold font-['Space_Grotesk'] mb-6 leading-[1.1] tracking-[-0.02em]" style={{ color: '#ffffff' }}>
            Ready to stop losing leads?
          </h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.7)', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            Set up in one day. Start converting leads the same week. Your first deployment is on us.
          </p>
          <button onClick={onLogin}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: '#ffffff', color: accent }}>
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12" style={{ borderTop: `1px solid ${border}` }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: accent }}>
              <span className="text-[8px] font-bold font-['Space_Grotesk']" style={{ color: '#ffffff' }}>LA</span>
            </div>
            <span className="text-xs font-bold font-['Space_Grotesk']">LeadAuto</span>
          </div>
          <div className="text-xs" style={{ color: muted }}>© 2026 LeadAuto. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
