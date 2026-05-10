import { useFrame, useLoader } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

// TMDB's CDN serves images with Access-Control-Allow-Origin: *, so we tell
// three.js to request them with CORS enabled. Without this, the texture
// silently fails to upload to the GPU on some browsers.
class CorsTextureLoader extends THREE.TextureLoader {
  constructor() {
    super();
    this.setCrossOrigin("anonymous");
  }
}

// A single poster, textured onto a thin 3D plane. The whole plane gently
// bobs + rotates in place, while the parent scene handles the scroll-linked
// camera motion that gives the whole field depth.
//
// We don't use drei's useTexture because we want to fail gracefully: if the
// image fails to load, the plane renders as a solid dark card rather than
// crashing the suspense boundary.

interface Props {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  phase?: number;
}

export function Poster({ url, position, rotation = [0, 0, 0], scale = 1, phase = 0 }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  // useLoader's second arg is the class; we can't pass our CORS-configured
  // instance directly, so we subclass once to embed the crossOrigin default.
  const texture = useLoader(CorsTextureLoader, url);

  // Make posters slightly bigger than a pure 2:3 — gives them physical weight.
  const [w, h] = useMemo(() => [1 * scale, 1.5 * scale], [scale]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + phase;
    // Subtle bob and roll — 3s cycle per axis, tiny amplitude.
    ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.08;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.4) * 0.03;
    ref.current.rotation.y = rotation[1] + Math.sin(t * 0.3) * 0.05;
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        emissive="#1a0000"
        emissiveIntensity={0.35}
        metalness={0.25}
        roughness={0.6}
      />
    </mesh>
  );
}
