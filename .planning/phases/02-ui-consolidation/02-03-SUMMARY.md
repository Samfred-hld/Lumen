---
phase: 02-ui-consolidation
plan: 03
subsystem: ui
tags: [budget-card, goal-card, design-tokens, card-removal, shared-components]

requires:
  - phase: 01-foundation-hardening
    provides: TypeScript strict mode, ESLint coverage
  - phase: 02-ui-consolidation
    plan: 01
    provides: Material Symbols migration, iconMap.js, CAT_MATERIAL_ICONS
provides:
  - BudgetCard shared component with design tokens
  - GoalCard shared component with circular progress SVG
  - Zero Card/CardContent imports in page files
  - Design token divs replacing shadcn Card across Budgets, Goals, CalendarPage
affects: [02-ui-consolidation, ui-components, all-pages]

tech-stack:
  added: []
  patterns: [design-token-card-component, circular-progress-svg]

key-files:
  created:
    - src/components/finance/BudgetCard.jsx
    - src/components/finance/GoalCard.jsx
  modified:
    - src/pages/Budgets.jsx
    - src/pages/Goals.jsx
    - src/pages/CalendarPage.jsx

key-decisions:
  - "Extracted BudgetCard as presentational component accepting budget/spent/onEdit/onDelete props"
  - "Extracted GoalCard with circular progress SVG using strokeDasharray/offset pattern"
  - "Replaced all Card/CardContent in page files with design token divs (bg-surface, border-surface-border, p-card-padding)"
  - "Fixed CreditCard import issue in CalendarPage.jsx — replaced with MsIcon credit_card"

patterns-established:
  - "Design token card pattern: bg-surface border border-surface-border p-card-padding"
  - "Circular progress SVG: viewBox 0 0 48 48, r=20, strokeDasharray = 2*pi*20"

requirements-completed: [CONCERN #4, UI-REVIEW #1-22]

duration: 5min
completed: 2026-05-20
---

# Phase 02 Plan 03: Extract Shared BudgetCard + GoalCard Summary

**Shared BudgetCard and GoalCard components extracted with design tokens, eliminating shadcn Card from all page files**

## Performance

- **Duration:** 5 min
- **Started:** 2026-05-20T03:30:46Z
- **Completed:** 2026-05-20T03:36:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created BudgetCard shared component with design tokens (bg-surface, border-surface-border, p-card-padding)
- Created GoalCard shared component with circular progress SVG using strokeDasharray/offset pattern
- Removed all Card/CardContent/CardHeader/CardTitle imports from Budgets.jsx, Goals.jsx, CalendarPage.jsx
- Fixed CreditCard import issue in CalendarPage.jsx — replaced with MsIcon credit_card
- Removed unused calcMonthsToGoal function from Goals.jsx

## Task Commits

Each task was committed atomically:

1. **Task 1: Create BudgetCard shared component** - `c69c8b8` (feat)
2. **Task 2: Create GoalCard + remove Card from pages** - `78721d9` (feat)

## Files Created/Modified
- `src/components/finance/BudgetCard.jsx` - Presentational budget card with design tokens, progress bar, accent bar
- `src/components/finance/GoalCard.jsx` - Presentational goal card with circular progress SVG, days left, forecast
- `src/pages/Budgets.jsx` - Replaced Card/CardContent with design token divs
- `src/pages/Goals.jsx` - Use shared GoalCard, removed inline GoalCard, replaced Card with divs
- `src/pages/CalendarPage.jsx` - Replaced Card/CardContent/CardHeader/CardTitle with design token divs

## Decisions Made
- BudgetCard accepts budget/spent/onEdit/onDelete props — matches Planejamento.jsx pattern exactly
- GoalCard accepts currentProgress prop (pre-calculated by parent) instead of raw transactions
- Accent bar pattern: bg-kpi-income for under-budget, bg-kpi-expense for over-budget
- Hover reveal pattern: opacity-0 group-hover:opacity-100 for edit/delete buttons

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CreditCard import issue in CalendarPage.jsx**
- **Found during:** Task 2 (Card removal from CalendarPage)
- **Issue:** CalendarPage.jsx used `<CreditCard size={14} />` and `<CreditCard size={18} />` without proper import — CreditCard was not imported from lucide-react
- **Fix:** Replaced both instances with `<MsIcon name="credit_card" size={14} />` and `<MsIcon name="credit_card" size={18} />`
- **Files modified:** src/pages/CalendarPage.jsx
- **Verification:** Grep confirms zero CreditCard references remain
- **Committed in:** 78721d9 (Task 2 commit)

**2. [Rule 2 - Missing Critical] Removed unused calcMonthsToGoal function**
- **Found during:** Task 2 (GoalCard extraction)
- **Issue:** calcMonthsToGoal was only used by the inline GoalCard that was being removed — leaving dead code
- **Fix:** Removed the function from Goals.jsx
- **Files modified:** src/pages/Goals.jsx
- **Verification:** Grep confirms function no longer exists
- **Committed in:** 78721d9 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 bug, 1 missing critical)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shared components (BudgetCard, GoalCard) ready for reuse across Planejamento and other pages
- Zero Card/CardContent imports in page files — migration complete
- Ready for remaining UI consolidation plans

---
*Phase: 02-ui-consolidation*
*Completed: 2026-05-20*

## Self-Check: PASSED
- BudgetCard.jsx: FOUND
- GoalCard.jsx: FOUND
- Commit c69c8b8: FOUND
- Commit 78721d9: FOUND
