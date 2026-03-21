import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { OpenSource } from "@/components/landing/OpenSource";
import { InstallOptions } from "@/components/landing/InstallOptions";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main className="bg-background text-foreground">
      <Hero />
      <Features />
      <InstallOptions />
      <OpenSource />
      <Footer />
    </main>
  );
}
