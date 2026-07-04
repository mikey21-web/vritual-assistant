import { ArrowRight, Bolt, Shield, BarChart3, MessageSquare, Users, Zap, CheckCircle, Bot, Globe, QrCode, Phone, ChartColumn, CircleCheck, CircleX, Sparkles, Target, Clock, Blocks, Scan, Workflow, GitBranch, Webhook, Gauge, Eye, Mail, type LucideIcon } from 'lucide-react';

const fadeUp = `@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}@keyframes scaleIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}`;

function SectionLabel({ children }: { children: string }) {
  return <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: '#e8643c' }}>{children}</span>;
}

function FeatureCard({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="group rounded-[18px] p-8 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
    >
      <div className="h-11 w-11 rounded-xl flex items-center justify-center mb-5" style={{ background: 'rgba(232,100,60,0.1)' }}>
        <Icon size={20} style={{ color: '#e8643c' }} />
      </div>
      <h3 className="text-base font-semibold mb-3 leading-snug" style={{ color: '#f0eff0' }}>{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>{desc}</p>
    </div>
  );
}

function UseCaseCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[18px] p-8 transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
    >
      <h3 className="text-base font-semibold mb-6 leading-snug" style={{ color: '#f0eff0' }}>{title}</h3>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <CircleCheck size={15} className="mt-0.5 shrink-0" style={{ color: '#e8643c' }} />
            <span className="text-sm leading-relaxed" style={{ color: '#a1a1aa' }}>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div style={{ background: '#17171c', color: '#fafafa', fontFamily: "'DM Sans', sans-serif", minHeight: '100vh' }}>
      <style>{fadeUp}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16" style={{ background: 'rgba(23,23,28,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: '#e8643c' }}>
              <span className="text-[10px] font-bold font-['Space_Grotesk']" style={{ color: '#17171c' }}>LA</span>
            </div>
            <span className="text-sm font-bold font-['Space_Grotesk']" style={{ color: '#fafafa' }}>LeadAuto</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'How it works', target: 'how' },
              { label: 'Features', target: 'features' },
              { label: 'Use cases', target: 'use-cases' },
              { label: 'Pricing', target: 'pricing' },
            ].map(item => (
              <button key={item.target} onClick={() => scrollTo(item.target)}
                className="text-[11px] font-mono uppercase tracking-[0.2em] transition-colors duration-200 hover:text-white"
                style={{ color: '#a1a1aa' }}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onLogin}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80"
              style={{ color: '#a1a1aa' }}>
              Sign in
            </button>
            <button onClick={onLogin}
              className="text-sm font-medium px-5 py-2 rounded-lg transition-all duration-200 hover:opacity-90"
              style={{ background: '#e8643c', color: '#fafafa' }}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-16">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(232,100,60,0.06) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="max-w-3xl">
            <div className="animate-fade-up opacity-0" style={{ animation: 'fadeUp 0.6s ease forwards', animationDelay: '0.1s' }}>
              <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.2em] mb-8 px-3 py-1.5 rounded-full" style={{ color: '#e8643c', background: 'rgba(232,100,60,0.08)', border: '1px solid rgba(232,100,60,0.15)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#e8643c' }} />
                AI Lead Automation
              </span>
            </div>

            <h1 className="font-['Space_Grotesk'] font-bold leading-none tracking-[-0.03em] mb-6"
              style={{ fontSize: 'clamp(2.5rem, 7vw, 4.5rem)', animation: 'fadeUp 0.6s ease forwards', animationDelay: '0.2s', opacity: 0 }}>
              Never lose a<br/>
              <span style={{ color: '#e8643c' }}>lead again</span>
            </h1>

            <p className="text-base leading-relaxed max-w-xl mb-10"
              style={{ color: '#a1a1aa', animation: 'fadeUp 0.6s ease forwards', animationDelay: '0.3s', opacity: 0 }}>
              AI that captures, qualifies, and converts your leads automatically —<br/>
              from first message to CRM. Works across WhatsApp, web, email, and every channel your customers use.
            </p>

            <div style={{ animation: 'fadeUp 0.6s ease forwards', animationDelay: '0.4s', opacity: 0 }}
              className="flex flex-wrap items-center gap-4">
              <button onClick={onLogin}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
                style={{ background: '#e8643c', color: '#fafafa' }}>
                Start Free <ArrowRight size={15} />
              </button>
              <button onClick={() => scrollTo('how')}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-sm font-medium transition-all duration-200"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#a1a1aa' }}>
                See how it works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            {[
              { value: '15.2%', label: 'avg conversion lift' },
              { value: '30s', label: 'first response time' },
              { value: '24/7', label: 'lead engagement' },
              { value: '400+', label: 'tool integrations' },
            ].map((s, i) => (
              <div key={i} className="text-center" style={{ animation: 'fadeUp 0.6s ease forwards', animationDelay: `${0.1 + i * 0.1}s`, opacity: 0 }}>
                <div className="text-3xl sm:text-4xl font-bold font-['Space_Grotesk'] mb-1 tracking-tight" style={{ color: '#e8643c' }}>{s.value}</div>
                <div className="text-xs font-mono uppercase tracking-widest" style={{ color: '#71717a' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24" id="how" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>How it works</SectionLabel>
            <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.05] tracking-[-0.025em]" style={{ color: '#fafafa' }}>
              From lead to customer —<br/>fully automatic
            </h2>
            <p className="text-sm mt-4" style={{ color: '#71717a', maxWidth: '440px', margin: '1rem auto 0' }}>
              One system handles the entire journey. No stitching tools together. No manual work.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 items-start">
            {[
              { step: '01', title: 'Lead arrives', desc: 'Website, WhatsApp, QR code, Telegram, campaign link, or chatbot.', icon: Globe },
              { step: '02', title: 'AI engages', desc: 'AI replies instantly, asks qualifying questions, extracts key data.', icon: Bot },
              { step: '03', title: 'Scored & routed', desc: 'Auto-scored hot/warm/cold. Routed to the right team member.', icon: Gauge },
              { step: '04', title: 'Auto follow-up', desc: 'Drip sequences send WhatsApp, email, and booking links on schedule.', icon: Workflow },
              { step: '05', title: 'Pushed to CRM', desc: 'Enriched lead lands in HubSpot, Salesforce, Sheets — or your tool.', icon: ArrowRight },
            ].map((s, i) => (
              <div key={i} className="text-center md:text-left"
                style={{ animation: 'fadeUp 0.6s ease forwards', animationDelay: `${0.1 + i * 0.1}s`, opacity: 0 }}>
                <div className="h-11 w-11 rounded-xl flex items-center justify-center mx-auto md:mx-0 mb-4" style={{ background: 'rgba(232,100,60,0.1)' }}>
                  <s.icon size={18} style={{ color: '#e8643c' }} />
                </div>
                <div className="text-[11px] font-mono font-semibold mb-1.5" style={{ color: '#e8643c' }}>{s.step}</div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: '#fafafa' }}>{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#71717a' }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {/* CODE CREDIBILITY BLOCK */}
          <div className="mt-16 rounded-[18px] overflow-hidden"
            style={{
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid rgba(255,255,255,0.06)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
            <div className="flex items-center gap-1.5 px-5 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['#e8643c', '#fbbf24', '#22c55e'].map((c, i) => (
                <div key={i} className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
              ))}
              <span className="text-[10px] ml-2" style={{ color: '#52525b' }}>lead-agent.ts</span>
            </div>
            <div className="p-5 text-[11px] leading-relaxed" style={{ color: '#a1a1aa' }}>
              <span style={{ color: '#60a5fa' }}>export</span> <span style={{ color: '#4ade80' }}>async function</span> <span style={{ color: '#fbbf24' }}>handleNewLead</span>(lead: Lead) {'{'}
              <br/>  <span style={{ color: '#818cf8' }}>const</span> profile = <span style={{ color: '#f472b6' }}>await</span> agent.chat(lead)
              <br/>  <span style={{ color: '#818cf8' }}>const</span> score = <span style={{ color: '#f472b6' }}>await</span> scoringEngine.evaluate(profile)
              <br/>  <span style={{ color: '#f472b6' }}>await</span> crm.sync(profile)
              <br/>  <span style={{ color: '#818cf8' }}>return</span> <span style={{ color: '#34d399' }}>Response</span>.json({'{'} assigned: true, score {'}'})
              <br/>{'}'}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" id="features" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Everything included</SectionLabel>
            <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.05] tracking-[-0.025em]" style={{ color: '#fafafa' }}>
              A complete lead<br/>operating system
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard icon={Bot} title="AI Lead Agent" desc="Conversational AI that chats with leads, extracts contact details, scores them, and books appointments. Trained on your business, your voice." />
            <FeatureCard icon={Blocks} title="Multi-channel intake" desc="Capture leads from WhatsApp, web forms, QR codes, Telegram, Instagram, phone calls, and campaign links — all routed to one inbox." />
            <FeatureCard icon={Gauge} title="Smart scoring" desc="Rule-based scoring that assigns points by budget, interest, behavior. 70+ = hot, 40+ = warm. Auto-routes to the right sales rep." />
            <FeatureCard icon={Workflow} title="Nurture sequences" desc="Drip campaigns over WhatsApp, email, and SMS. Set conditions, wait steps, booking links. Runs on autopilot forever." />
            <FeatureCard icon={BarChart3} title="Pipeline analytics" desc="Real-time conversion tracking, source performance, team metrics, revenue. Know exactly where every lead is." />
            <FeatureCard icon={Shield} title="CRM sync" desc="Push enriched leads to HubSpot, Salesforce, Zoho, Google Sheets, or 400+ tools via n8n. Field mapping in 2 clicks." />
          </div>
        </div>
      </section>

      {/* USE CASES */}
      <section className="py-24" id="use-cases" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Use cases</SectionLabel>
            <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.05] tracking-[-0.025em]" style={{ color: '#fafafa' }}>
              Built for businesses that<br/>live and die by leads
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <UseCaseCard title="Marketing Agencies" items={[
              'White-label dashboard for your clients',
              'Deploy in 1 hour per client',
              'Charge $500–2,000/mo per deployment',
              'Client manages everything themselves',
              'Zero ongoing dev work for you',
            ]} />
            <UseCaseCard title="Real Estate & Consulting" items={[
              'QR codes on flyers → AI books visits',
              'WhatsApp auto-reply for property inquiries',
              'Score by budget, timeline, location',
              'Auto-sync to your CRM',
              'Follow-up sequences for past clients',
            ]} />
            <UseCaseCard title="Service Businesses" items={[
              'Web form or call → AI qualifies & schedules',
              'Auto-booking via Calendly/Google Calendar',
              'Review & referral follow-up automation',
              'Abandoned lead recovery',
              'Daily summary of all activity',
            ]} />
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel>Why it matters</SectionLabel>
              <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.05] tracking-[-0.025em] mb-6" style={{ color: '#fafafa' }}>
                Every lead that comes in tonight gets answered — while you sleep
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: '#a1a1aa' }}>
                The difference between a lead that converts and one that goes cold is often just speed. 
                Our AI responds in under 30 seconds, 24/7. It asks the right questions, captures the data 
                you need, and puts every lead in front of the right person — instantly.
              </p>
              <div className="space-y-3">
                {[
                  'No more missed WhatsApp messages after hours',
                  'No more "I forgot to follow up"',
                  'No more leads stored across random spreadsheets',
                  'No more paying for 5 different tools',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CircleCheck size={16} className="mt-0.5 shrink-0" style={{ color: '#e8643c' }} />
                    <span className="text-sm" style={{ color: '#d4d4d8' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TESTIMONIAL */}
            <div className="rounded-[18px] p-10" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="space-y-6">
                {[
                  { initials: 'AK', name: 'Amit Kapoor', role: 'Real Estate Agency Owner', text: '"We were losing leads on WhatsApp because nobody replied after hours. Now the AI handles everything at 2 AM. We closed 3 deals from midnight inquiries in the first week."' },
                  { initials: 'PS', name: 'Priya Sharma', role: 'Marketing Agency Founder', text: '"We deployed this for 12 clients in a month. Each one thinks it\'s custom-built for them. The white-label dashboard is a game changer for our agency."' },
                ].map((t, i) => (
                  <div key={i} className={`flex items-start gap-4 ${i === 0 ? 'pb-6' : ''}`} style={i === 0 ? { borderBottom: '1px solid rgba(255,255,255,0.06)' } : {}}>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0 font-['Space_Grotesk']"
                      style={{ background: i === 0 ? '#e8643c' : 'rgba(232,100,60,0.15)', color: i === 0 ? '#fafafa' : '#e8643c' }}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold mb-1" style={{ color: '#fafafa' }}>{t.name}</div>
                      <div className="text-[11px] font-mono mb-1" style={{ color: '#e8643c' }}>{t.role}</div>
                      <div className="text-xs leading-relaxed" style={{ color: '#71717a' }}>{t.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-24" id="pricing" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.05] tracking-[-0.025em]" style={{ color: '#fafafa' }}>
              Simple, transparent pricing
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              {
                name: 'Starter', price: '$500', period: '/mo', desc: 'For individual businesses',
                features: ['1 deployment', '500 leads/mo', 'AI lead agent', 'Basic n8n workflows', 'WhatsApp + web forms', 'Email support'],
              },
              {
                name: 'Growth', price: '$1,000', period: '/mo', desc: 'For growing teams',
                features: ['Up to 3 deployments', '2,000 leads/mo', 'Advanced scoring rules', 'CRM sync (HubSpot/SF/Zoho)', 'Nurture sequences', 'Priority support'],
                featured: true,
              },
              {
                name: 'Agency', price: '$2,000', period: '/mo', desc: 'For agencies & resellers',
                features: ['Unlimited deployments', 'Unlimited leads', 'White-label dashboard', 'Custom n8n workflows', 'Dedicated infrastructure', '24/7 phone support'],
              },
            ].map((plan, i) => (
              <div key={i} className="rounded-[18px] p-8 transition-all duration-300 relative"
                style={{
                  background: plan.featured ? 'rgba(232,100,60,0.06)' : 'rgba(255,255,255,0.03)',
                  border: plan.featured ? '1px solid rgba(232,100,60,0.25)' : '1px solid rgba(255,255,255,0.06)',
                }}>
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-mono font-semibold uppercase tracking-widest"
                    style={{ background: '#e8643c', color: '#fafafa' }}>
                    Most popular
                  </div>
                )}
                <div className="text-sm font-semibold mb-1" style={{ color: '#fafafa' }}>{plan.name}</div>
                <div className="text-xs mb-5" style={{ color: '#71717a' }}>{plan.desc}</div>
                <div className="mb-6">
                  <span className="text-3xl font-bold font-['Space_Grotesk']" style={{ color: '#fafafa' }}>{plan.price}</span>
                  <span className="text-sm" style={{ color: '#71717a' }}>{plan.period}</span>
                </div>
                <button onClick={onLogin}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 mb-6"
                  style={{
                    background: plan.featured ? '#e8643c' : 'rgba(255,255,255,0.06)',
                    color: plan.featured ? '#fafafa' : '#a1a1aa',
                    border: plan.featured ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  }}>
                  Get Started
                </button>
                <ul className="space-y-2.5">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <CircleCheck size={13} className="mt-0.5 shrink-0" style={{ color: '#e8643c' }} />
                      <span className="text-xs" style={{ color: '#a1a1aa' }}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-12">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mt-5 leading-[1.05] tracking-[-0.025em]" style={{ color: '#fafafa' }}>
              Common questions
            </h2>
          </div>
          <div className="space-y-3">
            {[
              { q: 'How long does setup take?', a: 'First deployment takes about a day. Subsequent ones take under an hour. We have a template system that automates most of the configuration.' },
              { q: 'Can I connect my existing CRM?', a: 'Yes. We have direct integrations with HubSpot, Salesforce, and Zoho. For anything else (Google Sheets, Pipedrive, etc.), our n8n engine connects to 400+ tools.' },
              { q: 'Do I need a developer?', a: 'No. The dashboard lets you control everything — forms, scoring rules, templates, workflows. No coding required.' },
              { q: 'What happens to my data?', a: 'The system runs on your own infrastructure (your VPS or cloud account). We never see your data. Full encryption at rest and in transit.' },
              { q: 'Can I white-label this for my agency?', a: 'Yes. The Agency plan gives you a fully white-label dashboard. Your clients see your brand, not ours.' },
            ].map((faq, i) => (
              <details key={i} className="group rounded-xl overflow-hidden transition-all duration-200"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer text-sm font-medium list-none"
                  style={{ color: '#d4d4d8' }}>
                  {faq.q}
                  <span className="transition-transform duration-200 group-open:rotate-180 text-xs" style={{ color: '#71717a' }}>▾</span>
                </summary>
                <div className="px-6 pb-4 text-sm leading-relaxed" style={{ color: '#71717a' }}>{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-[30px] sm:text-[42px] font-bold font-['Space_Grotesk'] mb-6 leading-[1.05] tracking-[-0.025em]" style={{ color: '#fafafa' }}>
            Ready to stop losing leads?
          </h2>
          <p className="text-sm mb-10" style={{ color: '#71717a', maxWidth: '400px', margin: '0 auto 2.5rem' }}>
            Set up in one day. Start converting leads the same week. Your first deployment is on us.
          </p>
          <button onClick={onLogin}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold transition-all duration-200 hover:opacity-90 hover:scale-[1.02]"
            style={{ background: '#e8643c', color: '#fafafa' }}>
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: '#e8643c' }}>
              <span className="text-[8px] font-bold font-['Space_Grotesk']" style={{ color: '#17171c' }}>LA</span>
            </div>
            <span className="text-xs font-bold font-['Space_Grotesk']" style={{ color: '#fafafa' }}>LeadAuto</span>
          </div>
          <div className="text-[11px] font-mono" style={{ color: '#52525b' }}>
            &copy; 2026 LeadAuto
          </div>
        </div>
      </footer>
    </div>
  );
}
