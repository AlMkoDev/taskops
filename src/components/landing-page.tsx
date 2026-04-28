'use client';

import { useState } from 'react';
import { LoginForm } from './login-form';
import { TasksWorkspaceClient } from '@/components/tasks/tasks-workspace-client';

type LandingPageProps = {
  onLoginSuccess?: () => void;
};

export function LandingPage({ onLoginSuccess }: LandingPageProps) {
  const [showLogin, setShowLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    onLoginSuccess?.();
  };

  if (isAuthenticated) {
    return <TasksWorkspaceClient />;
  }

  if (showLogin) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} onBack={() => setShowLogin(false)} />;
  }

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="landing-nav-content">
          <div className="landing-brand">
            <div className="landing-brand-dot" />
            <span className="landing-brand-name">TaskOps</span>
          </div>
          <div className="landing-nav-links">
            <a href="#features" className="landing-nav-link">Features</a>
            <a href="#about" className="landing-nav-link">About</a>
            <button className="landing-btn landing-btn-primary" onClick={() => setShowLogin(true)}>
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <div className="landing-hero-badge">
            <span className="landing-badge-dot" />
            <span>Operations Management Platform</span>
          </div>
          
          <h1 className="landing-hero-title">
            Streamline Your
            <span className="landing-hero-gradient"> Agricultural Operations</span>
          </h1>
          
          <p className="landing-hero-subtitle">
            TaskOps is a comprehensive operations workspace designed for modern agricultural teams. 
            Manage tasks, track reports, analyze costs, and collaborate seamlessly—all in one platform.
          </p>

          <div className="landing-hero-actions">
            <button className="landing-btn landing-btn-large landing-btn-primary" onClick={() => setShowLogin(true)}>
              Get Started
            </button>
            <a href="#features" className="landing-btn landing-btn-large landing-btn-secondary">
              Learn More
            </a>
          </div>

          <div className="landing-hero-stats">
            <div className="landing-stat">
              <div className="landing-stat-value">500+</div>
              <div className="landing-stat-label">Active Users</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">10K+</div>
              <div className="landing-stat-label">Tasks Completed</div>
            </div>
            <div className="landing-stat-divider" />
            <div className="landing-stat">
              <div className="landing-stat-value">99.9%</div>
              <div className="landing-stat-label">Uptime</div>
            </div>
          </div>
        </div>

        <div className="landing-hero-visual">
          <div className="landing-visual-card">
            <div className="landing-visual-header">
              <div className="landing-visual-dot" />
              <span>Dashboard Preview</span>
            </div>
            <div className="landing-visual-content">
              <div className="landing-visual-metric">
                <div className="landing-metric-icon">📊</div>
                <div className="landing-metric-info">
                  <div className="landing-metric-label">Total Reports</div>
                  <div className="landing-metric-value">1,247</div>
                </div>
              </div>
              <div className="landing-visual-metric">
                <div className="landing-metric-icon">✅</div>
                <div className="landing-metric-info">
                  <div className="landing-metric-label">Completed Tasks</div>
                  <div className="landing-metric-value">8,432</div>
                </div>
              </div>
              <div className="landing-visual-metric">
                <div className="landing-metric-icon">👥</div>
                <div className="landing-metric-info">
                  <div className="landing-metric-label">Team Members</div>
                  <div className="landing-metric-value">156</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="landing-features">
        <div className="landing-section-header">
          <h2 className="landing-section-title">Powerful Features</h2>
          <p className="landing-section-subtitle">
            Everything you need to manage agricultural operations efficiently
          </p>
        </div>

        <div className="landing-features-grid">
          <div className="landing-feature-card">
            <div className="landing-feature-icon">📋</div>
            <h3 className="landing-feature-title">Task Management</h3>
            <p className="landing-feature-desc">
              Create, assign, and track tasks across your entire team with real-time updates and notifications.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">📈</div>
            <h3 className="landing-feature-title">Analytics & Reports</h3>
            <p className="landing-feature-desc">
              Generate comprehensive reports with labor cost analytics, production metrics, and performance insights.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">👥</div>
            <h3 className="landing-feature-title">Team Collaboration</h3>
            <p className="landing-feature-desc">
              Seamless communication tools with WhatsApp integration and activity tracking for your team.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">🔒</div>
            <h3 className="landing-feature-title">Secure & Reliable</h3>
            <p className="landing-feature-desc">
              Enterprise-grade security with role-based access control and comprehensive audit logging.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">🌾</div>
            <h3 className="landing-feature-title">Agricultural Focus</h3>
            <p className="landing-feature-desc">
              Purpose-built for agricultural operations with farm-specific workflows and compliance tracking.
            </p>
          </div>

          <div className="landing-feature-card">
            <div className="landing-feature-icon">⚡</div>
            <h3 className="landing-feature-title">Real-time Updates</h3>
            <p className="landing-feature-desc">
              Live data synchronization ensures everyone has access to the latest information instantly.
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="landing-about">
        <div className="landing-about-content">
          <h2 className="landing-section-title">Built for Modern Agriculture</h2>
          <p className="landing-about-text">
            TaskOps bridges the gap between traditional farming operations and modern technology. 
            Our platform is designed by agricultural professionals, for agricultural professionals. 
            From field operations to executive reporting, we provide the tools you need to succeed 
            in today's competitive agricultural landscape.
          </p>
          
          <div className="landing-about-features">
            <div className="landing-about-feature">
              <div className="landing-about-check">✓</div>
              <span>Role-based access for all team members</span>
            </div>
            <div className="landing-about-feature">
              <div className="landing-about-check">✓</div>
              <span>Comprehensive audit trails and compliance</span>
            </div>
            <div className="landing-about-feature">
              <div className="landing-about-check">✓</div>
              <span>Mobile-friendly for field operations</span>
            </div>
            <div className="landing-about-feature">
              <div className="landing-about-check">✓</div>
              <span>Integration with existing farm systems</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="landing-cta">
        <div className="landing-cta-content">
          <h2 className="landing-cta-title">Ready to Transform Your Operations?</h2>
          <p className="landing-cta-subtitle">
            Join hundreds of agricultural teams already using TaskOps
          </p>
          <button className="landing-btn landing-btn-large landing-btn-primary" onClick={() => setShowLogin(true)}>
            Sign In Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-content">
          <div className="landing-footer-brand">
            <div className="landing-brand-dot" />
            <span className="landing-brand-name">TaskOps</span>
          </div>
          <p className="landing-footer-text">
            © {new Date().getFullYear()} TaskOps. Built for agricultural excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
