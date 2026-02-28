"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";

interface CoinModelProps {
  rotationSpeed?: number;
}

function CoinModel({ rotationSpeed = 3.5 }: CoinModelProps) {
  const { scene } = useGLTF("/models/stacklume_logo.glb");
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Centrar y escalar el modelo al montar
  useEffect(() => {
    if (!groupRef.current) return;

    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    // Escalar para que quepa en la vista
    const scale = 1.8 / maxDim;
    groupRef.current.scale.setScalar(scale);
    groupRef.current.position.sub(center.multiplyScalar(scale));

    // Ajustar cámara
    (camera as THREE.PerspectiveCamera).fov = 50;
    camera.updateProjectionMatrix();
  }, [camera, scene]);

  // Animación de moneda girando
  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * rotationSpeed;
    // Leve tilt en X para efecto de moneda (no perfectamente frontal)
    groupRef.current.rotation.x = 0.12;
  });

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

// Pre-cargar el GLB para evitar delay en la primera renderización
useGLTF.preload("/models/stacklume_logo.glb");

interface SpinningCoinLogoProps {
  width?: number;
  height?: number;
  rotationSpeed?: number;
  className?: string;
}

export function SpinningCoinLogo({
  width = 28,
  height = 28,
  rotationSpeed = 3.5,
  className,
}: SpinningCoinLogoProps) {
  return (
    <div
      style={{ width, height }}
      className={className}
    >
      <Suspense
        fallback={
          <div
            style={{ width, height }}
            className="rounded-md bg-primary"
          />
        }
      >
        <Canvas
          style={{ width, height }}
          camera={{ position: [0, 0, 3], fov: 50 }}
          gl={{
            alpha: true,
            antialias: true,
            powerPreference: "low-power",
          }}
          dpr={[1, 1.5]}
        >
          {/* Iluminación con paleta navy + gold */}
          <ambientLight intensity={0.5} />
          {/* Luz principal dorada desde arriba-derecha */}
          <directionalLight
            position={[2, 2, 3]}
            intensity={1.8}
            color="#d4a520"
          />
          {/* Backlight azul navy para profundidad */}
          <directionalLight
            position={[-2, -1, -2]}
            intensity={0.4}
            color="#1a3a6e"
          />
          {/* Relleno suave desde abajo */}
          <directionalLight
            position={[0, -2, 1]}
            intensity={0.3}
            color="#ffffff"
          />
          {/* Environment para reflections metálicos */}
          <Environment preset="city" />

          <CoinModel rotationSpeed={rotationSpeed} />
        </Canvas>
      </Suspense>
    </div>
  );
}
