import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

import { authClient, useSession } from "../lib/auth-client";
import { cn } from "../lib/cn";

export function AccountMenu() {
  const session = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const user = session.data?.user;
  if (!user) return null;

  async function handleSignOut() {
    setOpen(false);
    const { error } = await authClient.signOut();
    if (error) {
      toast.error(error.message ?? "Couldn't sign out");
      return;
    }
    toast.success("Signed out");
    navigate("/");
  }

  const label = user.name || user.email.split("@")[0] || user.email;
  const initial = label.charAt(0).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-ink-600/60 bg-ink-800/70 py-1 pl-1 pr-3 text-sm text-ink-100 transition",
          "hover:border-brand-500/60 hover:text-ink-50",
          open && "border-brand-500/60 text-ink-50",
        )}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-[13px] font-semibold text-white">
          {user.image ? (
            <img
              src={user.image}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            initial
          )}
        </span>
        <span className="hidden max-w-[9rem] truncate sm:inline">{label}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
            role="menu"
            className="absolute right-0 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-ink-600/60 bg-ink-800/95 shadow-xl backdrop-blur"
          >
            <div className="border-b border-ink-600/50 px-3 py-2.5">
              <div className="text-sm font-medium text-ink-50">{label}</div>
              <div className="truncate text-xs text-ink-300">{user.email}</div>
            </div>
            <nav className="py-1 text-sm">
              <MenuLink to="/mywatchbags" onClick={() => setOpen(false)}>
                <UserIcon className="h-4 w-4" /> My watchbags
              </MenuLink>
              <MenuLink to="/settings" onClick={() => setOpen(false)}>
                <Settings className="h-4 w-4" /> Settings
              </MenuLink>
              <button
                type="button"
                onClick={handleSignOut}
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-brand-300 transition hover:bg-brand-600/10 hover:text-brand-200"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      role="menuitem"
      onClick={onClick}
      className="flex items-center gap-2.5 px-3 py-2 text-ink-100 transition hover:bg-ink-700/70 hover:text-ink-50"
    >
      {children}
    </Link>
  );
}
