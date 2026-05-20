---
phase: 02-ui-consolidation
plan: 01
subsystem: ui
tags: [material-symbols, lucide-react, icon-migration, ms-icon, iconmap]

requires:
  - phase: 01-foundation-hardening
    provides: TypeScript strict mode, ESLint coverage
provides:
  - Centralized iconMap.js with 51 Lucide-to-Material-Symbols mappings
  - Zero lucide-react imports in custom code (22 files migrated)
  - CAT_MATERIAL_ICONS and getCategoryMsIcon extracted for reuse
affects: [02-ui-consolidation, ui-components, all-pages]

tech-stack:
  added: []
  patterns: [centralized-icon-mapping, material-symbols-wrapper]

key-files:
  created:
    - src/lib/iconMap.js
  modified:
    - src/components/dashboard/DashSection.jsx
    - src/components/dashboard/OnboardingModal.jsx
    - src/components/finance/CashFlowForecast.jsx
    - src/components/finance/ColumnMapper.jsx
    - src/components/finance/CSVImport.jsx
    - src/components/finance/DashCustomizeModal.jsx
    - src/components/finance/InstallmentConfirm.jsx
    - src/components/finance/QuickEntry.jsx
    - src/components/finance/SuggestionBanner.jsx
    - src/components/finance/TransactionInlineForm.jsx
    - src/components/finance/TransactionRow.jsx
    - src/components/GlobalSearch.jsx
    - src/components/settings/TabAutomacao.jsx
    - src/components/settings/TabDados.jsx
    - src/components/settings/TabPersonalizacao.jsx
    - src/pages/Budgets.jsx
    - src/pages/CalendarPage.jsx
    - src/pages/Goals.jsx
    - src/pages/Planejamento.jsx
    - src/pages/Reports.jsx
    - src/pages/Settings.jsx
    - src/pages/Transactions.jsx
    - src/pages/Dashboard.jsx

key-decisions:
  - "Extracted CAT_MATERIAL_ICONS and getCategoryMsIcon from Planejamento/TransactionRow into iconMap.js for cross-file reuse"
  - "Converted Section component icon prop from React component to string name in settings tabs"

patterns-established:
  - "All custom icons use MsIcon wrapper with Material Symbols string names"
  - "iconMap.js is the single source of truth for icon mappings (LUCIDE_TO_MATERIAL, CAT_MATERIAL_ICONS)"

requirements-completed: [CONCERN #11, UI-REVIEW #1-22]

duration: 13min
completed: 2026-05-20
---

# Phase 02 Plan 01: Icon Migration Summary

**Migrated 22 custom component files from lucide-react to Material Symbols via MsIcon, with centralized iconMap.js as single source of truth**

## Performance

- **Duration:** 13 min
- **Started:** 2026-05-20T03:13:33Z
- **Completed:** 2026-05-20T03:26:34Z
- **Tasks:** 2
- **Files modified:** 23 (1 created + 22 modified)

## Accomplishments

- Created centralized `src/lib/iconMap.js` with 51 Lucide-to-Material-Symbols mappings and 33 Brazilian Portuguese category icons
- Migrated all 22 custom component files from lucide-react to MsIcon (Material Symbols)
- Removed local MsIcon definitions from Planejamento.jsx, TransactionRow.jsx, and Dashboard.jsx
- Extracted `CAT_MATERIAL_ICONS` and `getCategoryMsIcon` into iconMap.js for cross-file reuse
- Zero lucide-react imports remain in custom code (shadcn/ui vendor code untouched)
- Build passes cleanly with all changes

## Task Commits

1. **Task 1: Create centralized iconMap.js** - `f4f51f4` (feat)
2. **Task 2: Migrate all 22 custom files** - `6eaedb8` (feat)

## Files Created/Modified

- `src/lib/iconMap.js` - Centralized Lucide-to-Material-Symbols mapping (51 icons), category icons (33), getCategoryMsIcon helper
- `src/components/dashboard/DashSection.jsx` - ChevronRight to chevron_right
- `src/components/dashboard/OnboardingModal.jsx` - Sparkles/Plus/CreditCard/Target/Upload/ArrowRight to Material Symbols
- `src/components/finance/CashFlowForecast.jsx` - CalendarClock/ChevronDown/ChevronRight to Material Symbols
- `src/components/finance/ColumnMapper.jsx` - AlertTriangle/Columns3 to Material Symbols
- `src/components/finance/CSVImport.jsx` - 8 Lucide icons migrated to Material Symbols
- `src/components/finance/DashCustomizeModal.jsx` - GripVertical/Eye/EyeOff/ArrowUp/ArrowDown/RotateCcw to Material Symbols
- `src/components/finance/InstallmentConfirm.jsx` - AlertTriangle to warning
- `src/components/finance/QuickEntry.jsx` - Plus/TrendingDown/TrendingUp/QrCode/CreditCard/Banknote/ArrowRightLeft/History to Material Symbols
- `src/components/finance/SuggestionBanner.jsx` - Lightbulb/DollarSign/FileText/CreditCard/X to Material Symbols
- `src/components/finance/TransactionInlineForm.jsx` - Layers/Edit3/TrendingDown/TrendingUp to Material Symbols
- `src/components/finance/TransactionRow.jsx` - Pencil/Trash2/Copy to Material Symbols, removed local MsIcon/getCategoryMsIcon
- `src/components/GlobalSearch.jsx` - Search/ArrowRight/TrendingUp/TrendingDown/Gem to Material Symbols
- `src/components/settings/TabAutomacao.jsx` - Wand2/DollarSign/Wallet/Layers/Plus/Pencil/Trash2 to Material Symbols, Section icon prop changed to string
- `src/components/settings/TabDados.jsx` - Download/Upload/FileText/Receipt/History/ChevronDown/ChevronRight/Trash2/AlertCircle to Material Symbols
- `src/components/settings/TabPersonalizacao.jsx` - CreditCard/Tag/Plus/Pencil/Trash2/Receipt/X to Material Symbols
- `src/pages/Budgets.jsx` - Plus/Trash2/Pencil/ChevronLeft/ChevronRight/TrendingUp/Repeat to Material Symbols
- `src/pages/CalendarPage.jsx` - ChevronLeft/ChevronRight/Plus/X/CreditCard/Calendar/Download/Pencil/Trash2 to Material Symbols
- `src/pages/Goals.jsx` - Plus/Trash2/Pencil/Target/CheckCircle2/Clock/AlertTriangle/History to Material Symbols
- `src/pages/Planejamento.jsx` - Removed local MsIcon/CAT_MATERIAL_ICONS, all Lucide icons to Material Symbols
- `src/pages/Reports.jsx` - FileText/Download to Material Symbols
- `src/pages/Settings.jsx` - Moon/Sun/Check/AlertCircle/ChevronLeft/ChevronRight/Receipt to Material Symbols
- `src/pages/Transactions.jsx` - Plus/Search/ChevronLeft/ChevronRight/Upload/X/FileSpreadsheet to Material Symbols
- `src/pages/Dashboard.jsx` - Removed local MsIcon definition, imports from shared component

## Decisions Made

- Extracted `CAT_MATERIAL_ICONS` and `getCategoryMsIcon` from Planejamento.jsx and TransactionRow.jsx into iconMap.js so BudgetCard, GoalCard, and TransactionRow can share the same mapping
- Changed Section component in settings tabs (TabAutomacao, TabDados, TabPersonalizacao) to accept icon as string name instead of React component, using MsIcon internally

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed duplicate MsIcon imports**
- **Found during:** Task 2 (Migration)
- **Issue:** Several files (CalendarPage, Goals, Reports, Transactions) already had MsIcon imported; migration added duplicate imports
- **Fix:** Removed duplicate import lines
- **Files modified:** CalendarPage.jsx, Goals.jsx, Reports.jsx, Transactions.jsx
- **Verification:** Build passes, no duplicate imports remain
- **Committed in:** 6eaedb8

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor cleanup - duplicate imports would cause build warnings. No scope creep.

## Issues Encountered

None - migration completed cleanly. Build passes with zero errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Icon migration complete, ready for remaining Phase 02 plans (Card migration, Planejamento decomposition, padding, skeletons)
- iconMap.js available as shared utility for all future icon needs

---
*Phase: 02-ui-consolidation*
*Completed: 2026-05-20*
