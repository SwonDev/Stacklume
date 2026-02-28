"use client";

import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { updateTrayIcon } from "@/lib/desktop";

/**
 * Renderiza el logo 3D en un canvas offscreen 64×64 y envía los frames
 * al tray icon de Tauri mediante la función updateTrayIcon.
 *
 * Usa setInterval en lugar de requestAnimationFrame para que la animación
 * siga funcionando cuando la ventana de Tauri está oculta.
 */
export function TrayIconUpdater() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const SIZE = 64;
    let cancelled = false;

    async function init() {
      // Importaciones dinámicas para evitar SSR
      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

      const canvas = document.createElement("canvas");
      canvas.width = SIZE;
      canvas.height = SIZE;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: false,
        powerPreference: "low-power",
      });
      renderer.setSize(SIZE, SIZE, false);
      renderer.setPixelRatio(1);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
      camera.position.set(0, 0, 3);

      // Iluminación igual a SpinningCoinLogo
      const ambient = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xd4a520, 1.8);
      keyLight.position.set(2, 2, 3);
      scene.add(keyLight);

      const backLight = new THREE.DirectionalLight(0x1a3a6e, 0.4);
      backLight.position.set(-2, -1, -2);
      scene.add(backLight);

      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(0, -2, 1);
      scene.add(fillLight);

      // Cargar GLB
      const loader = new GLTFLoader();
      let mesh: THREE.Group | null = null;

      try {
        const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
          loader.load("/models/stacklume_logo.glb", resolve, undefined, reject);
        });

        mesh = gltf.scene;

        // Auto-centrar y escalar
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 1.8 / maxDim;
        mesh.scale.setScalar(scale);
        mesh.position.sub(center.multiplyScalar(scale));
        mesh.rotation.x = 0.12;

        scene.add(mesh);
      } catch {
        // Si falla la carga del modelo, salir sin iniciar el loop
        renderer.dispose();
        return;
      }

      if (cancelled) {
        renderer.dispose();
        return;
      }

      // Pixel buffer para readPixels (WebGL es bottom-up)
      const gl = renderer.getContext() as WebGLRenderingContext;
      const rawBuffer = new Uint8Array(SIZE * SIZE * 4);
      const rgba: number[] = new Array(SIZE * SIZE * 4);

      const FPS = 30;
      let rotationY = 0;
      const rotationSpeed = 3.5;
      const frameDelta = 1 / FPS;

      intervalRef.current = setInterval(() => {
        if (!mesh || cancelled) return;

        rotationY += frameDelta * rotationSpeed;
        mesh.rotation.y = rotationY;

        renderer.render(scene, camera);

        // readPixels devuelve datos bottom-up → invertir filas para top-down
        gl.readPixels(0, 0, SIZE, SIZE, gl.RGBA, gl.UNSIGNED_BYTE, rawBuffer);

        for (let row = 0; row < SIZE; row++) {
          const srcRow = SIZE - 1 - row;
          for (let col = 0; col < SIZE; col++) {
            const srcIdx = (srcRow * SIZE + col) * 4;
            const dstIdx = (row * SIZE + col) * 4;
            rgba[dstIdx]     = rawBuffer[srcIdx];
            rgba[dstIdx + 1] = rawBuffer[srcIdx + 1];
            rgba[dstIdx + 2] = rawBuffer[srcIdx + 2];
            rgba[dstIdx + 3] = rawBuffer[srcIdx + 3];
          }
        }

        // Enviar al tray (sin await para no bloquear el loop)
        updateTrayIcon(rgba, SIZE, SIZE).catch(() => {});
      }, 1000 / FPS);
    }

    init().catch(() => {});

    return () => {
      cancelled = true;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // Componente invisible — solo efecto secundario
  return null;
}
