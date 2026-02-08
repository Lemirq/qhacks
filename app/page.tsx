'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FeatureSteps } from '@/components/ui/feature-section';

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

  // Track scroll progress for the entire page
  const { scrollYProgress } = useScroll();

  // Transform values based on scroll
  // Padding: 1.25rem -> 0rem (first 30% of scroll)
  const padding = useTransform(scrollYProgress, [0, 0.3], ['1.25rem', '0rem']);

  // Scale/Zoom: 1 -> 2.5 (zoom in significantly, first 50% of scroll)
  const scale = useTransform(scrollYProgress, [0, 0.5], [1, 2.5]);

  // White overlay opacity: fade in 0→1 then quickly fade out 1→0
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.45, 5], [0, 1, 0]);

  // Content: appear a bit after white overlay is full (55% to 72% of scroll), then stick and settle
  const contentOpacity = useTransform(scrollYProgress, [0.55, 0.72], [0, 1]);

  // Content translateY: "come down" into place as it fades in
  const contentY = useTransform(scrollYProgress, [0.55, 0.72], [24, 0]);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const handleMove = (e: MouseEvent) => {
      const rect = hero.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      hero.style.setProperty('--mx', `${x * 18}px`);
      hero.style.setProperty('--my', `${y * 12}px`);
    };

    hero.addEventListener('mousemove', handleMove);
    return () => hero.removeEventListener('mousemove', handleMove);
  }, []);

  return (
    <div className="lp">
      {/* ───── FLOATING NAV ───── */}
      <nav className="lp-nav">
        <span className="lp-nav-logo">KingsView</span>
        <div className="lp-nav-links">
          <Link href="/map">Explore</Link>
          <Link href="/editor">Build</Link>
        </div>
      </nav>

      {/* Spacer so content reaches viewport when overlay is full (progress 0.5) */}
      <div style={{ height: '150vh' }} />

      {/* ───── HERO ───── */}
      <motion.section
        className="lp-hero-wrap-fixed"
        style={{ padding }}
      >
        <motion.div className="lp-hero" ref={heroRef} style={{ scale }}>
          <img src="/thumb.jpg" alt="" className="lp-hero-img" draggable={false} />
          <div className="lp-hero-vignette" />

          <div className="lp-fireflies">
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="lp-firefly" style={{
                left: `${10 + (i * 37 + i * i * 7) % 80}%`,
                top: `${15 + (i * 53 + i * 3) % 65}%`,
                animationDelay: `${(i * 0.7) % 4}s`,
                animationDuration: `${3 + (i % 3)}s`,
              }} />
            ))}
          </div>

          <h1 className="lp-hero-title">Reimagine.</h1>

          <Link href="/map" className="lp-hero-cta">
            Enter the Golden Age&ensp;&rarr;
          </Link>

          {/* White overlay that fades in - pointer-events: none so it doesn't block button clicks */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#fff',
              opacity: overlayOpacity,
              zIndex: 10,
              pointerEvents: 'none',
            }}
          />
        </motion.div>
      </motion.section>

      {/* Content: sticky so it appears in view as overlay finishes, then normal scroll */}
      <motion.div
        className="lp-content-sticky"
        style={{
          opacity: contentOpacity,
          y: contentY,
          position: 'sticky',
          top: 0,
          zIndex: 20,
          backgroundColor: '#fff',
          paddingRight: '1.5rem',
        }}
      >
        {/* ───── STATEMENT ───── */}
        <section className="lp-statement" style={{ paddingTop: '50rem' }}>
          <span className="lp-stmt-rule lp-fade" style={{ animationDelay: '0.1s' }} />

          <p className="lp-stmt-small lp-fade" style={{ animationDelay: '0.25s' }}>
            Every golden age begins with a vision. Legacies are built to last.
          </p>

          <div className="lp-stmt-block lp-fade" style={{ animationDelay: '0.5s' }}>
            <h2 className="lp-stmt-line">Kingston stands at the dawn of a new era.</h2>
            <h2 className="lp-stmt-line">Let&apos;s build it together.</h2>
          </div>

          <p className="lp-stmt-sub lp-fade" style={{ animationDelay: '0.75s' }}>
            Craft the next chapter of prosperity.
          </p>

          <h2 className="lp-stmt-main lp-fade" style={{ animationDelay: '0.95s' }}>
            Shape a new <span className="lp-stmt-gold">Golden Age.</span>
          </h2>

          <Link
            href="/map"
            className="lp-stmt-cta lp-fade"
            style={{ animationDelay: '1.35s' }}
          >
            Enter the Golden Age&ensp;&rarr;
          </Link>
        </section>

        {/* ───── YOUR JOURNEY ───── */}
<section className="bg-[#f4efe6]" style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}>
  <FeatureSteps
    title="Building Kingston's Golden Age"
    subtitle="Planning Kingston’s future with clarity and precision."
    features={[
      {
        step: 'Step 1',
        title: 'Shape a New Golden Era',
        content:
          'Turn concepts, sketches, and blueprints into intelligent 3D developments. Design spaces that power economic growth, strengthen communities, and define Kingston’s next chapter.',
        image: '/carousel/city-of-kingston-ontario-canada.jpg',
      },
      {
        step: 'Step 2',
        title: 'Build Where Growth Happens',
        content:
          'Place projects directly into real city locations. Visualize how housing, business hubs, and public spaces connect neighborhoods and drive a thriving urban ecosystem.',
        image: '/carousel/PZeSqEBK-RS12147_Kingston-Glamour-Shots-Downtown-1-1024x683.jpg',
      },
      {
        step: 'Step 3',
        title: 'Design for Generations',
        content:
          "Plan with long-term success in mind. Simulate environmental, economic, and social impacts to ensure today's developments become tomorrow's lasting legacy.",
        image: '/carousel/kingston-waterfront-at-night.jpg',
      },
    ]}
    autoPlayInterval={4000}
    imageHeight="h-[500px]"
  />
</section>
        {/* ───── FOOTER ───── */}
        <footer className="lp-footer">
          <a href="https://github.com/Lemirq/qhacks" target="_blank" rel="noopener noreferrer">
            Source on GitHub
          </a>
        </footer>
      </motion.div>
    </div>
  );
}
