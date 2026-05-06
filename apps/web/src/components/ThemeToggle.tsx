import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "../theme";
import { cn } from "../lib/cn";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="inline-flex items-center gap-1 rounded-full border border-ink-600/60 bg-ink-800/70 p-1 backdrop-blur"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition",
            theme === value
              ? "bg-brand-600 text-white shadow-[0_0_0_1px_rgba(183,28,28,0.5)]"
              : "text-ink-200 hover:text-ink-50",
          )}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
