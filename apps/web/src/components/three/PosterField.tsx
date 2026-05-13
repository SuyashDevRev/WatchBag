import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

// A single poster, textured onto a thin 3D plane. We load images with a
// plain <img> tag (no `crossOrigin` attribute) so browsers don't apply CORS
// gating — TMDB's CDN doesn't send Access-Control-Allow-Origin for image
// requests, which would otherwise block every texture on the page.
//
// The tradeoff is that the resulting texture is "tainted" — we can't readPixels
// on it, which matters for screenshots and postprocessing. Since neither is
// in play for this hero, painting the texture on a plane is fine.
//
// If an image still fails to load (offline, TMDB down, etc.), we render a
// solid dark-red plane instead of throwing into R3F's suspense boundary.

interface Props {
  url: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  phase?: number;
}

export function Poster({ url, position, rotation = [0, 0, 0], scale = 1, phase = 0 }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    // No crossOrigin — keeps TMDB's non-CORS responses from being blocked.
    img.src = url;
    img.onload = () => {
      if (cancelled) return;
      const t = new THREE.Texture(img);
      t.needsUpdate = true;
      t.colorSpace = THREE.SRGBColorSpace;
      setTexture(t);
    };
    img.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    return () => {
      cancelled = true;
    };
  }, [url]);

  const [w, h] = useMemo(() => [1 * scale, 1.5 * scale], [scale]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + phase;
    ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.08;
    ref.current.rotation.z = rotation[2] + Math.sin(t * 0.4) * 0.03;
    ref.current.rotation.y = rotation[1] + Math.sin(t * 0.3) * 0.05;
  });

  // Fallback plane: dark red with a soft emissive, so the field still reads
  // as filled even if several images fail to load.
  if (failed || !texture) {
    return (
      <mesh ref={ref} position={position} rotation={rotation}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial
          color="#2a0a0b"
          emissive="#7a1212"
          emissiveIntensity={0.18}
          transparent
          opacity={0.9}
          side={THREE.DoubleSide}
        />
      </mesh>
    );
  }

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
