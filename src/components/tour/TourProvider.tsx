'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getTourStorageKey, TourContextType, TourModule, TourProgress, TourState, TourStep, TourWorkspaceController } from './tour-types';
import { globalTour, tasksTour, projectsTour, teamTour, reportsTour, analyticsTour, settingsTour } from './tours';

const tourDefinitions: Record<TourModule, { steps: TourStep[] }> = {
  global: globalTour,
  tasks: tasksTour,
  projects: projectsTour,
  team: teamTour,
  reports: reportsTour,
  analytics: analyticsTour,
  settings: settingsTour
};

const TourContext = createContext<TourContextType | null>(null);
const WELCOME_DISMISSED_STORAGE_KEY = 'taskops:tour:welcome:dismissed';

export function TourProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TourState>({
    activeTour: null,
    completedTour: null,
    currentStep: 0,
    isPlaying: false,
    progress: {
      global: null,
      tasks: null,
      projects: null,
      team: null,
      reports: null,
      analytics: null,
      settings: null
    }
  });

  const [showWelcome, setShowWelcome] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const workspaceControllerRef = useRef<TourWorkspaceController | null>(null);

  // ─── Load progress from localStorage on mount ────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tours: TourModule[] = ['global', 'tasks', 'projects', 'team', 'reports', 'analytics', 'settings'];
    const progress: Record<TourModule, TourProgress | null> = {
      global: null,
      tasks: null,
      projects: null,
      team: null,
      reports: null,
      analytics: null,
      settings: null
    };

    tours.forEach((tourId) => {
      const key = getTourStorageKey(tourId);
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          progress[tourId] = JSON.parse(stored) as TourProgress;
        } catch {
          progress[tourId] = null;
        }
      }
    });

    setState((prev) => ({ ...prev, progress }));
    const welcomeDismissed = localStorage.getItem(WELCOME_DISMISSED_STORAGE_KEY) === 'true';
    if (!progress.global?.completed && !welcomeDismissed) {
      setShowWelcome(true);
    }
  }, []);

  // ─── Save progress to localStorage ───────────────────────────────────────
  const saveProgress = useCallback((tourId: TourModule, progress: TourProgress) => {
    if (typeof window === 'undefined') return;
    const key = getTourStorageKey(tourId);
    localStorage.setItem(key, JSON.stringify(progress));
    setState((prev) => ({
      ...prev,
      progress: { ...prev.progress, [tourId]: progress }
    }));
  }, []);

  // ─── Start Tour ──────────────────────────────────────────────────────────
  const startTour = useCallback((tourId: TourModule) => {
    const tour = tourDefinitions[tourId];
    if (!tour) {
      console.warn(`Tour "${tourId}" not yet implemented`);
      return;
    }

    const existingProgress = state.progress[tourId];
    const shouldResume = existingProgress && !existingProgress.completed && existingProgress.lastStep > 0;

    const startStep = shouldResume ? existingProgress.lastStep : 0;

    setState((prev) => ({
      ...prev,
      activeTour: tourId,
      completedTour: null,
      currentStep: startStep,
      isPlaying: true
    }));

    setShowWelcome(false);
    setShowCompletion(false);

    // Save start time
    const progress: TourProgress = {
      completed: false,
      lastStep: startStep,
      totalSteps: tour.steps.length,
      startedAt: existingProgress?.startedAt || new Date().toISOString()
    };
    saveProgress(tourId, progress);
  }, [state.progress, saveProgress]);

  // ─── Next Step ───────────────────────────────────────────────────────────
  const nextStep = useCallback(() => {
    if (!state.activeTour) return;

    const tour = tourDefinitions[state.activeTour];
    if (!tour) return;

    if (state.currentStep < tour.steps.length - 1) {
      const nextStepIndex = state.currentStep + 1;
      setState((prev) => ({ ...prev, currentStep: nextStepIndex }));

      // Save progress
      const progress: TourProgress = {
        completed: false,
        lastStep: nextStepIndex,
        totalSteps: tour.steps.length,
        startedAt: state.progress[state.activeTour]?.startedAt
      };
      saveProgress(state.activeTour, progress);
    } else {
      completeTour();
    }
  }, [state.activeTour, state.currentStep, state.progress, saveProgress]);

  // ─── Previous Step ───────────────────────────────────────────────────────
  const prevStep = useCallback(() => {
    if (state.currentStep > 0) {
      setState((prev) => ({ ...prev, currentStep: prev.currentStep - 1 }));
    }
  }, [state.currentStep]);

  // ─── Complete Tour ───────────────────────────────────────────────────────
  const completeTour = useCallback(() => {
    if (!state.activeTour) return;

    const tour = tourDefinitions[state.activeTour];
    if (!tour) return;

    const progress: TourProgress = {
      completed: true,
      completedAt: new Date().toISOString(),
      lastStep: tour.steps.length - 1,
      totalSteps: tour.steps.length,
      startedAt: state.progress[state.activeTour]?.startedAt
    };

    saveProgress(state.activeTour, progress);

    setState((prev) => ({
      ...prev,
      activeTour: null,
      completedTour: state.activeTour,
      currentStep: 0,
      isPlaying: false
    }));
    setShowCompletion(true);
  }, [state.activeTour, state.progress, saveProgress]);

  // ─── Exit Tour ───────────────────────────────────────────────────────────
  const exitTour = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeTour: null,
      currentStep: 0,
      isPlaying: false
    }));
  }, []);

  const registerWorkspaceController = useCallback((controller: TourWorkspaceController | null) => {
    workspaceControllerRef.current = controller;
  }, []);

  const prepareStep = useCallback((tourId: TourModule, step: TourStep) => {
    workspaceControllerRef.current?.prepareStep(tourId, step);
  }, []);

  const dismissCompletion = useCallback(() => {
    setShowCompletion(false);
  }, []);

  const openWelcome = useCallback(() => {
    setShowCompletion(false);
    setShowWelcome(true);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(WELCOME_DISMISSED_STORAGE_KEY);
    }
  }, []);

  const dismissWelcome = useCallback(() => {
    setShowWelcome(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WELCOME_DISMISSED_STORAGE_KEY, 'true');
    }
  }, []);

  // ─── Reset Progress ──────────────────────────────────────────────────────
  const resetProgress = useCallback((tourId: TourModule) => {
    if (typeof window === 'undefined') return;
    const key = getTourStorageKey(tourId);
    localStorage.removeItem(key);
    setState((prev) => ({
      ...prev,
      progress: { ...prev.progress, [tourId]: null }
    }));
  }, []);

  // ─── Context Value ───────────────────────────────────────────────────────
  const contextValue = useMemo<TourContextType>(() => ({
    ...state,
    showWelcome,
    showCompletion,
    startTour,
    prepareStep,
    nextStep,
    prevStep,
    exitTour,
    completeTour,
    resetProgress,
    registerWorkspaceController,
    dismissCompletion,
    openWelcome,
    dismissWelcome
  }), [state, showWelcome, showCompletion, startTour, prepareStep, nextStep, prevStep, exitTour, completeTour, resetProgress, registerWorkspaceController, dismissCompletion, openWelcome, dismissWelcome]);

  return (
    <TourContext.Provider value={contextValue}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextType {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
