'use client';

import React, { useRef } from 'react';
import { useTour } from './TourProvider';
import { MODULE_METADATA, TourModule, TourProgress } from './tour-types';
import { useDialogAccessibility } from './use-dialog-accessibility';

interface TourCompletionModalProps {
  onComplete?: () => void;
}

export function TourCompletionModal({ onComplete }: TourCompletionModalProps) {
  const { completedTour, progress, startTour, exitTour, showCompletion, dismissCompletion } = useTour();
  const modalRef = useRef<HTMLDivElement>(null);

  const handleClose = () => {
    dismissCompletion?.();
    exitTour();
    onComplete?.();
  };

  const handleReplay = () => {
    if (!completedTour) return;
    dismissCompletion?.();
    startTour(completedTour);
  };

  const nextModule = getNextModule(completedTour);

  useDialogAccessibility({
    active: Boolean(showCompletion),
    containerRef: modalRef,
    onEscape: handleClose
  });

  if (!showCompletion || !completedTour) return null;

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-completion-title"
        aria-describedby="tour-completion-description"
        tabIndex={-1}
        style={{
          background: 'var(--white, #ffffff)',
          borderRadius: 20,
          padding: '44px 40px',
          textAlign: 'center',
          maxWidth: 460,
          width: '92%',
          boxShadow: '0 12px 48px rgba(26, 58, 42, 0.18)'
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>

        {/* Title */}
        <h2
          id="tour-completion-title"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 26,
            fontWeight: 700,
            color: 'var(--ink, #1c2b20)',
            marginBottom: 10,
            margin: '0 0 10px 0'
          }}
        >
          {getCompletionTitle(completedTour)}
        </h2>

        {/* Description */}
        <p
          id="tour-completion-description"
          style={{
            color: 'var(--ink-mid, #4a5c52)',
            marginBottom: 28,
            fontSize: 15,
            lineHeight: 1.6,
            margin: '0 0 28px 0'
          }}
        >
          {getCompletionDescription(completedTour)}
        </p>

        {/* Mini-Completion Indicators */}
        <ModuleProgressGrid progress={progress} />

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 28 }}>
          {nextModule && (
            <button
              onClick={() => {
                dismissCompletion?.();
                startTour(nextModule);
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 9,
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                border: 'none',
                background: 'var(--green-mid, #27ae60)',
                color: 'white',
                fontFamily: "'DM Sans', sans-serif"
              }}
            >
              Continue to {MODULE_METADATA[nextModule].label} Tour →
            </button>
          )}
          <button
            onClick={handleClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              border: '1.5px solid var(--border, #dde8e2)',
              background: 'white',
              color: 'var(--ink-mid, #4a5c52)',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            {completedTour === 'settings' ? 'Start Using TaskOps' : 'Back To Workspace'}
          </button>
          <button
            onClick={handleReplay}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 9,
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
              border: '1.5px solid var(--border, #dde8e2)',
              background: 'white',
              color: 'var(--ink-mid, #4a5c52)',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            ↺ Replay This Tour
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Module Progress Grid ────────────────────────────────────────────────────

function ModuleProgressGrid({ progress }: { progress: Record<TourModule, TourProgress | null> }) {
  const modules: TourModule[] = ['tasks', 'projects', 'team', 'reports', 'analytics', 'settings'];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 12,
        padding: 20,
        background: 'var(--surface, #f8faf9)',
        borderRadius: 12,
        marginBottom: 8
      }}
    >
      {modules.map((moduleId) => {
        const meta = MODULE_METADATA[moduleId];
        const isCompleted = progress[moduleId]?.completed;

        return (
          <div
            key={moduleId}
            style={{
              padding: 12,
              borderRadius: 8,
              background: isCompleted ? 'var(--green-light, #d4edda)' : 'white',
              border: isCompleted ? '1.5px solid var(--green-mid, #27ae60)' : '1px solid var(--border, #dde8e2)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 4 }}>{meta.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: isCompleted ? 'var(--green-mid, #27ae60)' : 'var(--ink-light, #8a9e92)' }}>
              {isCompleted ? '✓' : '○'} {meta.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helper Functions ────────────────────────────────────────────────────────

function getCompletionTitle(module: TourModule | null): string {
  const titles: Record<string, string> = {
    global: 'Workspace overview complete',
    tasks: 'Tasks tour complete',
    projects: 'Projects tour complete',
    team: 'Team tour complete',
    reports: 'Reports tour complete',
    analytics: 'Analytics tour complete',
    settings: 'All tours complete'
  };
  return titles[module || 'global'] || "You're all set!";
}

function getCompletionDescription(module: TourModule | null): string {
  const descriptions: Record<string, string> = {
    global: 'You have the layout. Continue into the module tours for task execution, planning, reporting, and analytics when you are ready.',
    tasks: 'You have seen the basic execution loop in Tasks. Continue into Projects to see how individual work rolls up into delivery structure.',
    projects: 'You have seen how projects organize work into phases, planning views, and execution context. Team is the next step if you want to review capacity and ownership.',
    team: 'You have seen how staffing, workload, and role structure connect back to execution. Reports and Analytics build on that same operational data.',
    reports: 'You have seen the reporting workflow from authoring to review and audit activity. Analytics is the next place to inspect the signals behind the documents.',
    analytics: 'You have seen both operational and labor views. Settings is where reusable structure and workflow rules are defined.',
    settings: 'The core tour set is now complete. From here, the best next step is to open the module that matches the work you actually need to do and start using it for real.'
  };
  return descriptions[module || 'global'] || 'Great job completing the tour!';
}

function getNextModule(current: TourModule | null): TourModule | null {
  const order: TourModule[] = ['global', 'tasks', 'projects', 'team', 'reports', 'analytics', 'settings'];
  const currentIndex = order.indexOf(current || 'global');
  if (currentIndex < order.length - 1) {
    return order[currentIndex + 1];
  }
  return null;
}
