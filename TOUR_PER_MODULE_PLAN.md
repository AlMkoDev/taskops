# 🎯 Per-Module Tour Implementation Plan

## Current Status

✅ **Smart Positioning** - Modal now uses collision detection to avoid blocking UI elements  
✅ **Tasks Tour** - Complete with 12 detailed steps targeting real UI elements  
⚠️ **Tour Restart** - Only accessible via top bar "❓ Take Tour" button (always visible now)  
❌ **Per-Module Tours** - Only Tasks tour is fully implemented

---

## Issue #1: Smart Positioning ✅ FIXED

**Solution Implemented:**
- Modal tries preferred position first (based on step.position)
- If that position would overlap the target or go off-screen, tries fallback positions
- Checks 3 alternative positions before settling
- Ensures modal never blocks the highlighted UI element

**How It Works:**
```typescript
// For each step, generates array of possible positions:
positions = [
  { preferred: right, fallback1: below, fallback2: above },
  // or
  { preferred: left, fallback1: below, fallback2: above },
  // or
  { preferred: below, fallback1: above, fallback2: right },
  // etc.
]

// Tests each position for:
1. Fits in viewport (16px padding minimum)
2. Doesn't overlap target element (with SPOTLIGHT_PADDING buffer)

// Uses first position that passes both tests
```

---

## Issue #2: How to Restart Tour ✅ FIXED

**Current Access Points:**

1. **Top Bar** (Always visible):
   - "❓ Take Tour" button → Starts Tasks tour
   - "Walkthrough" button → Opens legacy walkthrough

**Problem:** User can only start Tasks tour, not other module tours.

**Solution:** Need per-module tour buttons.

---

## Issue #3: Per-Module Guided Wizards ❌ NEEDS IMPLEMENTATION

### **Architecture Decision:**

We agreed on **7 separate per-module tours**:
1. ✅ Global/Welcome Tour (5 steps) - Overview of all modules
2. ✅ Tasks Tour (12 steps) - Daily task management  
3. ⏳ Projects Tour (6 steps) - Seasonal planning & WBS
4. ⏳ Team Tour (6 steps) - Workload management
5. ⏳ Reports Tour (6 steps) - Compliance & documentation
6. ⏳ Analytics Tour (6 steps) - Operational insights
7. ⏳ Settings Tour (6 steps) - Automation & config

**Total: 41 steps across 7 tours**

---

## Implementation Strategy

### **Option A: Add Tour Buttons to Each Module Header** (Recommended)

Add a "❓ Take [Module] Tour" button to each module's page header:

```tsx
// Tasks module
{activeSection === 'tasks' && (
  <button onClick={() => startTour('tasks')}>❓ Take Tasks Tour</button>
)}

// Projects module  
{activeSection === 'projects' && (
  <button onClick={() => startTour('projects')}>❓ Take Projects Tour</button>
)}

// ... repeat for all 6 modules
```

**Pros:**
- Clear, contextual - button appears in the module being toured
- Always accessible
- Can show/hide based on completion status

**Cons:**
- Requires modifying 6 different sections of the already-complex render

---

### **Option B: Add Tour Menu to Top Bar**

Replace single "❓ Take Tour" with a dropdown:

```tsx
<button className="ghost-button" onClick={showTourMenu}>
  ❓ Take Tour ▾
</button>

// Dropdown shows:
// - Tasks Tour (~3 min) ✓
// - Projects Tour (~2 min)
// - Team Tour (~2 min)
// - Reports Tour (~2 min)
// - Analytics Tour (~2 min)
// - Settings Tour (~2 min)
// - Restart Current Tour (if in progress)
```

**Pros:**
- Single UI element, doesn't clutter module headers
- Shows all available tours in one place
- Can display completion status (✓) next to completed tours

**Cons:**
- Less contextual - user has to know which tour they want

---

### **Option C: Add "Restart Tour" to Sidebar Footer**

Add a section at bottom of sidebar:

```tsx
<div className="sidebar-section">
  <div className="sidebar-title">Guided Tours</div>
  <button className="sidebar-item" onClick={() => startTour(activeSection)}>
    <BookOpen size={14} />
    <span>Take {getModuleName(activeSection)} Tour</span>
  </button>
  {progress[activeSection]?.completed && (
    <button className="sidebar-item" onClick={() => resetProgress(activeSection)}>
      <RotateCw size={14} />
      <span>Restart Tour</span>
    </button>
  )}
</div>
```

**Pros:**
- Always visible regardless of module
- Contextual to current module
- Can show restart option if already completed

**Cons:**
- Sidebar is already crowded with module-specific content

---

## Recommended Solution: **Option A + C Hybrid**

1. **Add tour buttons to page headers** (contextual, module-specific)
2. **Add "Restart Tour" to sidebar** (always accessible)
3. **Keep top bar "❓ Take Tour"** as fallback

### **Implementation Steps:**

#### **Step 1: Add Tour Buttons to Page Headers**

In `tasks-workspace.tsx`, after line 784 (page-header section):

```tsx
<div className="page-header">
  <div>
    <h1>{/* ... existing title logic ... */}</h1>
    <p>{/* ... existing description ... */}</p>
  </div>
  
  {/* ADD THIS: Module-specific tour button */}
  <button 
    className="ghost-button" 
    onClick={() => startTour(activeSection as TourModule)}
    style={{ display: 'flex', alignItems: 'center', gap: 8 }}
  >
    ❓ Take {getModuleLabel(activeSection)} Tour
    {progress[activeSection as TourModule]?.completed && (
      <span style={{ fontSize: 11, opacity: 0.7 }}>(completed)</span>
    )}
  </button>
</div>
```

#### **Step 2: Create Remaining 5 Module Tours**

Already have tour definitions scaffolded in:
- `src/components/tour/tours/projects-tour.ts` (needs real UI targets)
- `src/components/tour/tours/team-tour.ts` (needs real UI targets)
- `src/components/tour/tours/reports-tour.ts` (needs real UI targets)
- `src/components/tour/tours/analytics-tour.ts` (needs real UI targets)
- `src/components/tour/tours/settings-tour.ts` (needs real UI targets)

Each needs to be updated with:
- Real CSS selectors from your actual UI
- Agricultural context and examples
- beforeShow hooks for module switching
- 6-8 detailed steps per module

#### **Step 3: Add Tour Progress Reset**

In `TourProvider.tsx`, the `resetProgress` function already exists. Just need to expose it via UI.

---

## Next Actions Required

**Which approach would you prefer?**

1. **Quick Fix** - Just add tour buttons to page headers for all 6 modules (~15 min)
2. **Full Implementation** - Create all 5 remaining module tours with real UI targeting (~2 hours)
3. **Both** - Add buttons now, then create remaining tours

**Tell me which option and I'll implement it immediately!**
