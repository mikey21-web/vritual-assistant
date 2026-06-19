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
      setError(err?.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left: Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <span className="text-sm font-bold text-white">LA</span>
              </div>
              <span className="font-display text-xl font-bold">LeadAuto</span>
            </div>
            <h2 className="mt-6 text-2xl font-bold tracking-tight">Welcome back</h2>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
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
            </div>

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
                  className="absolute right-3 top-[34px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              {loading ? "Signing in..." : "Sign in"} <ArrowRight size={16} />
            </Button>

            <p className="text-center text-xs text-[var(--muted-foreground)]">
              <a href="#" className="hover:text-[var(--primary)] underline underline-offset-2">Forgot password?</a>
            </p>
          </form>
        </div>
      </div>

      {/* Right: Brand panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[var(--primary)] via-emerald-700 to-teal-800 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-noise opacity-20" />
        <div className="relative z-10 max-w-md text-white">
          <div className="mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur mb-4">
              <span className="text-xl font-bold">LA</span>
            </div>
            <h2 className="text-3xl font-bold leading-tight">AI-powered lead conversion</h2>
            <p className="mt-3 text-white/80 leading-relaxed">
              Capture, nurture, and convert leads automatically with intelligent WhatsApp conversations.
            </p>
          </div>
          <div className="space-y-4">
            {[
              { stat: "24/7", label: "AI Lead Engagement" },
              { stat: "85%", label: "Avg. Response Rate" },
              { stat: "3×", label: "More Bookings" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-white/60" />
                <span className="text-2xl font-bold">{item.stat}</span>
                <span className="text-white/70">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
