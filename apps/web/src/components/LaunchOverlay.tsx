import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { LogoIcon, LogoWordmark } from "./Logo";

// A brand-aware splash overlay that stays up until the page's initial
// dependencies are ready — fonts loaded, trending API resolved, and the
// caller's `ready` flag flipped (used by the homepage to wait on the
// 3D chunk). Enforces a ~600ms minimum so fast connections don't get a
// flash-of-loader. Fades the hero in as one coordinated reveal.
export function LaunchOverlay({ ready }: { ready: boolean }) {
  const [fontsReady, setFontsReady] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    // document.fonts is the web fonts loading API. Resolves once all
    // @font-face declarations needed for the current page are loaded.
    const fontPromise = document.fonts?.ready ?? Promise.resolve();
    fontPromise.then(() => setFontsReady(true)).catch(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Hard cap — if something hangs (bad TMDB, slow 3D chunk), we can't keep
  // the user behind the splash forever. After 3.5s, force reveal.
  const [forceReveal, setForceReveal] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setForceReveal(true), 3500);
    return () => clearTimeout(timer);
  }, []);

  const done = forceReveal || (fontsReady && minElapsed && ready);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          key="launch"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed inset-0 z-[100] grid place-items-center bg-ink-900"
          aria-hidden
        >
          {/* Ambient red glow behind the logo — matches the hero's atmosphere */}
          <span className="pointer-events-none absolute left-1/2 top-1/2 h-[50vmin] w-[50vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/45 blur-[120px]" />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative flex flex-col items-center gap-6"
          >
            <motion.span
              animate={{ scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex items-center gap-2.5"
            >
              <LogoIcon size={48} />
              <LogoWordmark className="text-2xl" />
            </motion.span>

            <div className="h-[2px] w-32 overflow-hidden rounded-full bg-ink-800">
              <motion.span
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                className="block h-full w-1/2 bg-gradient-to-r from-transparent via-brand-500 to-transparent"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
