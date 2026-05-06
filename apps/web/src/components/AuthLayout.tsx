import type { ReactNode } from "react";
import { Link } from "react-router";
import { motion } from "framer-motion";
import { Logo } from "./Logo";

interface Props {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer }: Props) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md flex-col items-center justify-center px-4 py-16 sm:px-6">
      {/* Soft red glow behind the card — echoes the homepage hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/30 blur-[100px]"
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full"
      >
        <Link to="/" aria-label="WatchBag home" className="mb-10 inline-block">
          <Logo size={32} />
        </Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-50 sm:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-sm text-ink-200">{subtitle}</p>}

        <div className="mt-8">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-ink-200">{footer}</div>}
      </motion.div>
    </div>
  );
}
