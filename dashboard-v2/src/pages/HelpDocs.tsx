import PageHeader from '../components/PageHeader';

export default function HelpDocs() {
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Help & Documentation" description="Guides, tips, and answers to common questions" />

      <section>
        <h2 className="text-xl font-semibold mb-3">Getting Started</h2>
        <div className="space-y-3">
          <Doc title="How do I add my first lead?" body="Go to Leads → New Lead. Fill in the contact info and save. The lead will be auto-scored." />
          <Doc title="How do I connect WhatsApp?" body="Go to Integrations → WhatsApp Business. You'll need your Meta Business ID and access token." />
          <Doc title="How do I create a form for my website?" body="Go to Forms → New Form. Add fields, save, and copy the shareable URL to embed." />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Common Tasks</h2>
        <div className="space-y-3">
          <Doc title="How does lead scoring work?" body="LeadAuto evaluates your scoring rules against each lead's data. Total score is clamped to -100 to 100, then mapped to a segment (HOT/WARM/COLD)." />
          <Doc title="What does each role mean?" body="OWNER: full access. ADMIN: everything except billing. MANAGER: team and leads. SALES_AGENT: only assigned leads." />
          <Doc title="How do I assign leads to team members?" body="Open a lead and click the assignee dropdown at the top. Or use bulk actions from the leads table." />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Troubleshooting</h2>
        <div className="space-y-3">
          <Doc title="Why aren't messages being sent?" body="Check the Failures page for errors. Common causes: invalid WhatsApp credentials, template rejection, or rate limits." />
          <Doc title="Why are leads not appearing?" body="Check that the source campaign is active. Look at the Webhook Events for any failed processing." />
          <Doc title="How do I reset my password?" body="On the login page, click 'Forgot password?' and enter your email. You'll receive a reset link." />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Need more help?</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          For advanced configuration, see the <a href="/user-guide" className="underline text-[var(--primary)]">User Guide</a> or contact your administrator.
        </p>
      </section>
    </div>
  );
}

function Doc({ title, body }: { title: string; body: string }) {
  return (
    <details className="border rounded-lg p-3 group">
      <summary className="cursor-pointer font-medium flex items-center justify-between">
        {title}
        <span className="text-[var(--muted-foreground)] group-open:rotate-90 transition-transform">›</span>
      </summary>
      <p className="mt-2 text-sm text-[var(--muted-foreground)]">{body}</p>
    </details>
  );
}
