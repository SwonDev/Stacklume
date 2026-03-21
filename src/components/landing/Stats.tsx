"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";

const ease = [0.25, 0.1, 0.25, 1] as const;

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

const stats: Stat[] = [
  { value: 120, suffix: "+", label: "Widgets incluidos" },
  { value: 23, suffix: "", label: "Temas de color" },
  { value: 15, suffix: "+", label: "Plataformas detectadas" },
  { value: 3, suffix: "", label: "Vistas de layout" },
];

function AnimatedCounter({
  value,
  suffix,
  inView,
}: {
  value: number;
  suffix: string;
  inView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let frame: number;
    const duration = 1200;
    const start = performance.now();

    function animate(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * value));
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [inView, value]);

  return (
    <span className="landing-counter">
      {count}
      {suffix}
    </span>
  );
}

export function Stats() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="relative py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, ease }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"
            style={{ color: "oklch(0.93 0 0)" }}
          >
            Stacklume en{" "}
            <span className="landing-gold-gradient">números</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              className="text-center"
            >
              <div
                className="text-4xl font-bold md:text-5xl"
                style={{ color: "oklch(0.75 0.14 85)" }}
              >
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  inView={inView}
                />
              </div>
              <p
                className="mt-2 text-sm font-medium"
                style={{ color: "oklch(0.55 0 0)" }}
              >
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
