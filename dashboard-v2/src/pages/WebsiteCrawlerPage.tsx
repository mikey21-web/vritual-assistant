import { useState } from "react";
import { api } from "../lib/api";
import { Globe, Loader2, CheckCircle, AlertCircle, FileText, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

export default function WebsiteCrawlerPage() {
  const [url, setUrl] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCrawl = async () => {
    if (!url.trim()) return toast.error("Enter a website URL");
    setCrawling(true);
    setResult(null);
    try {
      const res = await api("/website-crawler/crawl", {
        method: "POST",
        body: JSON.stringify({ url: url.trim() }),
      });
      setResult(res);
      if (res.created > 0) toast.success(`${res.created} articles created`);
      else toast("No new articles found (may already exist)");
    } catch (e: any) {
      toast.error(e.message);
    }
    setCrawling(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Website Crawler</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Enter your website URL to automatically extract business info and save it to your Knowledge Base</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
            <Globe size={20} className="text-[var(--primary)]" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-[var(--foreground)]">Crawl Website</h2>
            <p className="text-xs text-[var(--muted-foreground)]">We'll scan your site and create knowledge articles from your pages</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="yourwebsite.com"
            onKeyDown={(e) => e.key === "Enter" && handleCrawl()}
            className="flex-1 h-10 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]/20"
          />
          <button onClick={handleCrawl} disabled={crawling || !url.trim()}
            className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity">
            {crawling ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            {crawling ? "Crawling..." : "Crawl"}
          </button>
        </div>

        <div className="mt-4 text-xs text-[var(--muted-foreground)]">
          Pages crawled: Home, About, Services, Products, Pricing, Contact, FAQ, Features
        </div>
      </div>

      {result && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
          <div className="flex items-center gap-3 mb-4">
            {result.created > 0 ? (
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-600" />
              </div>
            )}
            <div>
              <h2 className="font-semibold text-sm text-[var(--foreground)]">Crawl Complete</h2>
              <p className="text-xs text-[var(--muted-foreground)]">{result.crawled} pages scanned · {result.created} new articles created</p>
            </div>
          </div>

          {result.articles?.length > 0 && (
            <div className="space-y-2">
              {result.articles.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} className="text-[var(--muted-foreground)]" />
                    <span className="text-sm text-[var(--foreground)]">{a.title}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {a.tags?.filter((t: string) => t !== "website").map((t: string) => (
                      <span key={t} className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-[var(--border)]">
            <a href="#/knowledge-base" className="inline-flex items-center gap-1.5 text-sm text-[var(--primary)] hover:underline">
              <ExternalLink size={14} /> View Knowledge Base
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
