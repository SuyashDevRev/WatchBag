import { cn } from "../lib/cn";
import { useTheme } from "../theme";

interface LogoProps {
  className?: string;
  // Icon height in pixels. Width scales to preserve aspect ratio.
  size?: number;
  // Whether to show the italic "watchbag." wordmark next to the icon.
  showWordmark?: boolean;
}

// The full lockup: icon + optional wordmark.
export function Logo({ className, size = 26, showWordmark = true }: LogoProps) {
  return (
    <span className={cn("relative inline-flex items-center gap-2.5", className)}>
      <LogoIcon size={size} />
      {showWordmark && <LogoWordmark />}
    </span>
  );
}

// Just the SVG icon — used standalone so the aura can wrap only the icon,
// leaving the wordmark untouched.
export function LogoIcon({ className, size = 26 }: { className?: string; size?: number }) {
  const { resolved } = useTheme();
  const src = resolved === "light" ? "/logo-light.svg" : "/logo-dark.svg";
  return (
    <img
      key={resolved}
      src={src}
      alt=""
      height={size}
      style={{ height: size, width: "auto" }}
      className={cn("relative shrink-0 select-none", className)}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
      draggable={false}
    />
  );
}

export function LogoWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative font-display text-[19px] font-semibold italic tracking-tight text-ink-50",
        className,
      )}
    >
      watchbag
      <span className="not-italic text-brand-500">.</span>
    </span>
  );
}
