"use client";

import { Navbar } from "./Navbar";
import { Hero } from "./Hero";
import { Stats } from "./Stats";
import { Features } from "./Features";
import { Showcase } from "./Showcase";
import { OpenSource } from "./OpenSource";
import { Download } from "./Download";
import { Footer } from "./Footer";

export function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a1628", color: "#e8eaf0" }}>
      <Navbar />
      <main>
        <Hero />
        <Stats />
        <Features />
        <Showcase />
        <OpenSource />
        <Download />
      </main>
      <Footer />
    </div>
  );
}
