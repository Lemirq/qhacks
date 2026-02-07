'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

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
        <p className="lp-stmt-line">
          Cities grow faster than we can plan for them.
        </p>
        <p className="lp-stmt-line lp-stmt-large">
          Before breaking ground on a new building,<br />
          Kingston deserves to see what it will look like,<br />
          how traffic will shift, and what it <em>costs the air.</em>
        </p>
      </section>

      {/* ───── DETAILS ───── */}
      <section className="lp-details">
        <div className="lp-detail">
          <span className="lp-detail-num">I</span>
          <h3>The City in 3D</h3>
          <p>
            Kingston&apos;s buildings pulled from OpenStreetMap, extruded into
            real geometry with satellite-textured roads and live traffic
            simulation — 30 AI vehicles navigating signals in real time.
          </p>
          <Link href="/map" className="lp-detail-link">Enter the city &rarr;</Link>
        </div>

        <div className="lp-detail">
          <span className="lp-detail-num">II</span>
          <h3>Design &amp; Place</h3>
          <p>
            Create buildings from blueprints or from scratch — floors, roofs,
            windows, textures — then drop them onto the map and export as
            GLB models for any 3D workflow.
          </p>
          <Link href="/editor" className="lp-detail-link">Open the editor &rarr;</Link>
        </div>

        <div className="lp-detail">
          <span className="lp-detail-num">III</span>
          <h3>Measure the Impact</h3>
          <p>
            Simulate the construction timeline. Watch traffic reroute around
            closures. Track CO&#8322; emissions, noise levels, and air quality
            before the first shovel hits the ground.
          </p>
        </div>
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
