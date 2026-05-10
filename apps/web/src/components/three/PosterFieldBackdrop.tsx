import { Canvas } from "@react-three/fiber";
import { motion, useScroll } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef } from "react";

import { trpc } from "../../lib/trpc";
import { CinemaScene } from "./CinemaScene";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

// The WebGL half of the hero, isolated from the copy. Mounts only once
// trending posters have loaded + motion isn't reduced, and fades itself
// in so the appearance is intentional instead of a pop.
export function PosterFieldBackdrop() {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const trending = trpc.show.trending.useQuery();
  const posterUrls = useMemo(() => {
    if (!trending.data) return [];
    return trending.data
      .filter((item) => item.posterPath)
      .slice(0, 14)
      .map((item) => `${TMDB_IMG}${item.posterPath}`);
  }, [trending.data]);

  const scrollProgressRef = useRef(0);
  const { scrollY } = useScroll();
  useEffect(() => {
    return scrollY.on("change", (v) => {
      const max = window.innerHeight * 0.9;
      scrollProgressRef.current = Math.min(1, Math.max(0, v / max));
    });
  }, [scrollY]);

  if (reducedMotion || posterUrls.length === 0) return null;

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.25, 0.1, 0.25, 1] }}
      className="pointer-events-none absolute inset-0"
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
    </motion.div>
  );
}
