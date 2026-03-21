"use client";

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { Showcase } from "./Showcase";
import { Stats } from "./Stats";
import { OpenSource } from "./OpenSource";
import { Download } from "./Download";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: "oklch(0.13 0.02 260)",
        color: "oklch(0.93 0 0)",
      }}
    >
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Showcase />
        <Stats />
        <OpenSource />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
