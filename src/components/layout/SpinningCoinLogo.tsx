"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

// En modo demo no cargamos Three.js: evita WebGL context loss por CSP
const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// next/dynamic carga el chunk Three.js de forma lazy, solo fuera de demo.
// Usamos el alias @/ para que Turbopack pueda interceptarlo con resolveAlias
// (en demo builds, @/components/layout/ThreeCoinLogo → ThreeCoinLogoStub).
// El alias webpack en next.config.ts también cubre los builds locales.
const DynamicCoin = IS_DEMO
  ? null
  : dynamic(
      () =>
        import("@/components/layout/ThreeCoinLogo").then((m) => ({
          default: m.ThreeCoinLogo,
        })),
      { ssr: false, loading: () => null }
    );

interface SpinningCoinLogoProps {
  width?: number;
  height?: number;
  rotationSpeed?: number;
  className?: string;
}

function StaticLogo({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  return (
    <div
      style={{ width, height }}
      className="rounded-md bg-primary flex items-center justify-center overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt=""
        style={{ width: width * 0.8, height: height * 0.8 }}
        className="object-contain"
      />
    </div>
  );
}

export function SpinningCoinLogo({
  width = 28,
  height = 28,
  rotationSpeed = 3.5,
  className,
}: SpinningCoinLogoProps) {
  const staticFallback = <StaticLogo width={width} height={height} />;

  // Demo mode: solo SVG estático, sin Three.js
  if (IS_DEMO || !DynamicCoin) {
    return (
      <div style={{ width, height }} className={className}>
        {staticFallback}
      </div>
    );
  }

  return (
    <div style={{ width, height }} className={className}>
      <ErrorBoundary fallback={staticFallback}>
        <Suspense fallback={staticFallback}>
          <DynamicCoin
            width={width}
            height={height}
            rotationSpeed={rotationSpeed}
          />
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
