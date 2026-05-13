import { Canvas, useFrame } from "@react-three/fiber";
import { motion, useScroll } from "framer-motion";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

// Ambient 3D backdrop for the hero. Deliberately textureless — TMDB images
// on the browser side trigger CORS-tainted texture errors on every GPU
// frame, which crashed the page. Here we use pure emissive geometry: a
// parallax field of thin red film-frame tiles that float in space, matching
// the cinema aesthetic without any image dependencies.
function FilmFrameField({ scrollProgress }: { scrollProgress: React.MutableRefObject<number> }) {
  const groupRef = useRef<THREE.Group>(null);

  // Hand-placed layout, mirrored left/right for balance. Each entry drives
  // a single emissive plane; the group rotates gently on scroll.
  const tiles = useMemo<
    Array<{
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
      shade: string;
      phase: number;
    }>
  >(
    () => [
      { position: [-3.8, 1.4, -3.2], rotation: [0, 0.35, -0.08], scale: 1.1, shade: "#b71c1c", phase: 0.2 },
      { position: [-2.1, -0.6, -1.8], rotation: [0, 0.2, 0.06], scale: 1.0, shade: "#e53935", phase: 1.1 },
      { position: [-3.4, -1.7, -4.4], rotation: [0, 0.3, -0.04], scale: 1.2, shade: "#7a1212", phase: 2.3 },
      { position: [-5.0, 0.3, -5.8], rotation: [0, 0.5, 0.1], scale: 1.4, shade: "#b71c1c", phase: 0.8 },
      { position: [-1.2, 2.0, -2.6], rotation: [0, 0.1, -0.06], scale: 0.9, shade: "#e53935", phase: 3.1 },
      { position: [-4.6, -2.1, -2.2], rotation: [0, 0.4, 0.05], scale: 1.0, shade: "#7a1212", phase: 1.7 },
      { position: [-0.8, -2.0, -3.8], rotation: [0, -0.05, 0.04], scale: 1.1, shade: "#b71c1c", phase: 2.5 },
      { position: [3.8, 1.4, -3.2], rotation: [0, -0.35, 0.08], scale: 1.1, shade: "#e53935", phase: 0.4 },
      { position: [2.1, -0.6, -1.8], rotation: [0, -0.2, -0.06], scale: 1.0, shade: "#7a1212", phase: 1.3 },
      { position: [3.4, -1.7, -4.4], rotation: [0, -0.3, 0.04], scale: 1.2, shade: "#b71c1c", phase: 2.1 },
      { position: [5.0, 0.3, -5.8], rotation: [0, -0.5, -0.1], scale: 1.4, shade: "#e53935", phase: 0.9 },
      { position: [1.2, 2.0, -2.6], rotation: [0, -0.1, 0.06], scale: 0.9, shade: "#7a1212", phase: 2.7 },
      { position: [4.6, -2.1, -2.2], rotation: [0, -0.4, -0.05], scale: 1.0, shade: "#b71c1c", phase: 1.5 },
      { position: [0.8, -2.0, -3.8], rotation: [0, 0.05, -0.04], scale: 1.1, shade: "#e53935", phase: 3.3 },
    ],
    [],
  );

  const meshesRef = useRef<(THREE.Mesh | null)[]>([]);

  useFrame(({ clock, camera }) => {
    const elapsed = clock.getElapsedTime();
    const p = scrollProgress.current;

    // Dolly-in + tilt on scroll — same gesture the textured version had.
    camera.position.z = 6 - p * 1.2;
    camera.position.y = -p * 0.25;
    camera.lookAt(0, 0, 0);

    if (groupRef.current) {
      groupRef.current.rotation.z = p * 0.05;
      groupRef.current.children.forEach((child, i) => {
        const base = tiles[i];
        if (!base) return;
        const t = elapsed + base.phase;
        // Subtle per-tile bob + roll — keeps the scene breathing between scrolls.
        child.position.y = base.position[1] + Math.sin(t * 0.8) * 0.08 - p * 0.1;
        child.rotation.z = base.rotation[2] + Math.sin(t * 0.4) * 0.03;
        child.rotation.y = base.rotation[1] + Math.sin(t * 0.3) * 0.05;
      });
    }
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 2]} intensity={1.8} color="#e53935" distance={12} decay={1.4} />
      <pointLight position={[-5, 3, 3]} intensity={0.6} color="#fca5a5" />
      <fog attach="fog" args={["#0a0a0b", 4, 14]} />

      <group ref={groupRef}>
        {tiles.map((tile, i) => (
          <mesh
            key={i}
            ref={(m) => {
              meshesRef.current[i] = m;
            }}
            position={tile.position}
            rotation={tile.rotation}
          >
            <planeGeometry args={[1 * tile.scale, 1.5 * tile.scale]} />
            <meshStandardMaterial
              color={tile.shade}
              emissive={tile.shade}
              emissiveIntensity={0.55}
              metalness={0.35}
              roughness={0.55}
              side={THREE.DoubleSide}
              transparent
              opacity={0.88}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}

// Outer wrapper: gates on prefers-reduced-motion, owns the scroll ref, and
// fades the canvas in in sync with the hero copy.
export function PosterFieldBackdrop() {
  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const scrollProgressRef = useRef(0);
  const { scrollY } = useScroll();
  useEffect(() => {
    return scrollY.on("change", (v) => {
      const max = window.innerHeight * 0.9;
      scrollProgressRef.current = Math.min(1, Math.max(0, v / max));
    });
  }, [scrollY]);

  if (reducedMotion) return null;

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
      className="pointer-events-none absolute inset-0"
      style={{ maskImage: "radial-gradient(ellipse at center, black 55%, transparent 85%)" }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          <FilmFrameField scrollProgress={scrollProgressRef} />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}
