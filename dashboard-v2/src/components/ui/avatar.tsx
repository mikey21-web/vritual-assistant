import * as React from "react";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-12 w-12 text-base" };

export const Avatar = ({ className = "", src, alt, fallback, size = "md", ...props }: AvatarProps) => {
  const [error, setError] = React.useState(false);
  return (
    <div className={`relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--muted)] ${sizeMap[size]} ${className}`} {...props}>
      {src && !error ? (
        <img src={src} alt={alt || ""} className="h-full w-full object-cover" onError={() => setError(true)} />
      ) : (
        <span className="font-medium text-[var(--muted-foreground)]">{fallback || "?"}</span>
      )}
    </div>
  );
};
