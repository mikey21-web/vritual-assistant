import { Sun, Moon, Bell, Menu, Search } from "lucide-react";
import { Button } from "../ui/button";

export function Topbar({ onMenuToggle, dark, onThemeToggle }: { onMenuToggle: () => void; dark: boolean; onThemeToggle: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-[var(--border)] bg-[var(--background)] px-4 lg:px-6">
      <Button variant="ghost" size="icon" onClick={onMenuToggle} className="lg:hidden">
        <Menu size={18} />
      </Button>

      <div className="flex-1" />

      <button className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]" title="Search (⌘K)">
        <Search size={16} />
      </button>

      <button className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)] relative" title="Notifications">
        <Bell size={16} />
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500" />
      </button>

      <button onClick={onThemeToggle} className="rounded-md p-2 text-[var(--muted-foreground)] hover:bg-[var(--accent)]" title="Toggle theme">
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
