import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";

import { Poster } from "./PosterField";

// The scene itself — camera, lighting, and a hand-picked arrangement of
// poster planes. Scroll progress (0 at top, 1 by the hero's end) drives a
// subtle dolly-in and a slight converge of the poster cluster toward the
// center, giving the "floating, about to become the rail" feel.

interface Props {
  posters: string[];
  scrollProgress: React.MutableRefObject<number>;
}

// Hand-authored spread so the field reads as depth + composition, not noise.
// Coordinates are [x, y, z]; negative z is further from the camera.
const LAYOUT: Array<{ pos: [number, number, number]; rot: [number, number, number]; scale: number }> = [
  { pos: [-3.8, 1.4, -3.2], rot: [0, 0.35, -0.08], scale: 1.1 },
  { pos: [-2.1, -0.6, -1.8], rot: [0, 0.2, 0.06], scale: 1.0 },
  { pos: [-3.4, -1.7, -4.4], rot: [0, 0.3, -0.04], scale: 1.2 },
  { pos: [-5.0, 0.3, -5.8], rot: [0, 0.5, 0.1], scale: 1.4 },
  { pos: [-1.2, 2.0, -2.6], rot: [0, 0.1, -0.06], scale: 0.9 },
  { pos: [-4.6, -2.1, -2.2], rot: [0, 0.4, 0.05], scale: 1.0 },
  { pos: [-0.8, -2.0, -3.8], rot: [0, -0.05, 0.04], scale: 1.1 },
  { pos: [3.8, 1.4, -3.2], rot: [0, -0.35, 0.08], scale: 1.1 },
  { pos: [2.1, -0.6, -1.8], rot: [0, -0.2, -0.06], scale: 1.0 },
  { pos: [3.4, -1.7, -4.4], rot: [0, -0.3, 0.04], scale: 1.2 },
  { pos: [5.0, 0.3, -5.8], rot: [0, -0.5, -0.1], scale: 1.4 },
  { pos: [1.2, 2.0, -2.6], rot: [0, -0.1, 0.06], scale: 0.9 },
  { pos: [4.6, -2.1, -2.2], rot: [0, -0.4, -0.05], scale: 1.0 },
  { pos: [0.8, -2.0, -3.8], rot: [0, 0.05, -0.04], scale: 1.1 },
];

export function CinemaScene({ posters, scrollProgress }: Props) {
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const basePositions = useRef<Array<[number, number, number]>>(LAYOUT.map((l) => l.pos));

  useEffect(() => {
    camera.position.set(0, 0, 6);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  useFrame(() => {
    const p = scrollProgress.current; // 0 → 1 over the hero's scroll range

    // Dolly in + tilt down slightly as we scroll.
    camera.position.z = 6 - p * 1.4;
    camera.position.y = -p * 0.3;
    camera.lookAt(0, 0, 0);

    // Gently pull the posters toward the center (x and y toward 0) so by the
    // time the user hits the first rail below, the 3D field has visually
    // "collapsed" into the 2D grid.
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const base = basePositions.current[i];
        if (!base) return;
        const ease = 1 - Math.pow(1 - p, 2);
        child.position.x = base[0] * (1 - ease * 0.4);
        child.position.y = base[1] * (1 - ease * 0.4);
        // Subtle Z push-forward so they scale up a touch into the final state.
        child.position.z = base[2] + ease * 0.8;
      });
      // Full-field roll on scroll for the "everything is shifting" effect.
      groupRef.current.rotation.z = p * 0.06;
    }
  });

  return (
    <>
      {/* Low ambient + a single strong red key light from above = cinema */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 4]} intensity={1.1} color="#fca5a5" />
      <pointLight position={[-5, -3, 2]} intensity={0.8} color="#b71c1c" />
      <pointLight position={[5, 3, 2]} intensity={0.5} color="#e53935" />

      {/* Atmospheric red fog in the distance — masks the pop-in of
          far-away posters and creates depth. */}
      <fog attach="fog" args={["#0a0a0b", 4, 14]} />

      <group ref={groupRef}>
        {LAYOUT.map((item, i) => {
          const url = posters[i % Math.max(1, posters.length)];
          if (!url) return null;
          return (
            <Poster
              key={i}
              url={url}
              position={item.pos}
              rotation={item.rot}
              scale={item.scale}
              phase={i * 0.7}
            />
          );
        })}
      </group>
    </>
  );
}
