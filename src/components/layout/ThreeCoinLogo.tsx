"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

interface CoinModelProps {
  rotationSpeed?: number;
}

function CoinModel({ rotationSpeed = 3.5 }: CoinModelProps) {
  const { scene } = useGLTF("/models/stacklume_logo.glb");
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    const scale = 1.8 / maxDim;
    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.sub(center.multiplyScalar(scale));

    const cam = camera as THREE.PerspectiveCamera;
    // eslint-disable-next-line react-hooks/immutability -- Three.js camera mutation is the standard API
    cam.fov = 50;
    cam.updateProjectionMatrix();
  }, [camera, scene]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * rotationSpeed;
    groupRef.current.rotation.x = 0.12;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

useGLTF.preload("/models/stacklume_logo.glb");

export interface ThreeCoinLogoProps {
  width?: number;
  height?: number;
  rotationSpeed?: number;
}

export function ThreeCoinLogo({
  width = 28,
  height = 28,
  rotationSpeed = 3.5,
}: ThreeCoinLogoProps) {
  return (
    <Canvas
      style={{ width, height }}
      camera={{ position: [0, 0, 3], fov: 50 }}
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      }}
      dpr={1}
      frameloop="always"
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 3]} intensity={1.8} color="#d4a520" />
      <directionalLight position={[-2, -1, -2]} intensity={0.4} color="#1a3a6e" />
      <directionalLight position={[0, -2, 1]} intensity={0.3} color="#ffffff" />
      <Suspense fallback={null}>
        <CoinModel rotationSpeed={rotationSpeed} />
      </Suspense>
    </Canvas>
  );
}
