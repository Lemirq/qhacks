'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { FeatureSteps } from '@/components/ui/feature-section';

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

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

      {/* ───── HERO ───── */}
      <section className="lp-hero-wrap">
        <div className="lp-hero" ref={heroRef}>
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
            Explore Kingston&ensp;&rarr;
          </Link>
        </div>
      </section>
{/* ───── STATEMENT ───── */}
<section className="lp-statement">
  <span className="lp-stmt-rule lp-fade" style={{ animationDelay: '0.1s' }} />

  <p className="lp-stmt-small lp-fade" style={{ animationDelay: '0.25s' }}>
    Cities rise in moments. Legacies last for generations.
  </p>

  <div className="lp-stmt-block lp-fade" style={{ animationDelay: '0.5s' }}>
    <h2 className="lp-stmt-line">Before we build the future,</h2>
    <h2 className="lp-stmt-line">Kingston deserves to see it.</h2>
  </div>

  <p className="lp-stmt-sub lp-fade" style={{ animationDelay: '0.75s' }}>
    Design smarter. Build responsibly.
  </p>

  <h2 className="lp-stmt-main lp-fade" style={{ animationDelay: '0.95s' }}>
    Shape a new <span className="lp-stmt-gold">Golden Age.</span>
  </h2>

  <Link
    href="/map"
    className="lp-stmt-cta lp-fade"
    style={{ animationDelay: '1.35s' }}
  >
    Explore the Future&ensp;&rarr;
  </Link>
</section>

{/* ───── YOUR JOURNEY ───── */}
<section className="bg-[#f4efe6]">
  <FeatureSteps
    title="Your Journey Starts Here"
    subtitle="Kingston is entering a new golden age. New housing, hotels, and public spaces are creating jobs, attracting investment, and strengthening the local economy. Real progress is not about building fast. It is about building wisely and planning for the years ahead."
    features={[
      {
        step: 'Step 1',
        title: 'Build With Purpose',
        content:
          'Transform blueprints and ideas into accurate 3D buildings in minutes. Design spaces that support economic growth, community needs, and long-term stability.',
        image:
          'https://images.unsplash.com/photo-1686164748261-33e13eef70b6?q=80&w=2070&auto=format&fit=crop',
      },
      {
        step: 'Step 2',
        title: 'Place With Intention',
        content:
          'Position your building in real Kingston locations. Evaluate how new projects fit into neighborhoods, transit systems, and long-term development plans.',
        image:
          'https://images.unsplash.com/photo-1598897270268-f7091c801c3d?q=80&w=2070&auto=format&fit=crop',
      },
      {
        step: 'Step 3',
        title: 'Grow Responsibly',
        content:
          'Simulate environmental, traffic, and community impacts before construction begins. Use data to refine designs and protect Kingston’s future.',
        image:
          'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=2070&auto=format&fit=crop',
      },
    ]}
    autoPlayInterval={4000}
    imageHeight="h-[500px]"
  />
</section>



      {/* ───── CLOSING ───── */}
      <section className="lp-closing">
        <p className="lp-closing-text">
          Built for the City of Kingston at QHacks 2025.
        </p>
        <div className="lp-closing-ctas">
          <Link href="/map" className="lp-btn-warm">Explore Kingston</Link>
          <Link href="/editor" className="lp-btn-outline">Building Editor</Link>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="lp-footer">
        <a href="https://github.com/Lemirq/qhacks" target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
