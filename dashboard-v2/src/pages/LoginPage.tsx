import { useState } from "react";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  error?: string;
}

export function LoginPage({ onLogin, error: externalError }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(externalError || "");
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError = touched.email && !email ? "Email is required" : "";
  const passwordError = touched.password && !password ? "Password is required" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
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
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                <span className="text-sm font-bold text-white">LA</span>
              </div>
              <span className="text-xl font-bold text-[var(--foreground)]">LeadAuto</span>
            </div>
            <h2 className="mt-8 text-2xl font-bold tracking-tight text-[var(--foreground)]">Welcome back</h2>
            <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
              error={touched.email ? emailError : ""}
              autoComplete="email"
              autoFocus
            />

            <div>
              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  onBlur={() => setTouched(prev => ({ ...prev, password: true }))}
                  error={touched.password ? passwordError : ""}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[34px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full h-10">
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight size={16} />}
            </Button>

            <p className="text-center text-sm text-[var(--muted-foreground)]">
              <a href="#" className="hover:text-[var(--primary)] underline underline-offset-4 transition-colors">
                Forgot password?
              </a>
            </p>
          </form>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--primary)] via-blue-700 to-indigo-900 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.1)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.05)_0%,_transparent_50%)]" />
        <div className="relative z-10 max-w-md text-white">
          <div className="mb-10">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur border border-white/10 mb-6">
              <span className="text-2xl font-bold">LA</span>
            </div>
            <h2 className="text-4xl font-bold leading-tight tracking-tight">AI-powered lead conversion</h2>
            <p className="mt-4 text-white/70 leading-relaxed text-lg">
              Capture, nurture, and convert leads automatically with intelligent conversations across WhatsApp, email, and web.
            </p>
          </div>
          <div className="space-y-5">
            {[
              { stat: "24/7", label: "AI Lead Engagement" },
              { stat: "85%", label: "Avg. Response Rate" },
              { stat: "3x", label: "More Bookings" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-white/40" />
                <span className="text-3xl font-bold tracking-tight">{item.stat}</span>
                <span className="text-white/60 text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
