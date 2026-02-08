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

  // White overlay opacity: 0 -> 1 (start immediately, complete at 50% of scroll)
  const overlayOpacity = useTransform(scrollYProgress, [0, 0.5], [0, 1]);

  // Content opacity: fade in after white overlay is complete (50% to 65% of scroll)
  const contentOpacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);

  // Content translateY: slide up as it fades in
  const contentY = useTransform(scrollYProgress, [0.5, 0.65], [50, 0]);

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

      {/* Spacer to create scroll height for animation */}
      <div style={{ height: '400vh' }} />

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

      {/* Content that fades in after white overlay */}
      <motion.div
        style={{
          opacity: contentOpacity,
          y: contentY,
          position: 'relative',
          zIndex: 20,
          backgroundColor: '#fff',
        }}
      >
        {/* ───── STATEMENT ───── */}
        <section className="lp-statement">
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
<section className="bg-[#f4efe6]">
  <FeatureSteps
    title="Building Kingston's Golden Age"
    subtitle="Planning Kingston’s future with clarity and precision."
    features={[
      {
        step: 'Step 1',
        title: 'Shape a New Golden Era',
        content:
          'Turn concepts, sketches, and blueprints into intelligent 3D developments. Design spaces that power economic growth, strengthen communities, and define Kingston’s next chapter.',
        image:
          'https://images.unsplash.com/photo-1686164748261-33e13eef70b6?q=80&w=2070&auto=format&fit=crop',
      },
      {
        step: 'Step 2',
        title: 'Build Where Growth Happens',
        content:
          'Place projects directly into real city locations. Visualize how housing, business hubs, and public spaces connect neighborhoods and drive a thriving urban ecosystem.',
        image:
          'https://images.unsplash.com/photo-1598897270268-f7091c801c3d?q=80&w=2070&auto=format&fit=crop',
      },
      {
        step: 'Step 3',
        title: 'Design for Generations',
        content:
          'Plan with long-term success in mind. Simulate environmental, economic, and social impacts to ensure today’s developments become tomorrow’s lasting legacy.',
        image:
          'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop',
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
