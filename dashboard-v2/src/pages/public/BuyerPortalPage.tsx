import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { Toaster } from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const TOKEN_KEY = "buyer_portal_token";

function getBuyerToken() {
  return localStorage.getItem(TOKEN_KEY);
}

async function buyerApi(path: string, options: RequestInit = {}) {
  const token = getBuyerToken();
  const res = await fetch(`${API_URL}/buyer-portal${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${res.status})`);
  }
  return res.json();
}

function formatPaise(paise?: string | number | null) {
  if (paise == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(paise) / 100);
}

/**
 * Public, mobile-first buyer view of exactly one booking (spec 54.1). Session
 * is a magic-link-issued JWT scoped to that booking — no internal dashboard
 * auth, no visibility into other applicants/leads/internal notes.
 */
export default function BuyerPortalPage() {
  const [loggedIn, setLoggedIn] = useState(!!getBuyerToken());

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    const token = params.get("token");
    if (token && !getBuyerToken()) {
      buyerApi("/verify", { method: "POST", body: JSON.stringify({ token }) })
        .then(res => {
          localStorage.setItem(TOKEN_KEY, res.accessToken);
          setLoggedIn(true);
          window.location.hash = "/buyer-portal";
        })
        .catch(e => toast.error(e.message || "Sign-in link is invalid or expired"));
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Toaster position="top-right" />
      {loggedIn ? <BuyerDashboard onLogout={() => setLoggedIn(false)} /> : <BuyerLoginForm />}
    </div>
  );
}

function BuyerLoginForm() {
  const [bookingNumber, setBookingNumber] = useState("");
  const [contactHint, setContactHint] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await buyerApi("/request-link", { method: "POST", body: JSON.stringify({ bookingNumber, contactHint }) });
      setSent(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to send link");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 mb-1">My Booking</h1>
        <p className="text-sm text-gray-500 mb-4">Enter your booking number and the phone/email on file to get a sign-in link.</p>
        {sent ? (
          <p className="text-sm text-emerald-600">If those details match a booking, a sign-in link has been sent. Check your email.</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input required placeholder="Booking number (e.g. BK-2026-ABC123)" value={bookingNumber} onChange={e => setBookingNumber(e.target.value)} className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm" />
            <input required placeholder="Phone or email on file" value={contactHint} onChange={e => setContactHint(e.target.value)} className="w-full h-10 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm" />
            <button type="submit" disabled={loading} className="w-full h-10 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? "Sending..." : "Send sign-in link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function BuyerDashboard({ onLogout }: { onLogout: () => void }) {
  const [booking, setBooking] = useState<any>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [kyc, setKyc] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [constructionUpdates, setConstructionUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s, r, d, k, t, cu] = await Promise.all([
        buyerApi("/booking"),
        buyerApi("/payment-schedule"),
        buyerApi("/receipts"),
        buyerApi("/documents"),
        buyerApi("/kyc"),
        buyerApi("/tickets"),
        buyerApi("/construction-updates"),
      ]);
      setBooking(b); setSchedule(s); setReceipts(r); setDocuments(d); setKyc(k); setTickets(t.data || t);
      setConstructionUpdates(cu);
    } catch (e: any) {
      if (/unauthoriz|401/i.test(e.message || "")) {
        localStorage.removeItem(TOKEN_KEY);
        onLogout();
      } else {
        toast.error(e.message || "Failed to load your booking");
      }
    }
    setLoading(false);
  }, [onLogout]);

  useEffect(() => { load(); }, [load]);

  const logout = () => { localStorage.removeItem(TOKEN_KEY); onLogout(); };

  if (loading) return <div className="text-sm text-gray-500 py-16 text-center">Loading your booking...</div>;
  if (!booking) return null;

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Booking {booking.bookingNumber}</h1>
          <p className="text-sm text-gray-500">Unit {booking.unit?.unitNumber} · {booking.status}</p>
        </div>
        <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">Sign out</button>
      </div>

      <Section title="Payment schedule">
        {schedule.length === 0 ? <Empty text="No milestones yet." /> : schedule.map(s => (
          <Row key={s.id} left={s.label} right={`${formatPaise(s.amount * 100)} · ${s.status}`} />
        ))}
      </Section>

      <Section title="Receipts">
        {receipts.length === 0 ? <Empty text="No confirmed payments yet." /> : receipts.map(r => (
          <Row key={r.id} left={new Date(r.receivedAt).toLocaleDateString()} right={formatPaise(r.amountPaise)} />
        ))}
      </Section>

      <Section title="Documents">
        {documents.length === 0 ? <Empty text="No documents issued yet." /> : documents.map(d => (
          <DocumentRow key={d.id} doc={d} />
        ))}
      </Section>

      {constructionUpdates.length > 0 && (
        <Section title="Construction updates">
          {constructionUpdates.map((cu: any) => (
            <div key={cu.id} className="text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
              <div className="font-medium text-gray-900 dark:text-gray-50">{cu.milestoneName}</div>
              {cu.customerVisibleMessage && (
                <div className="text-gray-600 dark:text-gray-400 mt-0.5">{cu.customerVisibleMessage}</div>
              )}
              <div className="text-xs text-gray-500 mt-0.5">
                {cu.percentComplete}% complete · {cu.approvedForBuyersAt ? new Date(cu.approvedForBuyersAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title="KYC checklist">
        {kyc.length === 0 ? <Empty text="No documents requested yet." /> : kyc.map(k => (
          <Row key={k.id} left={k.type.replace(/_/g, " ")} right={k.status.replace(/_/g, " ")} />
        ))}
      </Section>

      <SupportSection tickets={tickets} onCreated={load} />
    </div>
  );
}

function DocumentRow({ doc }: { doc: any }) {
  const openDocument = () => {
    if (doc.body) {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(doc.body);
        win.document.close();
      }
    } else {
      toast.error("Document content not available");
    }
  };

  return (
    <button onClick={openDocument} className="w-full text-left flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors">
      <span className="text-indigo-600 dark:text-indigo-400 hover:underline">{(doc.documentType || "Document").replace(/_/g, " ")}</span>
      <span className="text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</span>
    </button>
  );
}

function SupportSection({ tickets, onCreated }: { tickets: any[]; onCreated: () => void }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await buyerApi("/tickets", { method: "POST", body: JSON.stringify({ subject, description }) });
      toast.success("Support request submitted");
      setSubject(""); setDescription("");
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit request");
    }
    setSaving(false);
  };

  return (
    <Section title="Support">
      <div className="space-y-1 mb-3">
        {tickets.length === 0 ? <Empty text="No support requests yet." /> : tickets.map((t: any) => (
          <Row key={t.id} left={t.subject} right={t.status.replace(/_/g, " ")} />
        ))}
      </div>
      <form onSubmit={submit} className="space-y-2">
        <input required placeholder="Subject" value={subject} onChange={e => setSubject(e.target.value)} className="w-full h-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 text-sm" />
        <textarea required placeholder="Describe your issue" value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" />
        <button type="submit" disabled={saving} className="h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {saving ? "Submitting..." : "Submit request"}
        </button>
      </form>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-2">{title}</h2>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="text-gray-700 dark:text-gray-300">{left}</span>
      <span className="text-gray-500">{right}</span>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-500 py-2">{text}</p>;
}
