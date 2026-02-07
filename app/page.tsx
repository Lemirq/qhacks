import Link from 'next/link';

export default function Landing() {
  return (
    <div className="landing-root">
      {/* ───── NAV ───── */}
      <nav className="landing-nav">
        <span className="nav-logo">QMap</span>
        <div className="nav-links">
          <Link href="/map">Explore</Link>
          <Link href="/editor">Editor</Link>
          <a href="https://github.com/Lemirq/qhacks" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <section className="hero">
        <div className="hero-grain" />
        <div className="hero-content">
          <p className="hero-tag">QHacks 2025</p>
          <h1 className="hero-title">
            Queen&apos;s Campus,<br />
            <span className="hero-title-accent">rebuilt in 3D.</span>
          </h1>
          <p className="hero-sub">
            An interactive 3D map of Queen&apos;s University with live traffic
            simulation, pathfinding, and a full building editor that lets you
            design structures from scratch and export them as 3D models.
          </p>
          <div className="hero-ctas">
            <Link href="/map" className="cta-primary">
              Open the Map
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </Link>
            <Link href="/editor" className="cta-secondary">
              Try the Editor
            </Link>
          </div>
        </div>

        {/* floating decorative grid */}
        <div className="hero-deco">
          <div className="deco-grid">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className="deco-cell"
                style={{
                  animationDelay: `${(i % 8) * 0.12 + Math.floor(i / 8) * 0.08}s`,
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ───── MARQUEE STRIP ───── */}
      <div className="marquee-strip">
        <div className="marquee-track">
          {[...Array(2)].map((_, rep) => (
            <span key={rep} className="marquee-content">
              Three.js &middot; React Three Fiber &middot; Next.js &middot;
              OpenStreetMap &middot; Turf.js &middot; GLTF Export &middot;
              Traffic Simulation &middot; Pathfinding &middot;&nbsp;
            </span>
          ))}
        </div>
      </div>

      {/* ───── FEATURES ───── */}
      <section className="features">
        <div className="features-header">
          <span className="section-number">01</span>
          <h2 className="section-title">What it does</h2>
        </div>

        <div className="features-grid">
          {/* card 1 — campus map */}
          <div className="feature-card feature-card-wide">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
            </div>
            <h3>3D Campus Map</h3>
            <p>
              Every building on Queen&apos;s campus pulled from OpenStreetMap,
              extruded into 3D geometry, and rendered in real-time with satellite
              textures and proper road networks.
            </p>
            <Link href="/map" className="card-link">
              Explore the map &rarr;
            </Link>
          </div>

          {/* card 2 — traffic */}
          <div className="feature-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="2"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
            </div>
            <h3>Traffic Sim</h3>
            <p>
              30 AI-driven cars navigate the road network with proper pathfinding,
              traffic lights cycling red&ndash;yellow&ndash;green, and collision
              avoidance.
            </p>
          </div>

          {/* card 3 — editor */}
          <div className="feature-card">
            <div className="card-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/></svg>
            </div>
            <h3>Building Editor</h3>
            <p>
              Design custom buildings with adjustable floors, roof types,
              window patterns, textures, and blueprint tracing. Export as
              GLB or JSON.
            </p>
            <Link href="/editor" className="card-link">
              Open the editor &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* ───── TECH STRIP ───── */}
      <section className="tech-section">
        <div className="features-header">
          <span className="section-number">02</span>
          <h2 className="section-title">Under the hood</h2>
        </div>

        <div className="tech-grid">
          {[
            { label: 'Framework', value: 'Next.js 16' },
            { label: 'Graphics', value: 'Three.js + R3F' },
            { label: 'Geo Data', value: 'OpenStreetMap' },
            { label: 'Spatial', value: 'Turf.js' },
            { label: 'Styling', value: 'Tailwind 4' },
            { label: 'Export', value: 'GLTF / GLB' },
          ].map((t) => (
            <div key={t.label} className="tech-item">
              <span className="tech-label">{t.label}</span>
              <span className="tech-value">{t.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ───── CTA BLOCK ───── */}
      <section className="bottom-cta">
        <h2>See it live.</h2>
        <p>Jump into the 3D campus or start designing buildings.</p>
        <div className="hero-ctas">
          <Link href="/map" className="cta-primary">
            Explore the Map
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </Link>
          <Link href="/editor" className="cta-secondary">
            Building Editor
          </Link>
        </div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="landing-footer">
        <span>Built at QHacks 2025</span>
        <span className="footer-sep">/</span>
        <a href="https://github.com/Lemirq/qhacks" target="_blank" rel="noopener noreferrer">
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
