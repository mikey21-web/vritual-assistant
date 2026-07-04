import { ArrowRight, MessageSquare, Zap, Users, BarChart3, Shield, CheckCircle, Bot, Phone, QrCode, Globe, Mail } from 'lucide-react';

const fadeUp = `
@keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes pulseDot { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
`;

const ProblemCard = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="group relative rounded-2xl p-6 transition-all duration-500 hover:-translate-y-1"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div className="h-10 w-10 rounded-xl flex items-center justify-center mb-4 transition-colors duration-300"
      style={{ background: 'rgba(232,121,249,0.1)' }}>
      <Icon size={20} style={{ color: '#e879f9' }} />
    </div>
    <h3 className="text-lg font-semibold mb-2" style={{ color: '#f0eff0' }}>{title}</h3>
    <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>{desc}</p>
  </div>
);

const FeatureCard = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <div className="rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div className="h-12 w-12 rounded-xl flex items-center justify-center mb-5"
      style={{ background: 'rgba(232,121,249,0.1)' }}>
      <Icon size={22} style={{ color: '#e879f9' }} />
    </div>
    <h3 className="text-lg font-semibold mb-3" style={{ color: '#f0eff0' }}>{title}</h3>
    <p className="text-sm leading-relaxed" style={{ color: '#71717a' }}>{desc}</p>
  </div>
);

const UseCaseCard = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-2xl p-8 transition-all duration-500 hover:-translate-y-1"
    style={{
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <h3 className="text-lg font-semibold mb-5" style={{ color: '#f0eff0' }}>{title}</h3>
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <CheckCircle size={16} className="mt-0.5 shrink-0" style={{ color: '#e879f9' }} />
          <span className="text-sm leading-relaxed" style={{ color: '#71717a' }}>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

const NumberCard = ({ value, label }: { value: string; label: string }) => (
  <div className="text-center">
    <div className="text-4xl font-bold mb-1 font-['Space_Grotesk']" style={{ color: '#e879f9' }}>{value}</div>
    <div className="text-sm" style={{ color: '#71717a' }}>{label}</div>
  </div>
);

export default function LandingPage({ onLogin }: { onLogin?: () => void }) {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const sectionStyle = (delay: string): React.CSSProperties => ({
    animation: 'fadeUp 0.8s ease forwards',
    animationDelay: delay,
    opacity: 0,
  });

  return (
    <div style={{ background: '#0c0c0d', color: '#f0eff0', fontFamily: "'DM Sans', sans-serif", minHeight: '100vh' }}>
      <style>{fadeUp}</style>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50" style={{ background: 'rgba(12,12,13,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: '#e879f9' }}>
              <span className="text-[10px] font-bold" style={{ color: '#0c0c0d' }}>LA</span>
            </div>
            <span className="text-sm font-bold font-['Space_Grotesk']">LeadAuto</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollTo('how')} className="text-xs tracking-wider uppercase" style={{ color: '#71717a' }}>How it works</button>
            <button onClick={() => scrollTo('features')} className="text-xs tracking-wider uppercase" style={{ color: '#71717a' }}>Features</button>
            <button onClick={() => scrollTo('who')} className="text-xs tracking-wider uppercase" style={{ color: '#71717a' }}>Who it's for</button>
            <button onClick={() => scrollTo('why')} className="text-xs tracking-wider uppercase" style={{ color: '#71717a' }}>Why it matters</button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-sm font-medium px-4 py-2 rounded-lg transition-all duration-300 hover:opacity-80"
              style={{ color: '#71717a' }}
            >
              Log in
            </button>
            <button
              onClick={onLogin}
              className="text-sm font-medium px-5 py-2 rounded-lg transition-all duration-300 hover:opacity-90"
              style={{ background: '#e879f9', color: '#0c0c0d' }}
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-16">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,121,249,0.08) 0%, transparent 70%)' }} />
        <div className="max-w-6xl mx-auto px-6 py-24 w-full">
          <div className="max-w-4xl">
            <div style={sectionStyle('0.1s')}>
              <span className="inline-flex items-center gap-2 text-xs tracking-[0.25em] uppercase mb-8 px-4 py-2 rounded-full" style={{ color: '#e879f9', background: 'rgba(232,121,249,0.08)', border: '1px solid rgba(232,121,249,0.15)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#e879f9', animation: 'pulseDot 2s infinite' }} />
                Lead Automation Platform
              </span>
            </div>
            <h1 style={{ ...sectionStyle('0.2s'), fontFamily: "'Space Grotesk', sans-serif", fontSize: 'clamp(2.8rem, 7vw, 5.5rem)', lineHeight: 1, letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>
              Never lose a<br/>
              <span style={{ color: '#e879f9' }}>lead again</span>
            </h1>
            <p style={{ ...sectionStyle('0.3s'), fontSize: 'clamp(1rem, 2vw, 1.15rem)', lineHeight: 1.7, color: '#71717a', maxWidth: '580px', marginBottom: '2.5rem' }}>
              AI that engages, qualifies, and converts your leads automatically — 
              from first message to CRM. Works across WhatsApp, web, email, and every channel your customers use.
            </p>
            <div style={sectionStyle('0.4s')} className="flex flex-wrap items-center gap-4">
              <button
                onClick={onLogin}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:opacity-90"
                style={{ background: '#e879f9', color: '#0c0c0d' }}
              >
                Start Free <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollTo('how')}
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-medium transition-all duration-300"
                style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#f0eff0' }}
              >
                See how it works
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* NUMBERS */}
      <section className="py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <NumberCard value="15.2%" label="Avg conversion lift" />
            <NumberCard value="30s" label="First response time" />
            <NumberCard value="24/7" label="Lead engagement" />
            <NumberCard value="400+" label="Tool integrations" />
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="py-20" id="why" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#71717a' }}>The Problem</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 font-['Space_Grotesk']" style={{ letterSpacing: '-0.03em' }}>
              Leads are falling through the cracks
            </h2>
            <p className="text-sm" style={{ color: '#71717a', maxWidth: '500px', margin: '0 auto' }}>
              Most businesses lose 80% of leads because they don't respond fast enough or follow up consistently.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <ProblemCard icon={MessageSquare} title="Slow responses" desc="Leads expect replies in minutes, not hours. Every minute of delay drops conversion by 7%." />
            <ProblemCard icon={Users} title="Inconsistent follow-up" desc="Team members get busy. Follow-ups slip. Hot leads go cold waiting for a call that never comes." />
            <ProblemCard icon={BarChart3} title="No visibility" desc="Leads come from WhatsApp, web forms, Instagram, calls — scattered across channels with no single view." />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24" id="how" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#71717a' }}>How It Works</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 font-['Space_Grotesk']" style={{ letterSpacing: '-0.03em' }}>
              From lead to customer — automatically
            </h2>
            <p className="text-sm" style={{ color: '#71717a', maxWidth: '500px', margin: '0 auto' }}>
              One unified system handles the entire journey. No tools to stitch together. No manual work.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-6 items-start">
            {[
              { step: '01', title: 'Lead arrives', desc: 'From your website, WhatsApp, QR code, Telegram, campaign link, or chatbot.', icon: Globe },
              { step: '02', title: 'AI engages', desc: 'An AI agent replies instantly, asks qualifying questions, and extracts key info.', icon: Bot },
              { step: '03', title: 'Scored & routed', desc: 'Lead is scored hot/warm/cold and routed to the right team member automatically.', icon: Zap },
              { step: '04', title: 'Automated follow-up', desc: 'Drip sequences send WhatsApp messages, emails, and booking links on schedule.', icon: Mail },
              { step: '05', title: 'Pushed to CRM', desc: 'Enriched lead data lands in HubSpot, Salesforce, Zoho, Google Sheets — or your tool.', icon: ArrowRight },
            ].map(({ step, title, desc, icon: Icon }, i) => (
              <div key={i} className="text-center md:text-left">
                <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto md:mx-0 mb-4" style={{ background: 'rgba(232,121,249,0.1)' }}>
                  <Icon size={20} style={{ color: '#e879f9' }} />
                </div>
                <div className="text-xs font-semibold mb-1 font-['Space_Grotesk']" style={{ color: '#e879f9' }}>{step}</div>
                <h3 className="text-base font-semibold mb-2" style={{ color: '#f0eff0' }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#71717a' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" id="features" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#71717a' }}>Everything Included</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 font-['Space_Grotesk']" style={{ letterSpacing: '-0.03em' }}>
              A complete lead operating system
            </h2>
            <p className="text-sm" style={{ color: '#71717a', maxWidth: '500px', margin: '0 auto' }}>
              Not a pile of integrations. One platform that does it all.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard icon={Bot} title="AI Lead Agent" desc="Conversational AI that chats with leads, extracts data, scores them, and books appointments. Trained on your business." />
            <FeatureCard icon={MessageSquare} title="Multi-channel intake" desc="Capture leads from WhatsApp, web forms, QR codes, Telegram, Instagram, phone calls, and campaign links — all in one inbox." />
            <FeatureCard icon={Zap} title="Smart Scoring & Routing" desc="Automatic lead scoring based on your rules. Hot leads go to senior reps. Cold leads go to nurture." />
            <FeatureCard icon={Mail} title="Nurture Sequences" desc="Drip campaigns that send WhatsApp messages, emails, and SMS on autopilot. Set it once, it runs forever." />
            <FeatureCard icon={BarChart3} title="Pipeline Analytics" desc="Know where every lead is. Conversion rates, source performance, team metrics. Real-time dashboards." />
            <FeatureCard icon={Shield} title="CRM Sync" desc="Push enriched leads to HubSpot, Salesforce, Zoho, or 400+ tools via n8n. Field mapping included." />
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="py-24" id="who" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#71717a' }}>Who Needs This</span>
            <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-4 font-['Space_Grotesk']" style={{ letterSpacing: '-0.03em' }}>
              Built for businesses that live and die by leads
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <UseCaseCard title="Marketing Agencies" items={[
              'White-label for your clients',
              'Deploy in 1 hour per client',
              'Charge $500-2000/mo per deployment',
              'Your clients get a full dashboard',
              'You keep the margin',
            ]} />
            <UseCaseCard title="Real Estate & Consulting" items={[
              'QR codes on flyers → AI books visits',
              'WhatsApp auto-replies for property inquiries',
              'Lead scoring based on budget & timeline',
              'Auto-sync to your CRM',
              'Follow-up sequences for past buyers',
            ]} />
            <UseCaseCard title="Service Businesses" items={[
              'Web form or call → AI qualifies',
              'Auto-schedules jobs via Calendly',
              'Follow-up for reviews & referrals',
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
              <span className="text-xs tracking-[0.25em] uppercase" style={{ color: '#71717a' }}>Why It Matters</span>
              <h2 className="text-3xl md:text-4xl font-bold mt-4 mb-6 font-['Space_Grotesk']" style={{ letterSpacing: '-0.03em' }}>
                Every lead that comes in tonight will be answered — while you sleep
              </h2>
              <p className="text-sm leading-relaxed mb-8" style={{ color: '#71717a' }}>
                The difference between a lead that converts and one that goes cold is often just speed. 
                Our AI responds in under 30 seconds, 24/7. It asks the right questions, captures the data 
                you need, and puts every lead in front of the right person — instantly.
              </p>
              <div className="space-y-4">
                {[
                  'No more missed WhatsApp messages after hours',
                  'No more "I forgot to follow up"',
                  'No more leads stored in random spreadsheets',
                  'No more paying for 5 different tools',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle size={18} className="mt-0.5 shrink-0" style={{ color: '#e879f9' }} />
                    <span className="text-sm" style={{ color: '#f0eff0' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl p-10" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="space-y-6">
                <div className="flex items-start gap-3 pb-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#e879f9', color: '#0c0c0d' }}>AK</div>
                  <div>
                    <div className="text-sm font-semibold mb-1">Amit Kapoor</div>
                    <div style={{ color: '#71717a', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      "We were losing leads on WhatsApp because nobody replied after hours. 
                      Now the AI handles everything at 2 AM. We closed 3 deals from midnight inquiries in the first week."
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'rgba(232,121,249,0.2)', color: '#e879f9' }}>PS</div>
                  <div>
                    <div className="text-sm font-semibold mb-1">Priya Sharma</div>
                    <div style={{ color: '#71717a', fontSize: '0.8rem', lineHeight: 1.5 }}>
                      "We deployed this for 12 clients in a month. Each one thinks it's custom-built for them. 
                      The white-label dashboard is a game changer for our agency."
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 font-['Space_Grotesk']" style={{ letterSpacing: '-0.03em' }}>
            Ready to stop losing leads?
          </h2>
          <p className="text-sm mb-10" style={{ color: '#71717a', maxWidth: '450px', margin: '0 auto 2.5rem' }}>
            Set up in one day. Start converting leads the same week. Your first client deployment is on us.
          </p>
          <button
            onClick={onLogin}
            className="inline-flex items-center gap-3 px-10 py-4 rounded-xl text-base font-semibold transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
            style={{ background: '#e879f9', color: '#0c0c0d' }}
          >
            Get Started <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '3rem 0' }}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 rounded-md flex items-center justify-center" style={{ background: '#e879f9' }}>
              <span className="text-[8px] font-bold" style={{ color: '#0c0c0d' }}>LA</span>
            </div>
            <span className="text-xs font-bold font-['Space_Grotesk']">LeadAuto</span>
          </div>
          <div className="text-xs" style={{ color: '#52525b' }}>
            &copy; 2026 LeadAuto. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
