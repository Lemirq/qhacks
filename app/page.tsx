'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';

export default function Landing() {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // parallax-ish drift on the fireflies
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
        <span className="lp-nav-logo">QMap</span>
        <div className="lp-nav-links">
          <Link href="/map">Explore</Link>
          <Link href="/editor">Editor</Link>
        </div>
      </nav>

      {/* ───── HERO PAINTING ───── */}
      <section className="lp-hero-wrap">
        <div className="lp-hero" ref={heroRef}>
          {/* hero image */}
          <img src="/thumb.jpg" alt="" className="lp-hero-img" draggable={false} />
          <div className="lp-hero-vignette" />

          {/* fireflies */}
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

          {/* hero text */}
          <h1 className="lp-hero-title">Explore.</h1>

          {/* CTA glass button */}
          <Link href="/map" className="lp-hero-cta">
            Open Map&ensp;&rarr;
          </Link>
        </div>
      </section>

      {/* ───── STATEMENT ───── */}
      <section className="lp-statement">
        <p className="lp-stmt-line">
          Campuses are living places.
        </p>
        <p className="lp-stmt-line lp-stmt-large">
          But flat maps can&apos;t capture<br />
          the way it feels to walk through one —<br />
          so we built it in <em>three dimensions.</em>
        </p>
      </section>

      {/* ───── DETAILS ───── */}
      <section className="lp-details">
        <div className="lp-detail">
          <span className="lp-detail-num">I</span>
          <h3>The Map</h3>
          <p>
            Every building on Queen&apos;s University pulled from OpenStreetMap,
            extruded into real geometry, satellite-textured roads, and 30 AI cars
            navigating traffic lights in real time.
          </p>
          <Link href="/map" className="lp-detail-link">Enter the campus &rarr;</Link>
        </div>

        <div className="lp-detail">
          <span className="lp-detail-num">II</span>
          <h3>The Editor</h3>
          <p>
            Design buildings from scratch — adjust floors, roofs, windows,
            textures, trace blueprints — then export as GLB models you can
            drop into any 3D project.
          </p>
          <Link href="/editor" className="lp-detail-link">Open the editor &rarr;</Link>
        </div>

        <div className="lp-detail">
          <span className="lp-detail-num">III</span>
          <h3>The Simulation</h3>
          <p>
            Pathfinding, collision avoidance, traffic signal state machines —
            a miniature living city running on Three.js and Turf.js spatial analysis.
          </p>
        </div>
      </section>

      {/* ───── CLOSING ───── */}
      <section className="lp-closing">
        <p className="lp-closing-text">
          Built at QHacks 2025.
        </p>
        <div className="lp-closing-ctas">
          <Link href="/map" className="lp-btn-warm">Explore the Campus</Link>
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
