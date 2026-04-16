import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import Registry from './pages/Registry';
import AgentDetail from './pages/AgentDetail';
import Register from './pages/Register';
import Discover from './pages/Discover';
import Demo from './pages/Demo';

function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (path) => location.pathname === path;

  const handleNavClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group" onClick={handleNavClick}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center shadow-lg group-hover:shadow-[var(--shadow-glow-cyan)] transition-shadow duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-xl font-bold gradient-text">AgentID</span>
          </Link>

          {/* Nav Links */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/" active={isActive('/')}>Registry</NavLink>
            <NavLink to="/discover" active={isActive('/discover')}>Discover</NavLink>
            <NavLink to="/register" active={isActive('/register')}>Register</NavLink>
            <DemoNavLink to="/demo" active={isActive('/demo')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Try Demo
            </DemoNavLink>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              aria-label="Toggle mobile menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--border-subtle)] animate-fade-in">
            <div className="flex flex-col space-y-2">
              <MobileNavLink to="/" active={isActive('/')} onClick={handleNavClick}>Registry</MobileNavLink>
              <MobileNavLink to="/discover" active={isActive('/discover')} onClick={handleNavClick}>Discover</MobileNavLink>
              <MobileNavLink to="/register" active={isActive('/register')} onClick={handleNavClick}>Register</MobileNavLink>
              <MobileDemoNavLink to="/demo" active={isActive('/demo')} onClick={handleNavClick}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Try Demo
              </MobileDemoNavLink>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
      }`}
    >
      {children}
    </Link>
  );
}

function DemoNavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-white bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]'
          : 'text-white bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] hover:shadow-lg hover:shadow-[var(--accent-cyan)]/25'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({ to, active, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
      }`}
    >
      {children}
    </Link>
  );
}

function MobileDemoNavLink({ to, active, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-white bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]'
          : 'text-white bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]'
      }`}
    >
      {children}
    </Link>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              AgentID — Trust Verification Layer for AI Agents
            </span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-[var(--text-muted)]">
            <a href="#" className="hover:text-[var(--accent-cyan)] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[var(--accent-cyan)] transition-colors">API</a>
            <a href="#" className="hover:text-[var(--accent-cyan)] transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Registry />} />
            <Route path="/agents/:pubkey" element={<AgentDetail />} />
            <Route path="/register" element={<Register />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/demo" element={<Demo />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
