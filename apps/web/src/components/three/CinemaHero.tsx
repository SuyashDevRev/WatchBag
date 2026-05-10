import { Canvas } from "@react-three/fiber";
import { motion, useScroll, useTransform } from "framer-motion";
import { Search } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { trpc } from "../../lib/trpc";
import { CinemaScene } from "./CinemaScene";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

// Full hero — a WebGL poster field behind the copy + search. Falls back to
// the current 2D hero layout when:
//  - the user prefers reduced motion
//  - WebGL isn't available
//  - trending posters haven't loaded yet (just render the copy + search
//    without the 3D layer so the page isn't blocked)
export function CinemaHero() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Read the user's motion preference once. If they asked for reduced
  // motion, we skip the WebGL canvas entirely.
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-color-scheme: dark)").media !== "" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Fetch live trending posters — same procedure the homepage rail uses,
  // so TanStack Query dedupes.
  const trending = trpc.show.trending.useQuery();
  const posterUrls = useMemo(() => {
    if (!trending.data) return [];
    return trending.data
      .filter((item) => item.posterPath)
      .slice(0, 14)
      .map((item) => `${TMDB_IMG}${item.posterPath}`);
  }, [trending.data]);

  // Scroll-linked progress. 0 when the hero is pinned, 1 once the user
  // has scrolled past it. We pass a ref (not a reactive motion value) to
  // the scene so useFrame can read it without re-renders.
  const scrollProgressRef = useRef(0);
  const { scrollY } = useScroll();
  useEffect(() => {
    return scrollY.on("change", (v) => {
      const max = window.innerHeight * 0.9;
      scrollProgressRef.current = Math.min(1, Math.max(0, v / max));
    });
  }, [scrollY]);

  // Hero content fades/scales out on scroll, identical to the old Hero so
  // the "flow" search morph still works.
  const heroSearchOpacity = useTransform(scrollY, [0, 220], [1, 0]);
  const heroSearchScale = useTransform(scrollY, [0, 220], [1, 0.96]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  }

  const canRender3D = !reducedMotion && posterUrls.length > 0;

  return (
    <section
      ref={scrollRef}
      className="relative overflow-hidden pb-20 pt-24 sm:pb-28 sm:pt-32 lg:pb-36 lg:pt-40"
    >
      {/* Ambient red glows — same as the 2D hero. These stay visible under
          the 3D canvas too; they're what gives the scene its warmth. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
      >
        <div className="absolute left-1/2 top-0 h-[60vmin] w-[60vmin] -translate-x-1/2 rounded-full bg-brand-800/40 blur-[120px]" />
        <div className="absolute left-1/3 top-1/3 h-[40vmin] w-[40vmin] rounded-full bg-brand-600/20 blur-[100px]" />
      </div>

      {/* 3D poster field — absolute, behind the copy. */}
      {canRender3D && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-0"
          style={{ maskImage: "radial-gradient(ellipse at center, black 55%, transparent 85%)" }}
        >
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0, 6], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              <CinemaScene posters={posterUrls} scrollProgress={scrollProgressRef} />
            </Suspense>
          </Canvas>
        </div>
      )}

      {/* Copy + search — relative so it sits above the canvas. */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="inline-flex items-center gap-2 rounded-full border border-ink-600/60 bg-ink-800/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink-200 backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inset-0 animate-ping rounded-full bg-brand-500/60" />
            <span className="relative h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_12px_rgba(229,57,53,0.9)]" />
          </span>
          Your watchlist, reimagined
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-6 font-display text-5xl font-semibold tracking-tight text-ink-50 sm:text-6xl lg:text-7xl"
        >
          Every movie, every show,
          <br />
          <span className="bg-gradient-to-r from-brand-300 via-brand-500 to-brand-400 bg-clip-text text-transparent">
            in one place.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mt-5 max-w-xl text-base text-ink-200 sm:text-lg"
        >
          Build watchbags of what you're watching, what you've seen, and what's next. Share them
          with friends. Discover what everyone's obsessed with.
        </motion.p>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ opacity: heroSearchOpacity, scale: heroSearchScale }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="mx-auto mt-10 w-full max-w-xl"
        >
          <div className="group relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-200" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              placeholder="Search for Inception, Breaking Bad, Dune…"
              aria-label="Search movies and shows"
              className="w-full rounded-full border border-ink-600/60 bg-ink-800/70 py-4 pl-12 pr-28 text-base text-ink-50 shadow-[0_20px_60px_-20px_rgba(183,28,28,0.25)] outline-none backdrop-blur transition focus:border-brand-500/60 focus:bg-ink-800 focus:ring-2 focus:ring-brand-600/30"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 inline-flex -translate-y-1/2 items-center rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-500"
            >
              Search
            </button>
          </div>
        </motion.form>
      </div>
    </section>
  );
}
