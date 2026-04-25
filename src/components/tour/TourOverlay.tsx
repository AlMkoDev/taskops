'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTour } from './TourProvider';
import { TooltipPosition, TourStep } from './tour-types';
import { globalTour, tasksTour, projectsTour, teamTour, reportsTour, analyticsTour, settingsTour } from './tours';
import { useDialogAccessibility } from './use-dialog-accessibility';

const tourDefinitions: Record<string, { steps: TourStep[] }> = {
  global: globalTour,
  tasks: tasksTour,
  projects: projectsTour,
  team: teamTour,
  reports: reportsTour,
  analytics: analyticsTour,
  settings: settingsTour
};

const SPOTLIGHT_PADDING = 12;
const TOOLTIP_GAP = 18;
const MODAL_MAX_WIDTH = 400;
const VIEWPORT_PADDING = 16;

function showCenteredModal(
  setSpotlightStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>,
  setModalStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>,
  setArrowPosition: React.Dispatch<React.SetStateAction<TooltipPosition | 'hidden'>>
) {
  setSpotlightStyle({
    width: 0,
    height: 0,
    top: '50%',
    left: '50%',
    boxShadow: '0 0 0 9999px rgba(15, 30, 20, 0.78)'
  });
  setModalStyle({
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'block'
  });
  setArrowPosition('hidden');
}

function getPositionOrder(position: TooltipPosition): TooltipPosition[] {
  switch (position) {
    case 'top':
      return ['top', 'right', 'left', 'bottom'];
    case 'bottom':
      return ['bottom', 'right', 'left', 'top'];
    case 'left':
      return ['left', 'bottom', 'top', 'right'];
    case 'right':
      return ['right', 'bottom', 'top', 'left'];
    default:
      return ['bottom', 'right', 'left', 'top'];
  }
}

function getCandidatePosition(
  preferred: TooltipPosition,
  rect: DOMRect,
  modalWidth: number,
  modalHeight: number
) {
  const centeredTop = rect.top + rect.height / 2 - modalHeight / 2;
  const centeredLeft = rect.left + rect.width / 2 - modalWidth / 2;

  switch (preferred) {
    case 'top':
      return {
        top: rect.top - modalHeight - TOOLTIP_GAP,
        left: centeredLeft,
        arrow: 'bottom' as TooltipPosition
      };
    case 'bottom':
      return {
        top: rect.bottom + TOOLTIP_GAP,
        left: centeredLeft,
        arrow: 'top' as TooltipPosition
      };
    case 'left':
      return {
        top: centeredTop,
        left: rect.left - modalWidth - TOOLTIP_GAP,
        arrow: 'right' as TooltipPosition
      };
    case 'right':
      return {
        top: centeredTop,
        left: rect.right + TOOLTIP_GAP,
        arrow: 'left' as TooltipPosition
      };
    default:
      return {
        top: rect.bottom + TOOLTIP_GAP,
        left: centeredLeft,
        arrow: 'top' as TooltipPosition
      };
  }
}

function clampPosition(
  top: number,
  left: number,
  modalWidth: number,
  modalHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  return {
    top: Math.max(VIEWPORT_PADDING, Math.min(top, viewportHeight - modalHeight - VIEWPORT_PADDING)),
    left: Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - modalWidth - VIEWPORT_PADDING))
  };
}

function scorePosition(
  top: number,
  left: number,
  rect: DOMRect,
  modalWidth: number,
  modalHeight: number,
  viewportWidth: number,
  viewportHeight: number
) {
  const overflowLeft = Math.max(0, VIEWPORT_PADDING - left);
  const overflowRight = Math.max(0, left + modalWidth - (viewportWidth - VIEWPORT_PADDING));
  const overflowTop = Math.max(0, VIEWPORT_PADDING - top);
  const overflowBottom = Math.max(0, top + modalHeight - (viewportHeight - VIEWPORT_PADDING));
  const overflowPenalty = overflowLeft + overflowRight + overflowTop + overflowBottom;

  const overlapX = Math.max(0, Math.min(left + modalWidth, rect.right + SPOTLIGHT_PADDING) - Math.max(left, rect.left - SPOTLIGHT_PADDING));
  const overlapY = Math.max(0, Math.min(top + modalHeight, rect.bottom + SPOTLIGHT_PADDING) - Math.max(top, rect.top - SPOTLIGHT_PADDING));
  const overlapArea = overlapX * overlapY;

  return overflowPenalty * 100000 + overlapArea;
}

function positionModalForTarget(
  rect: DOMRect,
  preferredPosition: TooltipPosition,
  modalHeight: number,
  setSpotlightStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>,
  setModalStyle: React.Dispatch<React.SetStateAction<React.CSSProperties>>,
  setArrowPosition: React.Dispatch<React.SetStateAction<TooltipPosition | 'hidden'>>
) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const modalWidth = Math.min(MODAL_MAX_WIDTH, viewportWidth - VIEWPORT_PADDING * 2);

  setSpotlightStyle({
    width: rect.width + SPOTLIGHT_PADDING * 2,
    height: rect.height + SPOTLIGHT_PADDING * 2,
    top: rect.top - SPOTLIGHT_PADDING,
    left: rect.left - SPOTLIGHT_PADDING,
    boxShadow: '0 0 0 9999px rgba(15, 30, 20, 0.78)',
    display: 'block'
  });

  const candidates = getPositionOrder(preferredPosition).map((position) =>
    getCandidatePosition(position, rect, modalWidth, modalHeight)
  );

  let bestCandidate = candidates[0];
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const score = scorePosition(
      candidate.top,
      candidate.left,
      rect,
      modalWidth,
      modalHeight,
      viewportWidth,
      viewportHeight
    );

    if (score < bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  const clamped = clampPosition(
    bestCandidate.top,
    bestCandidate.left,
    modalWidth,
    modalHeight,
    viewportWidth,
    viewportHeight
  );

  setModalStyle({
    top: clamped.top,
    left: clamped.left,
    transform: 'none',
    display: 'block'
  });
  setArrowPosition(bestCandidate.arrow);
}

export function TourOverlay() {
  const { activeTour, currentStep, nextStep, prevStep, exitTour, completeTour, prepareStep } = useTour();
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const [modalStyle, setModalStyle] = useState<React.CSSProperties>({});
  const [arrowPosition, setArrowPosition] = useState<TooltipPosition | 'hidden'>('hidden');
  const modalRef = useRef<HTMLDivElement>(null);

  const buildDisplayStep = (step: TourStep, useMissingTargetFallback: boolean): TourStep => {
    if (!useMissingTargetFallback || !step.missingTargetFallback) {
      return step;
    }

    return {
      ...step,
      target: step.missingTargetFallback.target ?? null,
      position: step.missingTargetFallback.position ?? 'center',
      title: step.missingTargetFallback.title ?? step.title,
      description: step.missingTargetFallback.description,
      context: step.missingTargetFallback.context ?? step.context,
      whyItMatters: step.missingTargetFallback.whyItMatters ?? step.whyItMatters,
      interactive: undefined
    };
  };

  // ─── Update spotlight and modal position ─────────────────────────────────
  useEffect(() => {
    if (!activeTour) {
      setSpotlightStyle({ display: 'none' });
      setModalStyle({ display: 'none' });
      return;
    }

    const tour = tourDefinitions[activeTour];
    if (!tour || !tour.steps[currentStep]) return;

    const step = tour.steps[currentStep];
    let frameOne = 0;
    let frameTwo = 0;
    let timeoutId: number | null = null;

    const positionCurrentStep = () => {
      const displayStep = step.target && !document.querySelector(step.target)
        ? buildDisplayStep(step, true)
        : step;

      if (!displayStep.target || displayStep.position === 'center') {
        showCenteredModal(setSpotlightStyle, setModalStyle, setArrowPosition);
        return;
      }

      const target = document.querySelector(displayStep.target) as HTMLElement | null;
      if (!target) {
        showCenteredModal(setSpotlightStyle, setModalStyle, setArrowPosition);
        return;
      }

      target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });

      const modalHeight = Math.max(modalRef.current?.offsetHeight ?? 0, 280);
      const rect = target.getBoundingClientRect();
      positionModalForTarget(
        rect,
        displayStep.position,
        modalHeight,
        setSpotlightStyle,
        setModalStyle,
        setArrowPosition
      );
    };

    prepareStep(activeTour, step);

    frameOne = window.requestAnimationFrame(() => {
      if (step.beforeShow) {
        step.beforeShow();
      }

      frameTwo = window.requestAnimationFrame(() => {
        positionCurrentStep();
        timeoutId = window.setTimeout(positionCurrentStep, 80);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [activeTour, currentStep, prepareStep]);

  useDialogAccessibility({
    active: Boolean(activeTour),
    containerRef: modalRef,
    onEscape: exitTour
  });

  if (!activeTour) return null;

  const tour = tourDefinitions[activeTour];
  const rawStep = tour.steps[currentStep];
  const hasTarget = rawStep.target ? Boolean(document.querySelector(rawStep.target)) : false;
  const step = buildDisplayStep(rawStep, Boolean(rawStep.target) && !hasTarget);
  const isLastStep = currentStep === tour.steps.length - 1;

  return (
    <>
      {/* Spotlight */}
      <div
        className="tour-spotlight"
        aria-hidden="true"
        style={{
          position: 'fixed',
          borderRadius: 12,
          transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'auto',
          zIndex: 9998,
          ...spotlightStyle
        }}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="tour-modal visible"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`tour-step-title-${step.id}`}
        aria-describedby={`tour-step-description-${step.id}`}
        tabIndex={-1}
        style={{
          position: 'fixed',
          background: 'var(--white, #ffffff)',
          borderRadius: 16,
          padding: '26px 28px 22px',
          boxShadow: '0 12px 48px rgba(26, 58, 42, 0.18)',
          maxWidth: MODAL_MAX_WIDTH,
          width: '92%',
          zIndex: 9999,
          pointerEvents: 'auto',
          border: '1.5px solid var(--border, #dde8e2)',
          ...modalStyle
        }}
      >
        {/* Arrow */}
        <TooltipArrow position={arrowPosition} />

        {/* Progress Dots */}
        <ProgressDots total={tour.steps.length} active={currentStep} />

        {/* Step Label */}
        <div
          aria-live="polite"
          style={{
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--green-mid, #27ae60)',
            marginBottom: 8
          }}
        >
          Step {currentStep + 1} of {tour.steps.length}
        </div>

        {/* Title */}
        <h2
          id={`tour-step-title-${step.id}`}
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 20,
            fontWeight: 700,
            marginBottom: 10,
            color: 'var(--ink, #1c2b20)',
            lineHeight: 1.3,
            margin: '0 0 10px 0'
          }}
        >
          {step.title}
        </h2>

        {/* Description */}
        <p
          id={`tour-step-description-${step.id}`}
          style={{
            color: 'var(--ink-mid, #4a5c52)',
            lineHeight: 1.65,
            marginBottom: 8,
            fontSize: 14,
            margin: '0 0 8px 0'
          }}
        >
          {step.description}
        </p>

        {/* Context Box */}
        {step.context && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--green-mid, #27ae60)',
              background: 'var(--green-xlight, #f0faf4)',
              borderLeft: '3px solid var(--green-mid, #27ae60)',
              padding: '8px 12px',
              borderRadius: '0 6px 6px 0',
              marginBottom: step.whyItMatters ? 8 : 20,
              fontStyle: 'italic',
              lineHeight: 1.5
            }}
          >
            {step.context}
          </div>
        )}

        {/* Why It Matters */}
        {step.whyItMatters && (
          <div
            style={{
              fontSize: 12,
              color: 'var(--amber, #e67e22)',
              background: 'var(--amber-light, #fef3e2)',
              padding: '6px 10px',
              borderRadius: 6,
              marginBottom: 20,
              fontWeight: 600
            }}
          >
            💡 Why this matters: {step.whyItMatters}
          </div>
        )}

        {/* Interactive Hint */}
        {step.interactive && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--blue, #2980b9)',
              background: 'var(--blue-light, #dbeafe)',
              padding: '8px 12px',
              borderRadius: 6,
              marginBottom: 20,
              fontWeight: 500
            }}
          >
            {step.interactive.hint}
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            aria-label="Go to previous tour step"
            style={{
              padding: '9px 18px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              border: '1.5px solid var(--border, #dde8e2)',
              background: 'var(--surface, #f8faf9)',
              color: currentStep === 0 ? 'var(--ink-light, #8a9e92)' : 'var(--ink-mid, #4a5c52)',
              opacity: currentStep === 0 ? 0.5 : 1,
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            ← Back
          </button>
          <button
            onClick={isLastStep ? completeTour : nextStep}
            aria-label={isLastStep ? 'Finish tour' : 'Go to next tour step'}
            style={{
              flex: 1,
              padding: '9px 18px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              border: 'none',
              background: 'var(--green-mid, #27ae60)',
              color: 'white',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            {isLastStep ? 'Finish Tour ✓' : 'Next →'}
          </button>
          <button
            onClick={exitTour}
            aria-label="Exit tour"
            style={{
              background: 'none',
              color: 'var(--ink-light, #8a9e92)',
              fontSize: 13,
              padding: '9px 10px',
              cursor: 'pointer',
              border: 'none',
              fontFamily: "'DM Sans', sans-serif"
            }}
          >
            Exit Tour
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Tooltip Arrow Component ─────────────────────────────────────────────────

function TooltipArrow({ position }: { position: TooltipPosition | 'hidden' }) {
  if (position === 'hidden') return null;

  const arrowStyle: React.CSSProperties = {
    position: 'absolute',
    width: 12,
    height: 12,
    background: 'var(--white, #ffffff)',
    transform: 'rotate(45deg)'
  };

  const positionStyles: Record<string, React.CSSProperties> = {
    top: { top: -7, left: 32, boxShadow: '-2px -2px 4px rgba(0,0,0,0.06)' },
    bottom: { bottom: -7, left: 32, boxShadow: '2px 2px 4px rgba(0,0,0,0.06)' },
    left: { left: -7, top: 28, boxShadow: '-2px 2px 4px rgba(0,0,0,0.06)' },
    right: { right: -7, top: 28, boxShadow: '2px -2px 4px rgba(0,0,0,0.06)' }
  };

  return (
    <div
      className="tooltip-arrow"
      style={{
        ...arrowStyle,
        ...positionStyles[position]
      }}
    />
  );
}

// ─── Progress Dots Component ─────────────────────────────────────────────────

function ProgressDots({ total, active }: { total: number; active: number }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        justifyContent: 'center',
        marginBottom: 16
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        let backgroundColor = 'var(--border, #dde8e2)';
        let width = 7;
        let borderRadius = '50%';

        if (i < active) {
          backgroundColor = 'var(--green-light, #d4edda)';
        } else if (i === active) {
          backgroundColor = 'var(--green-mid, #27ae60)';
          width = 20;
          borderRadius = '4px';
        }

        return (
          <div
            key={i}
            className="tour-dot"
            style={{
              width,
              height: 7,
              borderRadius,
              background: backgroundColor,
              transition: 'all 0.25s'
            }}
          />
        );
      })}
    </div>
  );
}
