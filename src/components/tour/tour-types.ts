// ─── Tour Type Definitions ────────────────────────────────────────────────────

export type TourModule = 
  | 'global'
  | 'tasks'
  | 'projects'
  | 'team'
  | 'reports'
  | 'analytics'
  | 'settings';

export type TooltipPosition = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface TourStep {
  id: string;
  target: string | null;              // CSS selector or null for center
  title: string;
  description: string;
  context?: string;                   // "💡 ..." callout
  whyItMatters?: string;              // Enhanced context callout
  position: TooltipPosition;
  module: TourModule | null;          // Module to switch to
  beforeShow?: () => void;            // Hook to prepare UI state
  interactive?: {                     // Optional "Try it" interaction
    hint: string;
    targetSelector: string;
    action: 'click' | 'hover';
    onComplete: () => void;
  };
  missingTargetFallback?: {
    target?: string | null;
    title?: string;
    description: string;
    context?: string;
    whyItMatters?: string;
    position?: TooltipPosition;
  };
}

export interface TourDefinition {
  id: TourModule;
  name: string;
  icon: string;
  description: string;
  estimatedTime: string;
  steps: TourStep[];
}

export interface TourProgress {
  completed: boolean;
  completedAt?: string;
  lastStep: number;                   // Last step viewed (0-indexed)
  totalSteps: number;
  startedAt?: string;
}

export interface TourState {
  activeTour: TourModule | null;
  completedTour: TourModule | null;
  currentStep: number;
  isPlaying: boolean;
  progress: Record<TourModule, TourProgress | null>;
}

export interface TourWorkspaceController {
  prepareStep: (tourId: TourModule, step: TourStep) => void;
}

export interface TourContextType extends TourState {
  showWelcome?: boolean;
  showCompletion?: boolean;
  startTour: (tourId: TourModule) => void;
  prepareStep: (tourId: TourModule, step: TourStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  exitTour: () => void;
  completeTour: () => void;
  resetProgress: (tourId: TourModule) => void;
  registerWorkspaceController: (controller: TourWorkspaceController | null) => void;
  dismissCompletion?: () => void;
  openWelcome?: () => void;
  dismissWelcome?: () => void;
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export const TOUR_STORAGE_PREFIX = 'taskops:tour:';

export function getTourStorageKey(tourId: TourModule): string {
  return `${TOUR_STORAGE_PREFIX}${tourId}:progress`;
}

export const TOUR_STORAGE_KEYS = {
  global: getTourStorageKey('global'),
  tasks: getTourStorageKey('tasks'),
  projects: getTourStorageKey('projects'),
  team: getTourStorageKey('team'),
  reports: getTourStorageKey('reports'),
  analytics: getTourStorageKey('analytics'),
  settings: getTourStorageKey('settings'),
} as const;

// ─── Module Metadata ──────────────────────────────────────────────────────────

export const MODULE_METADATA: Record<TourModule, { icon: string; label: string; description: string }> = {
  global: {
    icon: '🚀',
    label: 'Getting Started',
    description: 'Workspace overview and navigation'
  },
  tasks: {
    icon: '🌾',
    label: 'Tasks',
    description: 'Daily task management and execution'
  },
  projects: {
    icon: '📁',
    label: 'Projects',
    description: 'Seasonal planning and WBS'
  },
  team: {
    icon: '👥',
    label: 'Team',
    description: 'Workload management and HR import'
  },
  reports: {
    icon: '📄',
    label: 'Reports',
    description: 'Compliance and documentation'
  },
  analytics: {
    icon: '📊',
    label: 'Analytics',
    description: 'Operational and financial insights'
  },
  settings: {
    icon: '⚙️',
    label: 'Settings',
    description: 'Automation and configuration'
  }
};
