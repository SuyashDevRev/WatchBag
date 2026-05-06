import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

// Horizontal rail with edge fades. The left/right gradient masks toggle off
// when the scroll container is at its respective edge so content isn't
// unnecessarily dimmed at the extremes.
export function Rail({ title, subtitle, children }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft <= 2);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      resize.disconnect();
    };
  }, []);

  return (
    <section className="relative">
      <motion.header
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="mx-auto flex max-w-7xl items-end justify-between gap-4 px-4 pb-5 sm:px-6 lg:px-8"
      >
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">
            {title}
          </h2>
          {subtitle && <p className="mt-1 text-sm text-ink-200">{subtitle}</p>}
        </div>
      </motion.header>

      {/* Relative wrapper so the edge fades can sit inside the max-w container. */}
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative mx-auto max-w-7xl"
      >
        {/* Left fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 transition-opacity duration-200 sm:w-20 lg:w-24"
          style={{
            opacity: atStart ? 0 : 1,
            background:
              "linear-gradient(to right, var(--rail-fade-from) 0%, var(--rail-fade-to) 100%)",
          }}
        />
        {/* Right fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 transition-opacity duration-200 sm:w-20 lg:w-24"
          style={{
            opacity: atEnd ? 0 : 1,
            background:
              "linear-gradient(to left, var(--rail-fade-from) 0%, var(--rail-fade-to) 100%)",
          }}
        />

        <div ref={scrollerRef} className="scrollbar-none overflow-x-auto">
          <div className="flex gap-4 px-4 pb-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </motion.div>
    </section>
  );
}
