# Phase 02: UI Consolidation - Research

**Researched:** 2026-05-19
**Domain:** Frontend design system consolidation, icon migration, component deduplication
**Confidence:** HIGH

## Summary

Phase 02 consolidates the Lumen design system across all 8 pages. The codebase has accumulated fragmentation during rapid feature development: 22 custom component files still import lucide-react, 3 pages use shadcn Card instead of design tokens, Planejamento.jsx (674 lines) duplicates Budgets.jsx (291 lines) and Goals.jsx (465 lines), and TransactionRow has a single render path but still uses lucide-react icons for action buttons. The existing design token infrastructure (CSS custom properties, Tailwind config with semantic spacing/color tokens) is solid and already used by KpiCard, Layout, and most components. This phase is purely refactoring -- no new packages are needed.

The primary work streams are: (1) icon migration from lucide-react to Material Symbols via the existing MsIcon wrapper, (2) shadcn Card replacement with design-token divs, (3) Planejamento decomposition into shared BudgetCard/GoalCard components, (4) TransactionRow responsive consolidation, (5) uniform page padding, (6) skeleton loading states, and (7) iconMap.js centralization.

**Primary recommendation:** Execute icon migration first (largest surface area, 22 files), then Card migration (3 files), then Planejamento decomposition (depends on shared components being ready), then padding/skeletons (independent, can parallelize).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Collapse dual mobile/desktop TransactionRow into a single responsive path using Tailwind responsive classes (hidden/block, md:). Single source of truth, no dual render paths.
- **D-02:** Keep swipe-to-delete behavior mobile-only. Desktop uses visible action buttons (edit, delete, duplicate). Mobile uses swipe + tap for interactions.
- **D-03:** Uniform `px-lg py-xl` padding across all 8 pages. No page-type variants -- consistent spacing everywhere.
- **D-04:** TransactionRow action buttons: visible on desktop (md:), hidden on mobile where swipe handles delete and tap opens detail/edit.
- **D-05:** Full migration from lucide-react to Material Symbols across all 43 files. Zero lucide-react imports in custom code (shadcn/ui vendor components left untouched).
- **D-06:** Use the existing `MsIcon` component (`src/components/ui/ms-icon.jsx`) as the wrapper for all Material Symbols icons.
- **D-07:** Create a centralized mapping file (`src/lib/iconMap.js`) documenting every Lucide to Material Symbols replacement. Single source of truth for auditing.
- **D-08:** shadcn/ui internal lucide-react imports are left untouched -- they're vendor code. Only custom components (pages, finance, dashboard, settings) are migrated.
- **D-09:** Skeleton loading on Dashboard, Transactions, and Reports pages only (the three heaviest pages).
- **D-10:** Shimmer gradient animation (smooth left-to-right gradient sweep). Subtle, elegant, matches Swiss editorial aesthetic.
- **D-11:** High-fidelity skeletons -- each Dashboard section shows blocks that mimic the real layout (card shape for KPIs, circle for avatars, bars for charts). Transactions and Reports get section-appropriate shapes.
- **D-12:** Skeletons shown only on initial page load (when React Query has no cache). Subsequent refetches use cached data and update silently -- no skeleton flicker.

### Claude's Discretion
- **D-13:** shadcn/ui icon handling: leave vendor components untouched, migrate only custom code. Rationale: modifying vendor code creates maintenance burden when updating shadcn/ui.
- **D-14:** Planejamento follows ROADMAP guidance -- becomes thin layout orchestrator delegating to shared BudgetCard/GoalCard components. No redirect, no removal.

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CONCERN #4 | Planejamento duplicates Budgets + Goals | D-14 locked: decompose into shared BudgetCard/GoalCard. 674-line file has inline budget cards (lines 454-522) and goal cards (lines 544-624) that mirror Budgets.jsx and Goals.jsx patterns. |
| CONCERN #5 | KPI Card inconsistency (two implementations) | KpiCard.jsx already unified at `src/components/dashboard/KpiCard.jsx`. Transactions.jsx uses inline KPI divs -- needs migration to shared component. |
| CONCERN #6 | FAB fragmentation (three implementations) | Single FAB at `src/components/ui/fab.jsx`. Layout.jsx imports it. Position needs standardization to `bottom-24 right-6`, visibility to `md:hidden`. |
| CONCERN #7 | TransactionRow dual render paths | TransactionRow.jsx already has single render path with 12-col grid. Action buttons use lucide-react (Pencil, Trash2, Copy) -- need Material Symbols migration. D-01/D-02/D-04 locked. |
| CONCERN #8 | Hardcoded colors bypassing design tokens | Tailwind config has full semantic token set. Some components use hardcoded Tailwind colors (e.g., `bg-emerald-500`, `bg-red-500` in FAB). Need audit. |
| CONCERN #9 | No skeleton loading states | Shimmer CSS already exists in index.css (lines 405-414). shadcn Skeleton component installed. Need Dashboard/Transactions/Reports skeleton components. D-09/D-10/D-11/D-12 locked. |
| CONCERN #10 | Inconsistent page-level padding | D-03 locked: uniform `px-lg py-xl` across all 8 pages. Layout.jsx main content area already has `px-lg md:px-xl` -- pages may have additional padding. |
| CONCERN #11 | Mixed icon libraries | 22 custom files import lucide-react. MsIcon component exists at `src/components/ui/ms-icon.jsx`. D-05/D-06/D-07 locked. Icon mapping file needed. |
| CONCERN #12 | Onboarding modal fires every load | OnboardingModal.jsx exists at `src/components/dashboard/OnboardingModal.jsx`. Need to check if it respects cached state. |
| UI-REVIEW #1-22 | Design system compliance fixes | Covered by the above concerns plus padding standardization, Card migration, and skeleton states. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Icon rendering | Component (MsIcon) | -- | Single wrapper component, all pages import it |
| Design tokens | Tailwind config | CSS custom properties | Tokens defined in tailwind.config.js, values driven by CSS vars for theme switching |
| Page layout/spacing | Page components | Layout.jsx | Layout.jsx sets outer padding; pages set inner spacing |
| Skeleton loading | Page components | React Query | Skeletons shown based on `isLoading && !data` from React Query hooks |
| Component deduplication | Shared components | Page orchestrators | BudgetCard/GoalCard extracted from Budgets/Goals, reused by Planejamento |
| TransactionRow rendering | Finance component | -- | Single component, responsive via Tailwind classes |

## Standard Stack

### Core (no new packages -- refactoring only)

This phase installs zero new packages. All work uses existing infrastructure:

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.2.0 | UI framework | Already in use [VERIFIED: package.json] |
| Tailwind CSS | 3.4.17 | Styling with design tokens | Already configured with full semantic token set [VERIFIED: tailwind.config.js] |
| shadcn/ui | new-york preset | Component primitives | 50+ components installed in `src/components/ui/` [VERIFIED: directory listing] |
| TanStack React Query | 5.84.1 | Data fetching, caching, loading states | Already used by all data hooks [VERIFIED: package.json] |
| Material Symbols | Google Fonts CDN | Icon library | Already loaded, MsIcon wrapper exists [VERIFIED: ms-icon.jsx] |
| Vitest | 4.1.6 | Test runner | Already configured with jsdom environment [VERIFIED: vitest.config.js] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.475.0 | Current icon library (TO BE REMOVED) | Remove from package.json after all custom imports migrated [VERIFIED: package.json] |
| class-variance-authority | 0.7.1 | Component variant management | Used by shadcn components [VERIFIED: package.json] |
| tailwind-merge | 3.0.2 | Class conflict resolution | Used by `cn()` utility [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MsIcon wrapper | Direct `<span class="material-symbols-outlined">` | MsIcon provides consistent API (name, size, filled, className) -- keep it |
| iconMap.js | Inline mappings per file | Centralized mapping enables audit trail and single-source updates |
| shadcn Skeleton + shimmer CSS | Custom skeleton component | shadcn Skeleton is already installed and works; just add shimmer class |

**Installation:** None required -- all dependencies already installed.

**Version verification:** All versions confirmed from package.json (read 2026-05-19).

## Package Legitimacy Audit

This phase installs zero new external packages. All work is refactoring of existing code using already-installed dependencies.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| (none) | -- | -- | -- | -- | -- | No new packages |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

*No package legitimacy gate required -- pure refactoring phase.*

## Architecture Patterns

### System Architecture Diagram

```
User Interaction
       |
       v
+------------------+     +-------------------+
| Page Components  |---->| React Query Hooks  |
| (8 pages)        |     | (useTransactions,  |
|                  |     |  useBudgets, etc.) |
+------------------+     +-------------------+
       |                          |
       v                          v
+------------------+     +-------------------+
| Shared Components|     | Supabase Client   |
| (KpiCard,        |     | (data fetching)   |
|  BudgetCard,     |     +-------------------+
|  GoalCard,       |
|  TransactionRow) |
+------------------+
       |
       v
+------------------+     +-------------------+
| Design Tokens    |---->| Tailwind Config   |
| (CSS vars)       |     | (semantic tokens) |
+------------------+     +-------------------+
       |
       v
+------------------+
| MsIcon           |
| (Material Symbols)|
+------------------+
```

### Recommended Project Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── ms-icon.jsx          # Material Symbols wrapper (exists)
│   │   ├── skeleton.jsx         # shadcn Skeleton (exists)
│   │   ├── fab.jsx              # FAB component (exists, needs icon migration)
│   │   └── card.jsx             # shadcn Card (TO BE DELETED after migration)
│   ├── dashboard/
│   │   ├── KpiCard.jsx          # Shared KPI card (exists, already unified)
│   │   ├── DashboardSkeleton.jsx # NEW: Dashboard skeleton
│   │   └── ...
│   ├── finance/
│   │   ├── TransactionRow.jsx   # EXISTS: needs icon migration + responsive fix
│   │   ├── BudgetCard.jsx       # NEW: extracted from Budgets/Planejamento
│   │   ├── GoalCard.jsx         # NEW: extracted from Goals/Planejamento
│   │   ├── TransactionsSkeleton.jsx # NEW: Transactions skeleton
│   │   └── ...
│   └── reports/
│       └── ReportsSkeleton.jsx  # NEW: Reports skeleton
├── lib/
│   ├── iconMap.js               # NEW: centralized Lucide → Material Symbols mapping
│   └── ...
└── pages/
    ├── Dashboard.jsx            # Padding standardization
    ├── Transactions.jsx         # KPI migration + padding
    ├── Planejamento.jsx         # Decompose into orchestrator
    ├── Budgets.jsx              # Card migration + padding
    ├── Goals.jsx                # Card migration + padding
    ├── CalendarPage.jsx         # Card migration + padding
    ├── Reports.jsx              # Padding + skeleton
    └── Settings.jsx             # Padding
```

### Pattern 1: Icon Migration Pattern

**What:** Replace lucide-react imports with MsIcon + Material Symbols names
**When to use:** Every custom component file that imports from lucide-react
**Example:**
```jsx
// BEFORE (lucide-react)
import { Pencil, Trash2, Copy } from 'lucide-react';
<button><Pencil size={14} /></button>

// AFTER (Material Symbols via MsIcon)
import MsIcon from '@/components/ui/ms-icon';
// OR import { iconMap } from '@/lib/iconMap';
<button><MsIcon name="edit" size={14} /></button>
```
Source: Existing pattern in Layout.jsx, KpiCard.jsx, TransactionRow.jsx (category icons already use MsIcon)

### Pattern 2: Card → Design Token Migration

**What:** Replace shadcn Card/CardContent with divs using design tokens
**When to use:** CalendarPage, Budgets, Goals (the 3 files still importing Card)
**Example:**
```jsx
// BEFORE (shadcn Card)
import { Card, CardContent } from '@/components/ui/card';
<Card><CardContent className="p-4">...</CardContent></Card>

// AFTER (design tokens)
<div className="bg-surface border border-surface-border p-card-padding">
  ...
</div>
```
Source: Existing pattern in Planejamento.jsx budget cards (lines 475-518), KpiCard.jsx

### Pattern 3: Skeleton Loading Pattern

**What:** Show skeleton placeholders when React Query has no cached data
**When to use:** Dashboard, Transactions, Reports pages
**Example:**
```jsx
// Skeleton display logic (D-12)
const { data, isLoading } = useTransactions();

if (isLoading && !data) return <TransactionsSkeleton />;
if (error) return <ErrorState />;
return <ActualContent data={data} />;
```
Source: Existing shimmer CSS in index.css (lines 405-414), shadcn Skeleton component

### Pattern 4: Planejamento Decomposition

**What:** Extract budget card and goal card rendering into shared components
**When to use:** Planejamento.jsx budget section (lines 454-522) and goal section (lines 544-624)
**Example:**
```jsx
// Planejamento becomes thin orchestrator:
<div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
  <div className="lg:col-span-8">
    {monthBudgets.map(b => <BudgetCard key={b.id} budget={b} ... />)}
  </div>
  <div className="lg:col-span-4">
    {goals.map(g => <GoalCard key={g.id} goal={g} ... />)}
  </div>
</div>
```
Source: Existing card rendering in Planejamento.jsx, Budgets.jsx, Goals.jsx

### Anti-Patterns to Avoid

- **Defining MsIcon inline:** TransactionRow.jsx (line 13-14) and Planejamento.jsx (line 23-32) define local MsIcon functions instead of importing from `@/components/ui/ms-icon`. Always import the canonical component.
- **Hardcoded colors in FAB:** FAB.jsx uses `bg-emerald-500` and `bg-red-500` instead of semantic tokens. Use `bg-success` and `bg-danger` or design token equivalents.
- **Modifying shadcn vendor files:** Never edit files in `src/components/ui/` that are shadcn vendor code (accordion, alert-dialog, button, etc.). Decision D-08/D-13.
- **Skeleton flicker:** Don't show skeleton on every refetch -- only when `isLoading && !data` (no cache). Decision D-12.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Icon rendering | Custom icon components per file | `MsIcon` from `@/components/ui/ms-icon.jsx` | Single source of truth, consistent API |
| Skeleton shapes | Custom skeleton divs | shadcn `Skeleton` + `.shimmer` CSS class | Already installed and styled |
| Class merging | Manual className concatenation | `cn()` from `@/lib/utils` | Handles Tailwind conflicts properly |
| Loading states | Custom loading logic | React Query `isLoading` + `!data` pattern | Standard pattern, prevents skeleton flicker |

**Key insight:** This phase is consolidation, not creation. Every solution already exists somewhere in the codebase -- the work is finding duplicates and unifying them.

## Common Pitfalls

### Pitfall 1: MsIcon Duplication
**What goes wrong:** Files define their own local MsIcon function instead of importing the canonical one
**Why it happens:** Copy-paste during rapid development; TransactionRow.jsx and Planejamento.jsx both have local definitions
**How to avoid:** Always import from `@/components/ui/ms-icon`. Grep for `function MsIcon` to find all local definitions.
**Warning signs:** Multiple files with `function MsIcon` or `const MsIcon` definitions

### Pitfall 2: Icon Name Mismatches
**What goes wrong:** Material Symbols icon names don't match Lucide names (e.g., `Pencil` vs `edit`, `Trash2` vs `delete`)
**Why it happens:** Different icon libraries use different naming conventions
**How to avoid:** Create iconMap.js first, then use it as the migration reference. Verify each mapping exists in Material Symbols.
**Warning signs:** Icons showing as empty squares or "X" in the UI

### Pitfall 3: Card Migration Breaking Layout
**What goes wrong:** Replacing Card/CardContent with plain divs loses spacing, borders, or shadows
**Why it happens:** shadcn Card provides default padding (p-6) and border styles that aren't immediately visible
**How to avoid:** Always add `bg-surface border border-surface-border p-card-padding` when replacing Card. Audit each usage individually.
**Warning signs:** Visual regression in CalendarPage, Budgets, Goals

### Pitfall 4: Planejamento Decomposition Breaking State
**What goes wrong:** Extracting BudgetCard/GoalCard loses access to local state (budgetValues, editingGoal, etc.)
**Why it happens:** Planejamento manages modal state and CRUD handlers that the extracted components need
**How to avoid:** BudgetCard/GoalCard should be presentational -- receive data and callbacks as props. Planejamento keeps all state management.
**Warning signs:** Budget editing stops working, goal deposits fail

### Pitfall 5: Skeleton Shimmer Not Animating
**What goes wrong:** Skeleton shows but no shimmer animation
**Why it happens:** The `.shimmer` class requires `--skeleton-base` and `--skeleton-shine` CSS variables to be defined
**How to avoid:** Verify CSS variables exist in index.css before adding shimmer class. Test in both light and dark themes.
**Warning signs:** Static gray blocks instead of animated gradient sweep

## Code Examples

Verified patterns from existing codebase:

### MsIcon Import Pattern
```jsx
// Source: src/components/ui/ms-icon.jsx (canonical)
import MsIcon from '@/components/ui/ms-icon';

// Usage:
<MsIcon name="edit" size={14} />
<MsIcon name="delete" size={14} className="text-danger" />
<MsIcon name="add" size={20} filled />
```

### Design Token Card Pattern
```jsx
// Source: src/components/dashboard/KpiCard.jsx
<div className="bg-surface border border-surface-border p-card-padding relative overflow-hidden">
  <div className={cn("absolute top-0 left-0 right-0 h-[3px]", accentColor)} />
  {/* content */}
</div>
```

### Shimmer Skeleton Pattern
```jsx
// Source: src/components/ui/skeleton.jsx + src/index.css
import { Skeleton } from '@/components/ui/skeleton';

// Add shimmer class for animation:
<Skeleton className="h-[100px] w-full shimmer" />
```

### Responsive Action Buttons Pattern
```jsx
// Source: src/components/finance/TransactionRow.jsx (current, needs icon migration)
<div className="col-span-1 hidden lg:flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button onClick={(e) => { e.stopPropagation(); onDuplicate(t); }}
    className="p-1 hover:bg-surface-container-low rounded text-muted-foreground transition-colors"
    title="Duplicar">
    <MsIcon name="content_copy" size={14} /> {/* was: <Copy size={14} /> */}
  </button>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| lucide-react icons | Material Symbols via MsIcon | Partial (Layout, KpiCard done) | Phase 02 completes migration |
| shadcn Card | Design token divs | Partial (most pages done) | Phase 02 completes for 3 remaining pages |
| Duplicate MsIcon definitions | Single import from ui/ms-icon | In progress | Phase 02 unifies all imports |
| No skeleton loading | Shimmer skeletons | CSS exists, components don't | Phase 02 adds skeleton components |

**Deprecated/outdated:**
- lucide-react: Being fully replaced by Material Symbols. Will be removed from package.json.
- shadcn Card: Being replaced by design-token divs. card.jsx will be deleted.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Material Symbols CDN is already loaded in index.html | Standard Stack | Icons won't render if not loaded -- verify in index.html |
| A2 | All 22 lucide-react files have 1:1 Material Symbols equivalents | Icon Migration | Some icons may need fallback or custom SVG |
| A3 | The `.shimmer` CSS class works with shadcn Skeleton component | Skeleton Loading | May need CSS adjustment if class names conflict |
| A4 | Planejamento.jsx goal card rendering is identical to Goals.jsx | Planejamento Decomposition | May have subtle differences requiring component variants |

## Open Questions

1. **Material Symbols CDN loading**
   - What we know: MsIcon component exists and uses `material-symbols-outlined` class
   - What's unclear: Whether the Material Symbols font is loaded via CDN link in index.html or via npm package
   - Recommendation: Check index.html for `<link>` tag. If missing, add Google Fonts CDN link.

2. **Transactions.jsx KPI implementation**
   - What we know: KpiCard.jsx is the shared component used by Dashboard
   - What's unclear: Whether Transactions.jsx uses KpiCard or has inline KPI divs
   - Recommendation: Audit Transactions.jsx KPI section and migrate to shared KpiCard if needed.

3. **Onboarding modal caching (CONCERN #12)**
   - What we know: OnboardingModal.jsx exists at `src/components/dashboard/OnboardingModal.jsx`
   - What's unclear: Whether it checks localStorage before showing
   - Recommendation: Audit OnboardingModal.jsx for localStorage check pattern.

4. **Exact lucide-react icon count**
   - What we know: 22 custom files import lucide-react (per grep)
   - What's unclear: Total unique icon count across all files
   - Recommendation: Run `grep -oh "import {[^}]*}" src/**/*.jsx` to get full icon list for iconMap.js

## Environment Availability

> This phase has no external dependencies beyond the existing project stack.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build/test | ✓ | (check) | -- |
| npm | Package management | ✓ | (check) | -- |
| Vitest | Testing | ✓ | 4.1.6 | -- |
| Material Symbols CDN | Icon rendering | ASSUMED | -- | Verify in index.html |

**Missing dependencies with no fallback:** None -- all dependencies already installed.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.6 + @testing-library/react 16.3.2 |
| Config file | `vitest.config.js` |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements to Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONCERN #5 | KpiCard used consistently | Visual regression | Manual review | N/A |
| CONCERN #11 | Zero lucide-react in custom code | Grep-based | `grep -r "from 'lucide-react'" src/ --include='*.jsx' --include='*.js' \| grep -v 'src/components/ui/'` | N/A |
| CONCERN #10 | Uniform padding `px-lg py-xl` | Visual regression | Manual review | N/A |
| CONCERN #9 | Skeleton on initial load | Integration | Manual review + React Query cache test | N/A |

### Sampling Rate
- **Per task commit:** `npm test` (existing unit tests)
- **Per wave merge:** `npm run build && npm test`
- **Phase gate:** `npm run build:check` (build + typecheck + lint + test)

### Wave 0 Gaps
- [ ] `src/components/dashboard/DashboardSkeleton.jsx` -- covers CONCERN #9
- [ ] `src/components/finance/TransactionsSkeleton.jsx` -- covers CONCERN #9
- [ ] `src/components/reports/ReportsSkeleton.jsx` -- covers CONCERN #9
- [ ] `src/components/finance/BudgetCard.jsx` -- covers CONCERN #4
- [ ] `src/components/finance/GoalCard.jsx` -- covers CONCERN #4
- [ ] `src/lib/iconMap.js` -- covers CONCERN #11

## Sources

### Primary (HIGH confidence)
- `src/components/ui/ms-icon.jsx` -- MsIcon component API (read directly)
- `src/components/dashboard/KpiCard.jsx` -- KpiCard component API (read directly)
- `src/components/ui/skeleton.jsx` -- Skeleton component API (read directly)
- `src/components/ui/card.jsx` -- Card component API (read directly)
- `tailwind.config.js` -- Design tokens, spacing scale, color tokens (read directly)
- `src/index.css` -- Shimmer CSS animation (read directly)
- `vitest.config.js` -- Test configuration (read directly)
- `package.json` -- All dependency versions (read directly)
- `02-CONTEXT.md` -- All locked decisions D-01 through D-14
- `02-UI-SPEC.md` -- Design contract, spacing scale, typography, color palette

### Secondary (MEDIUM confidence)
- `graphify-out/GRAPH_REPORT.md` -- Cross-file relationships, community structure
- `.planning/ROADMAP.md` -- Phase 2 task breakdown and success criteria

### Tertiary (LOW confidence)
- Material Symbols CDN availability (ASSUMED -- not verified in index.html)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all dependencies verified from package.json and config files
- Architecture: HIGH -- patterns observed directly in existing codebase
- Pitfalls: HIGH -- MsIcon duplication and Card migration patterns observed in code
- Icon migration: MEDIUM -- icon name mappings based on training data, need Material Symbols verification

**Research date:** 2026-05-19
**Valid until:** 2026-06-19 (30 days -- stable phase, no external dependency changes)
