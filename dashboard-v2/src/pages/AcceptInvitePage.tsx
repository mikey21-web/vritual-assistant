import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { lookupTeamInvite, acceptTeamInvite } from "../lib/data";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import BrandLogo from "../components/BrandLogo";
import { useBranding } from "../lib/useBranding";

export default function AcceptInvitePage({ token }: { token: string }) {
  const branding = useBranding();
  const [invite, setInvite] = useState<{ name: string; email: string; role: string } | null>(null);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    lookupTeamInvite(token)
      .then((data: any) => setInvite(data))
      .catch((e: any) => setError(e.message || "This invite link is invalid or has expired."));
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 10) return setError("Password must be at least 10 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setSubmitting(true);
    setError("");
    try {
      await acceptTeamInvite(token, password);
      setDone(true);
    } catch (e: any) {
      setError(e.message || "Failed to set up your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-lg space-y-6">
        <div className="flex justify-center">
          <BrandLogo logoUrl={branding.logoUrl} name={branding.businessName || "LeadAuto"} className="h-9 rounded-lg" />
        </div>

        {done ? (
          <div className="text-center space-y-3 py-4">
            <CheckCircle2 className="mx-auto text-emerald-500" size={40} />
            <h1 className="text-lg font-bold text-[var(--foreground)]">Account created</h1>
            <p className="text-sm text-[var(--muted-foreground)]">Your account is ready. Sign in to get started.</p>
            <a href="#/login" className="inline-block mt-2">
              <Button>Go to login</Button>
            </a>
          </div>
        ) : !invite ? (
          <div className="text-center py-6">
            <p className="text-sm text-red-500">{error || "Loading invite..."}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="text-center">
              <h1 className="text-lg font-bold text-[var(--foreground)]">Set up your account</h1>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {invite.name} · {invite.email}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Password</label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 10 characters" required />
            </div>
            <div>
              <label className="text-sm font-medium text-[var(--foreground)] block mb-1">Confirm password</label>
              <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? 'Setting up...' : 'Set up account'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
