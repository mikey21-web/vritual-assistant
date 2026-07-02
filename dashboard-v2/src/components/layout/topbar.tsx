import { Sun, Moon, Bell, Menu, Search } from "lucide-react";

export function Topbar({ onMenuToggle, dark, onThemeToggle }: { onMenuToggle: () => void; dark: boolean; onThemeToggle: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--background)]/80 px-4 lg:px-6">
      <button onClick={onMenuToggle} className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors">
        <Menu size={17} />
      </button>

      <div className="flex-1" />

      <button className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors" title="Search">
        <Search size={15} />
      </button>

      <button className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors relative" title="Notifications">
        <Bell size={15} />
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[var(--destructive)] ring-2 ring-[var(--background)]" />
      </button>

      <button onClick={onThemeToggle} className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)] transition-colors" title="Toggle theme">
        {dark ? <Sun size={15} /> : <Moon size={15} />}
      </button>
    </header>
  );
}
