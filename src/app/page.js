import Image from "next/image";

export default function Home() {
  return (
    <div className="container">
      <header style={{ padding: '2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '1.5rem', fontFamily: 'var(--font-outfit)' }}>
          First 90 Days
        </div>
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <a href="#login" className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Get Started</a>
        </nav>
      </header>

      <main style={{ padding: '6rem 0' }}>
        <section style={{ textAlign: 'center', marginBottom: '8rem' }} className="fade-in-up">
          <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', marginBottom: '1.5rem', lineHeight: 1.1 }}>
            Master Your <br />
            <span className="gradient-text">New Role</span>
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
            A strategic framework to help you navigate, learn, and succeed in your first 90 days.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <a href="#" className="btn btn-primary">Start Planning</a>
            <a href="#" className="btn glass">View Demo</a>
          </div>
        </section>

        <div id="features" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {[
            { title: "Learn Faster", desc: "Accelerate your learning curve with structured goals and milestones tailored to your role." },
            { title: "Build Relationships", desc: "Identify key stakeholders, map your network, and schedule strategic conversations." },
            { title: "Secure Wins", desc: "Track early wins to build momentum and credibility within your first few weeks." }
          ].map((feature, i) => (
            <div key={i} className="glass" style={{ padding: '2.5rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.5rem' }}>{feature.title}</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <p>&copy; 2025 First 90 Days. All rights reserved.</p>
      </footer>
    </div>
  );
}
