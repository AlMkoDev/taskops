'use client';

import React, { useRef } from 'react';
import { useTour } from './TourProvider';
import { MODULE_METADATA, TourModule } from './tour-types';
import { useDialogAccessibility } from './use-dialog-accessibility';

export function TourWelcomeScreen() {
  const { startTour, progress, showWelcome, dismissWelcome } = useTour();
  const modalRef = useRef<HTMLDivElement>(null);

  const modules: TourModule[] = ['tasks', 'projects', 'team', 'reports', 'analytics', 'settings'];

  const handleStartGlobalTour = () => {
    startTour('global');
  };

  const handleStartModuleTour = (moduleId: TourModule) => {
    startTour(moduleId);
  };

  const handleSkipWelcome = () => {
    dismissWelcome?.();
  };

  useDialogAccessibility({
    active: Boolean(showWelcome),
    containerRef: modalRef,
    onEscape: handleSkipWelcome
  });

  if (!showWelcome) return null;

  return (
    <div
      aria-hidden={false}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 30, 20, 0.72)',
        backdropFilter: 'blur(6px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }}
    >
      <div
        ref={modalRef}
        className="tour-welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-welcome-title"
        aria-describedby="tour-welcome-description"
        tabIndex={-1}
        style={{
          background: 'var(--white, #ffffff)',
          borderRadius: 20,
          padding: '32px 32px 28px',
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 12px 48px rgba(26, 58, 42, 0.18)'
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚀</div>
          <h2
            id="tour-welcome-title"
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--ink, #1c2b20)',
              marginBottom: 8,
              margin: '0 0 8px 0'
            }}
          >
            Welcome to TaskOps
          </h2>
          <p
            id="tour-welcome-description"
            style={{
              color: 'var(--ink-mid, #4a5c52)',
              fontSize: 15,
              lineHeight: 1.6,
              margin: 0
            }}
          >
            Start with a short overview, then go deeper module by module as you need. The goal is to help you get useful quickly, not make you sit through one long walkthrough.
          </p>
        </div>

        <div
          style={{
            textAlign: 'center',
            padding: '10px 14px',
            background: 'var(--surface, #f8faf9)',
            borderRadius: 10,
            marginBottom: 18,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--ink-mid, #4a5c52)'
          }}
        >
          Click any module to jump straight into that tour, or start with the overview first.
        </div>

        {/* Module Grid */}
        <div
          className="tour-welcome-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 24
          }}
        >
          {modules.map((moduleId) => {
            const meta = MODULE_METADATA[moduleId];
            const isCompleted = progress[moduleId]?.completed;
            const actionLabel = isCompleted ? 'Replay tour' : 'Start tour';

            return (
              <button
                key={moduleId}
                type="button"
                className="module-card"
                onClick={() => handleStartModuleTour(moduleId)}
                aria-label={`${actionLabel} for ${meta.label}`}
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: isCompleted
                    ? '2px solid var(--green-mid, #27ae60)'
                    : '1.5px solid var(--border, #dde8e2)',
                  background: isCompleted ? 'var(--green-xlight, #f0faf4)' : 'var(--surface, #f8faf9)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 1,
                  textAlign: 'left'
                }}
              >
                <div className="module-icon" style={{ fontSize: 24, marginBottom: 6 }}>{meta.icon}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: 'var(--ink, #1c2b20)',
                    marginBottom: 4
                  }}
                >
                  {meta.label}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--ink-light, #8a9e92)',
                    lineHeight: 1.4
                  }}
                >
                  {meta.description}
                </div>
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 11,
                    fontWeight: 700,
                    color: isCompleted ? 'var(--green-mid, #27ae60)' : 'var(--green-deep, #1a3a2a)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}
                >
                  {isCompleted ? '✓ Complete • Replay tour' : 'Start module tour'}
                </div>
                {isCompleted && (
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 11,
                      color: 'var(--ink-light, #8a9e92)',
                      lineHeight: 1.4
                    }}
                  >
                    Completed tours can be replayed at any time.
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Tour Path */}
        <div
          className="tour-path"
          style={{
            textAlign: 'center',
            padding: '12px 16px',
            background: 'var(--green-xlight, #f0faf4)',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--green-deep, #1a3a2a)'
          }}
        >
          Recommended path after the overview: Tasks → Projects → Team → Reports → Analytics → Settings
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={handleStartGlobalTour}
            style={{
              width: '100%',
              padding: '14px 24px',
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 16,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--green-mid, #27ae60)',
              color: 'white',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            Start Overview Tour
          </button>
          <button
            onClick={handleSkipWelcome}
            style={{
              width: '100%',
              padding: '12px 24px',
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              border: '1.5px solid var(--border, #dde8e2)',
              background: 'white',
              color: 'var(--ink-mid, #4a5c52)',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            Skip For Now
          </button>
        </div>
      </div>
    </div>
  );
}
