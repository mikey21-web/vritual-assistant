import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Only allow safe URL schemes in AI-generated links. Without this, a compromised or
// manipulated AI response could render a real clickable link with an href like
// "javascript:fetch(...)" that runs in this app's origin when clicked.
function safeHref(href?: string): string | undefined {
  if (!href) return undefined;
  const trimmed = href.trim();
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return trimmed;
  return undefined;
}

export default function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        a: ({ children, href }) => {
          const safe = safeHref(href);
          if (!safe) return <span className="underline text-[var(--primary)]">{children}</span>;
          return <a href={safe} target="_blank" rel="noopener noreferrer" className="underline text-[var(--primary)]">{children}</a>;
        },
        code: ({ children }) => <code className="px-1 py-0.5 rounded bg-[var(--muted)] font-mono text-[0.85em]">{children}</code>,
        h1: ({ children }) => <div className="font-semibold mb-1">{children}</div>,
        h2: ({ children }) => <div className="font-semibold mb-1">{children}</div>,
        h3: ({ children }) => <div className="font-semibold mb-1">{children}</div>,
        table: ({ children }) => <div className="overflow-x-auto mb-1.5"><table className="text-xs border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="border border-[var(--border)] px-2 py-1 text-left font-semibold bg-[var(--muted)]">{children}</th>,
        td: ({ children }) => <td className="border border-[var(--border)] px-2 py-1">{children}</td>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
