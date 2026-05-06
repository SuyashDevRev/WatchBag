import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Link, useNavigate } from "react-router";
import { Search } from "lucide-react";
import { cn } from "../lib/cn";
import { AccountMenu } from "./AccountMenu";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { useSession } from "../lib/auth-client";

// Morphing header: starts transparent with a subtle logo, then gains a blurred
// background + a compact search input once the user scrolls past the hero.
export function FlowHeader() {
  const { scrollY } = useScroll();
  const ref = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const session = useSession();

  // Collapse window — between 60px and 280px the header transitions.
  const bgOpacity = useTransform(scrollY, [60, 280], [0, 1]);
  const borderOpacity = useTransform(scrollY, [60, 280], [0, 1]);
  const compactSearchOpacity = useTransform(scrollY, [160, 320], [0, 1]);
  const compactSearchY = useTransform(scrollY, [160, 320], [8, 0]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = ref.current?.querySelector("input");
    const q = (input?.value ?? "").trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  const isAuthed = !!session.data?.user;

  return (
    <motion.header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: "transparent",
      }}
    >
      {/* Backdrop — fades in on scroll */}
      <motion.div
        aria-hidden
        style={{ opacity: bgOpacity }}
        className="pointer-events-none absolute inset-0 bg-ink-900/85 backdrop-blur-md"
      />
      <motion.div
        aria-hidden
        style={{ opacity: borderOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-ink-600/70"
      />

      <div className="relative mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="WatchBag home" className="text-ink-100">
          <Logo size={26} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/explore">Explore</NavLink>
          {isAuthed && <NavLink to="/mywatchbags">My Bags</NavLink>}
        </nav>

        {/* Compact search — only visible once scrolled past hero */}
        <motion.form
          ref={ref}
          onSubmit={handleSubmit}
          style={{ opacity: compactSearchOpacity, y: compactSearchY }}
          className="ml-auto hidden w-80 md:block"
        >
          <div className="group relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-200" />
            <input
              type="search"
              placeholder="Search movies and shows…"
              aria-label="Search"
              className="w-full rounded-full border border-ink-600/60 bg-ink-800/70 py-2 pl-9 pr-4 text-sm text-ink-50 placeholder:text-ink-300 outline-none transition focus:border-brand-500/60 focus:bg-ink-800 focus:ring-2 focus:ring-brand-600/30"
            />
          </div>
        </motion.form>

        <div className={cn("flex items-center gap-3", "md:ml-0 ml-auto")}>
          <ThemeToggle />
          {isAuthed ? (
            <AccountMenu />
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-3 py-1.5 text-sm text-ink-100 hover:text-ink-50 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center rounded-full bg-brand-600 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-brand-500"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="rounded-full px-3 py-1.5 text-sm text-ink-200 transition hover:bg-ink-800/60 hover:text-ink-50"
    >
      {children}
    </Link>
  );
}
