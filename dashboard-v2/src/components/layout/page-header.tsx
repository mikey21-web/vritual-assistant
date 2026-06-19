import { Button } from "../ui/button";

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  children?: React.ReactNode;
}

export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[var(--foreground)]">{title}</h1>
        {description && <p className="text-sm text-[var(--muted-foreground)] mt-1">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {children}
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
      </div>
    </div>
  );
}
