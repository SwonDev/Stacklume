"use client";
// Stub vacío para la build demo — no importa Three.js ni @react-three/drei

export interface ThreeCoinLogoProps {
  width?: number;
  height?: number;
  rotationSpeed?: number;
}

// Componente nulo: SpinningCoinLogo en modo demo siempre usa el SVG estático,
// pero next/dynamic requiere que el módulo exporte algo válido
export function ThreeCoinLogo(_props: ThreeCoinLogoProps) {
  return null;
}
