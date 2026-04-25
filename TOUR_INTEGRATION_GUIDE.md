# TaskOps Guided Tour Integration Guide

## Overview

This guide shows you how to integrate the custom tour system into your TaskOps application. The tour system is built to match your `agriops_tour_improved.html` prototype exactly while adding all requested enhancements.

---

## What's Been Built

### Core Components (✅ Complete)

1. **TourProvider** - Global state management with localStorage persistence
2. **TourOverlay** - Spotlight + modal with 4-directional arrows
3. **TourWelcomeScreen** - Module preview with "What You'll Learn" 
4. **TourCompletionModal** - Mini-completion indicators for all modules
5. **Tour Types** - Full TypeScript definitions
6. **Tour CSS** - Animations, mobile responsive, accessibility

### Tour Definitions (🔄 Partial)

- ✅ Global Onboarding Tour (5 steps)
- ✅ Tasks Module Tour (7 steps with interactive hotspots)
- ⏳ Projects Module Tour (ready to implement)
- ⏳ Team Module Tour (ready to implement)
- ⏳ Reports Module Tour (ready to implement)
- ⏳ Analytics Module Tour (ready to implement)
- ⏳ Settings Module Tour (ready to implement)

---

## Integration Steps

### Step 1: Wrap App with TourProvider

Add the TourProvider to your root layout:

```tsx
// src/app/layout.tsx
import { TourProvider } from '@/components/tour';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TourProvider>
          {children}
        </TourProvider>
      </body>
    </html>
  );
}
```

### Step 2: Add Tour Components to TasksWorkspace

Import and render tour components in your main workspace:

```tsx
// src/components/tasks/tasks-workspace.tsx
import { TourOverlay, TourWelcomeScreen, TourCompletionModal } from '@/components/tour';
import '@/components/tour/tour-styles.css'; // Import tour animations

export function TasksWorkspace() {

  return (
    <div className="tasks-workspace">
      {/* Existing workspace content */}
      
      {/* Tour System */}
      <TourWelcomeScreen />
      <TourOverlay />
      <TourCompletionModal />
    </div>
  );
}
```

### Step 3: Add "Take Tour" Button to Module Headers

Add tour trigger buttons in each module:

```tsx
// Example in Tasks module header
import { useTour } from '@/components/tour';

function TasksModuleHeader() {
  const { startTour, progress } = useTour();
  const isTourComplete = progress.tasks?.completed;

  return (
    <div className="module-header">
      <h2>My Work</h2>
      {!isTourComplete && (
        <button 
          onClick={() => startTour('tasks')}
          className="btn-tour"
        >
          ❓ Take Tour
        </button>
      )}
    </div>
  );
}
```

### Step 4: Add Restart Tour Button to Sidebar

```tsx
// In your sidebar component
import { useTour } from '@/components/tour';

function Sidebar() {
  const { startTour } = useTour();

  return (
    <aside className="sidebar">
      {/* ... existing nav items ... */}
      
      <div className="sidebar-footer">
        <button 
          className="help-btn"
          onClick={() => startTour('global')}
        >
          <span className="nav-icon">❓</span> Restart Tour
        </button>
      </div>
    </aside>
  );
}
```

### Step 5: Add Tour CSS to Global Styles

Import the tour CSS in your global stylesheet:

```css
/* src/app/globals.css */
@import '@/components/tour/tour-styles.css';

/* ... rest of your styles ... */
```

---

## CSS Variables Required

The tour system uses CSS variables for theming. Ensure these are defined in your `:root`:

```css
:root {
  --green-deep: #1a3a2a;
  --green-mid: #27ae60;
  --green-light: #d4edda;
  --green-xlight: #f0faf4;
  --amber: #e67e22;
  --amber-light: #fef3e2;
  --red: #c0392b;
  --red-light: #fdecea;
  --blue: #2980b9;
  --blue-light: #dbeafe;
  --ink: #1c2b20;
  --ink-mid: #4a5c52;
  --ink-light: #8a9e92;
  --border: #dde8e2;
  --surface: #f8faf9;
  --white: #ffffff;
}
```

---

## How It Works

### Auto-Start Logic

1. **First Visit**: When user loads app for first time, `TourWelcomeScreen` appears automatically
2. **Skip Option**: User can skip and explore on their own
3. **Progress Persistence**: If user exits mid-tour, progress is saved to localStorage
4. **Resume Prompt**: On return, tour offers "Resume from Step X"

### Tour Flow

```
TourWelcomeScreen (optional)
  ↓
TourOverlay (step-by-step guidance)
  ↓
TourCompletionModal (mini-completion grid)
  ↓
Next module tour suggestion
```

### LocalStorage Keys

Tour progress is stored with these keys:
- `taskops:tour:global:progress`
- `taskops:tour:tasks:progress`
- `taskops:tour:projects:progress`
- `taskops:tour:team:progress`
- `taskops:tour:reports:progress`
- `taskops:tour:analytics:progress`
- `taskops:tour:settings:progress`

Each contains:
```json
{
  "completed": false,
  "lastStep": 3,
  "totalSteps": 7,
  "startedAt": "2026-04-22T10:30:00Z"
}
```

---

## Features Implemented

### ✅ From Your HTML Prototype
- Spotlight with 9999px overlay and 12px padding
- Pulse animation ring (2s ease-in-out infinite)
- 4-directional tooltip arrows (top/bottom/left/right)
- Progress dots with active/done states
- Skip confirmation toast (6-second auto-dismiss)
- Completion modal with celebration
- Keyboard navigation (ArrowRight, ArrowLeft, Escape, Enter)
- Smooth transitions (0.45s cubic-bezier)
- BeforeShow hooks for UI preparation

### ✅ Enhanced Features
- **"What You'll Learn" Preview**: Module grid with icons and descriptions
- **Per-Module Mini-Completion**: Grid showing ✓ for completed modules
- **Interactive Hotspots**: "Try it" hints for key interactions (2 steps in Tasks tour)
- **Mobile Responsiveness**: Media queries for 768px and 480px breakpoints
- **Tour Progress Persistence**: Resume from last step on return
- **"Why This Matters" Callouts**: Orange highlighted boxes for context
- **Visual Indicators**: Agricultural emojis (🌾📁👥📄📊⚙️)
- **Accessibility**: ARIA labels, focus styles, screen reader support
- **Reduced Motion**: Respects `prefers-reduced-motion` preference
- **TypeScript**: Full type safety for all tour steps

---

## Remaining Work

### Tour Definitions to Complete

The following tour step definitions need to be created (following the spec in TOUR_SPECIFICATION.md):

1. **Projects Tour** (`src/components/tour/tours/projects-tour.ts`)
   - 6 steps: Overview, Health Metrics, Workbench, WBS, Gantt, Creating
   - Copy from spec document

2. **Team Tour** (`src/components/tour/tours/team-tour.ts`)
   - 6 steps: Overview, Member Cards, Filters, HR Import, Roles, Costs
   - Copy from spec document

3. **Reports Tour** (`src/components/tour/tours/reports-tour.ts`)
   - 6 steps: Overview, Lifecycle, Templates, Editor, Notifications, Offline
   - Copy from spec document

4. **Analytics Tour** (`src/components/tour/tours/analytics-tour.ts`)
   - 6 steps: Overview, Task Metrics, Project Performance, Labor Cost Overview, Category Breakdown, Roster
   - Copy from spec document

5. **Settings Tour** (`src/components/tour/tours/settings-tour.ts`)
   - 6 steps: Overview, Automations, Task Templates, Report Templates, Escalations, Notifications
   - Copy from spec document

**Format**: Follow the exact structure from `tasks-tour.ts` and `global-tour.ts`

### Integration Testing

1. Test auto-start on first visit
2. Test progress persistence (exit mid-tour, return, resume)
3. Test module switching during tours
4. Test mobile responsiveness (768px, 480px)
5. Test keyboard navigation
6. Test reduced motion preference
7. Test screen reader compatibility

---

## Next Steps

1. ✅ Review this integration guide
2. ⏳ Complete remaining 5 tour definition files
3. ⏳ Integrate into TasksWorkspace component
4. ⏳ Add "Take Tour" buttons to module headers
5. ⏳ Test all 7 tours end-to-end
6. ⏳ Add analytics tracking (optional)

---

## Support

For questions or issues:
- Refer to `TOUR_SPECIFICATION.md` for exact copy/text
- Check `agriops_tour_improved.html` for visual reference
- Review tour component source code for implementation details

---

## File Structure

```
src/components/tour/
├── index.ts                      # Main exports
├── tour-types.ts                 # TypeScript definitions
├── TourProvider.tsx              # State management + persistence
├── TourOverlay.tsx               # Spotlight + modal + arrows
├── TourWelcomeScreen.tsx         # Module preview screen
├── TourCompletionModal.tsx       # Completion with mini-indicators
├── tour-styles.css               # Animations + responsive + a11y
└── tours/
    ├── index.ts                  # Tour exports
    ├── global-tour.ts            # ✅ Complete (5 steps)
    ├── tasks-tour.ts             # ✅ Complete (7 steps)
    ├── projects-tour.ts          # ⏳ TODO
    ├── team-tour.ts              # ⏳ TODO
    ├── reports-tour.ts           # ⏳ TODO
    ├── analytics-tour.ts         # ⏳ TODO
    └── settings-tour.ts          # ⏳ TODO
```
