import { useState, useEffect } from "react";

interface Props {
  logoUrl?: string | null;
  name: string;
  className?: string;
  initialsClassName?: string;
}

export default function BrandLogo({ logoUrl, name, className = "h-7 rounded", initialsClassName = "h-7 w-7 rounded-md bg-[var(--primary)] flex items-center justify-center" }: Props) {
  const [failed, setFailed] = useState(false);

  // Reset failure state if the URL changes (e.g. switching niches/tenants)
  useEffect(() => { setFailed(false); }, [logoUrl]);

  const initials = (name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  if (logoUrl && !failed) {
    return <img src={logoUrl} alt={name} className={className} onError={() => setFailed(true)} />;
  }

  return (
    <div className={initialsClassName}>
      <span className="text-[10px] font-bold text-[var(--primary-foreground)]">{initials}</span>
    </div>
  );
}
