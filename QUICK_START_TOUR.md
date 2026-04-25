# 🚀 Quick Start - Tour Integration (5 Minutes)

## Copy-Paste Integration

### 1. Update `src/app/layout.tsx`

```tsx
import type { Metadata } from 'next';
import { DM_Mono, DM_Sans } from 'next/font/google';
import './globals.css';
import { TourProvider } from '@/components/tour';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans'
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  variable: '--font-dm-mono',
  weight: ['400', '500']
});

export const metadata: Metadata = {
  title: 'TaskOps Core',
  description: 'Task-first operations workspace'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`}>
      <body>
        <TourProvider>
          {children}
        </TourProvider>
      </body>
    </html>
  );
}
```

### 2. Update `src/components/tasks/tasks-workspace.tsx`

Add these imports at the top:

```tsx
import { TourOverlay, TourWelcomeScreen, TourCompletionModal } from '@/components/tour';
import '@/components/tour/tour-styles.css';
```

Add these components at the end of the return statement (before closing `</div>`):

```tsx
return (
  <div className="workspace-container">
    {/* ... existing workspace content ... */}
    
    {/* Tour System - Add these 3 components */}
    <TourWelcomeScreen />
    <TourOverlay />
    <TourCompletionModal />
  </div>
);
```

### 3. Add "Take Tour" Button to Tasks Module Header

Find the tasks module header section and add:

```tsx
import { useTour } from '@/components/tour';

// Inside your TasksWorkspace component:
const { startTour, progress } = useTour();

// In the header JSX:
<div className="module-header">
  <h2>My Work</h2>
  {!progress.tasks?.completed && (
    <button 
      onClick={() => startTour('tasks')}
      style={{
        padding: '8px 16px',
        borderRadius: 8,
        fontWeight: 600,
        fontSize: 14,
        cursor: 'pointer',
        border: '1.5px solid var(--border)',
        background: 'white',
        color: 'var(--ink-mid)',
        fontFamily: "'DM Sans', sans-serif"
      }}
    >
      ❓ Take Tour
    </button>
  )}
</div>
```

### 4. Add "Restart Tour" to Sidebar Footer

Find your sidebar footer and update:

```tsx
import { useTour } from '@/components/tour';

// Inside your sidebar component:
const { startTour } = useTour();

// In the sidebar footer JSX:
<div className="sidebar-footer">
  <button 
    className="help-btn"
    onClick={() => startTour('global')}
  >
    <span className="nav-icon">❓</span> Restart Tour
  </button>
</div>
```

### 5. Verify CSS Variables

Ensure these are in your `src/app/globals.css` or `:root`:

```css
:root {
  --green-deep: #1a3a2a;
  --green-mid: #27ae60;
  --green-light: #d4edda;
  --green-xlight: #f0faf4;
  --amber: #e67e22;
  --amber-light: #fef3e2;
  --ink: #1c2b20;
  --ink-mid: #4a5c52;
  --ink-light: #8a9e92;
  --border: #dde8e2;
  --surface: #f8faf9;
  --white: #ffffff;
}
```

---

## ✅ Test It Works

1. **Clear localStorage**: Open DevTools → Application → LocalStorage → Clear
2. **Refresh page**: Welcome screen should appear automatically
3. **Click "Start Guided Tour"**: Tour should begin with spotlight on sidebar
4. **Click "Next"**: Tour progresses through steps
5. **Click "Exit Tour"**: Confirmation toast appears
6. **Refresh page**: Should offer to resume from last step
7. **Complete tour**: Completion modal shows with module grid

---

## 🎯 That's It!

Your tour system is now live! Users will see:

- ✅ Welcome screen on first visit
- ✅ Step-by-step guided tours for all 6 modules
- ✅ Progress persistence (resume on return)
- ✅ Completion celebrations with mini-indicators
- ✅ "Take Tour" buttons in each module
- ✅ "Restart Tour" in sidebar

**Total time**: ~5 minutes  
**Files modified**: 2 (layout.tsx, tasks-workspace.tsx)  
**Files added**: 0 (all tour files already created)

---

## 📚 Full Documentation

- **TOUR_SPECIFICATION.md**: Exact copy/text for all 42 steps
- **TOUR_INTEGRATION_GUIDE.md**: Detailed integration guide
- **TOUR_IMPLEMENTATION_SUMMARY.md**: Complete implementation overview
