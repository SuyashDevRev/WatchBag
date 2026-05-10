import { Canvas, useFrame } from "@react-three/fiber";
import { motion, useScroll, useTransform } from "framer-motion";
import { Suspense, useMemo, useRef } from "react";
import * as THREE from "three";

// A mid-page 3D moment: a ring of thin red tiles (think film-frames seen
// from the side) orbiting a glowing core. Zero textures, zero external
// assets — just geometry and emissive materials, so this chunk is tiny
// and mounts instantly. Scroll drives a subtle camera tilt for presence
// without hijacking the page.
function Ring() {
  const groupRef = useRef<THREE.Group>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  // 16 cards spaced around a circle, pre-computed so useFrame only rotates
  // the parent group rather than moving each child.
  const tiles = useMemo(() => {
    const count = 16;
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      const radius = 3.2;
      return {
        position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius] as [number, number, number],
        rotationY: -angle + Math.PI / 2,
        shade: i % 3 === 0 ? "#e53935" : i % 3 === 1 ? "#b71c1c" : "#7a1212",
      };
    });
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.15;
    if (coreRef.current) {
      const t = performance.now() * 0.001;
      const s = 1 + Math.sin(t * 1.4) * 0.06;
      coreRef.current.scale.set(s, s, s);
    }
  });

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#e53935" distance={10} decay={1.8} />
      <pointLight position={[0, 4, 4]} intensity={0.6} color="#fca5a5" />

      {/* Core — the "projector bulb" at the center. */}
      <mesh ref={coreRef} position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#b71c1c"
          emissive="#e53935"
          emissiveIntensity={2.2}
          roughness={0.3}
        />
      </mesh>

      {/* Orbiting frames. */}
      <group ref={groupRef}>
        {tiles.map((t, i) => (
          <mesh key={i} position={t.position} rotation={[0, t.rotationY, 0]}>
            <boxGeometry args={[1.1, 1.65, 0.04]} />
            <meshStandardMaterial
              color={t.shade}
              emissive={t.shade}
              emissiveIntensity={0.25}
              metalness={0.4}
              roughness={0.5}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

// The outer wrapper: handles motion-preference gating, scroll-linked
// parallax, and the fade-in. Renders as a standalone section between
// rails. Compact height (~380px) so it's a punctuation mark, not a wall.
export function OrbitingRing() {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const { scrollYProgress } = useScroll();
  // Subtle parallax: the whole canvas floats vertically as the page scrolls.
  const parallaxY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section className="relative isolate overflow-hidden py-24 sm:py-32">
      {/* Red atmospheric glow behind the ring — ties it to the overall
          cinema aesthetic. */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[50vmin] w-[50vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-800/30 blur-[110px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-120px" }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-ink-600/60 bg-ink-800/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ink-200 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(229,57,53,0.8)]" />
          Built for sharing
        </div>
        <h2 className="mt-5 font-display text-4xl font-semibold tracking-tight text-ink-50 sm:text-5xl">
          One link, your whole watchlist.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-ink-200">
          Every public watchbag gets a shareable URL. Show a friend exactly what to watch next.
        </p>
      </motion.div>

      {!reducedMotion && (
        <motion.div
          aria-hidden
          style={{ y: parallaxY }}
          className="pointer-events-none absolute inset-0 -z-10"
        >
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 2.2, 6.5], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
          >
            <Suspense fallback={null}>
              <Ring />
            </Suspense>
          </Canvas>
        </motion.div>
      )}
    </section>
  );
}
