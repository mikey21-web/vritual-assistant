import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/button";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  error?: string;
}

export function LoginPage({ onLogin, error: externalError }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(externalError || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid credentials") || msg.includes("Account locked") || msg.includes("Try again")) {
        setError(msg);
      } else if (msg.includes("network") || msg.includes("fetch") || msg.includes("NetworkError") || msg.includes("Failed to fetch")) {
        setError("Network error. Please check your connection.");
      } else {
        setError("Invalid email or password.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[var(--background)]">
      <div className="flex flex-1 items-center justify-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="mb-12">
            <div className="flex items-center gap-2.5 mb-10">
              <div className="h-9 w-9 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--primary-foreground)]">LA</span>
              </div>
              <span className="text-base font-bold text-[var(--foreground)]">LeadAuto</span>
            </div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">Welcome back</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1.5">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={e => setError("")}
                autoComplete="email"
                autoFocus
                className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setError("")}
                autoComplete="current-password"
                className="flex h-10 w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20 focus:border-[var(--ring)] transition-all"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full h-10">
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={15} />}
            </Button>

            <p className="text-center text-sm text-[var(--muted-foreground)]">
              <a href="#" className="hover:text-[var(--primary)] underline underline-offset-4 transition-colors">Forgot password?</a>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-[45%] bg-[var(--primary)] relative items-center justify-center p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative max-w-md text-white">
          <h2 className="text-3xl font-bold leading-[1.15] tracking-tight">
            AI-powered<br />
            lead conversion
          </h2>
          <p className="mt-4 text-white/70 leading-relaxed text-sm max-w-sm">
            Capture, nurture, and convert leads automatically with intelligent conversations across WhatsApp, email, and web.
          </p>
          <div className="mt-10 space-y-5">
            {[
              { stat: "24/7", label: "AI Lead Engagement" },
              { stat: "85%", label: "Avg. Response Rate" },
              { stat: "3x", label: "More Bookings" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="h-px w-6 bg-white/30" />
                <span className="text-xl font-bold tracking-tight">{item.stat}</span>
                <span className="text-white/60 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-6 border-t border-white/[0.12]">
            <p className="text-xs text-white/50">Trusted by 500+ businesses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
