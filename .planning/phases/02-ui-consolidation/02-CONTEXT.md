# Phase 02: UI Consolidation - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

The app achieves visual consistency across all 8 pages — unified icon library, shared components, consistent padding, skeleton loading states, and zero design system duplication. The Swiss editorial aesthetic is applied uniformly without fragmentation.

</domain>

<decisions>
## Implementation Decisions

### TransactionRow + Padding
- **D-01:** Collapse dual mobile/desktop TransactionRow into a single responsive path using Tailwind responsive classes (hidden/block, md:). Single source of truth, no dual render paths.
- **D-02:** Keep swipe-to-delete behavior mobile-only. Desktop uses visible action buttons (edit, delete, duplicate). Mobile uses swipe + tap for interactions.
- **D-03:** Uniform `px-lg py-xl` padding across all 8 pages. No page-type variants — consistent spacing everywhere.
- **D-04:** TransactionRow action buttons: visible on desktop (md:), hidden on mobile where swipe handles delete and tap opens detail/edit.

### Icon Migration
- **D-05:** Full migration from lucide-react to Material Symbols across all 43 files. Zero lucide-react imports in custom code (shadcn/ui vendor components left untouched).
- **D-06:** Use the existing `MsIcon` component (`src/components/ui/ms-icon.jsx`) as the wrapper for all Material Symbols icons.
- **D-07:** Create a centralized mapping file (`src/lib/iconMap.js`) documenting every Lucide → Material Symbols replacement. Single source of truth for auditing.
- **D-08:** shadcn/ui internal lucide-react imports are left untouched — they're vendor code. Only custom components (pages, finance, dashboard, settings) are migrated.

### Skeleton Loading
- **D-09:** Skeleton loading on Dashboard, Transactions, and Reports pages only (the three heaviest pages).
- **D-10:** Shimmer gradient animation (smooth left-to-right gradient sweep). Subtle, elegant, matches Swiss editorial aesthetic.
- **D-11:** High-fidelity skeletons — each Dashboard section shows blocks that mimic the real layout (card shape for KPIs, circle for avatars, bars for charts). Transactions and Reports get section-appropriate shapes.
- **D-12:** Skeletons shown only on initial page load (when React Query has no cache). Subsequent refetches use cached data and update silently — no skeleton flicker.

### Claude's Discretion
- **D-13:** shadcn/ui icon handling: leave vendor components untouched, migrate only custom code. Rationale: modifying vendor code creates maintenance burden when updating shadcn/ui.
- **D-14:** Planejamento follows ROADMAP guidance — becomes thin layout orchestrator delegating to shared BudgetCard/GoalCard components. No redirect, no removal.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `.planning/ROADMAP.md` §Phase 2 — Full task breakdown, success criteria, and acceptance thresholds for UI Consolidation

### Prior Phase Context
- `.planning/phases/01-foundation-hardening/01-CONTEXT.md` — Established patterns (React Query, Supabase Auth, design tokens, Tailwind CSS)

### Codebase (no external specs)
No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/ui/ms-icon.jsx` — Material Symbols wrapper component (already exists, use for all icon rendering)
- `src/components/ui/fab.jsx` — Single FAB implementation (already unified, no consolidation needed)
- `src/components/dashboard/KpiCard.jsx` — Shared KPI card component (already used by Dashboard and Transactions)
- `src/components/ui/skeleton.jsx` — shadcn Skeleton component (already installed, use as base for shimmer)
- `src/lib/financeUtils.js` — Pure utility functions (formatCurrency, calcTotals, etc.)
- `src/components/ui/card.jsx` — shadcn Card component (still used by Budgets, Goals, CalendarPage — migrate away)
- `src/components/finance/TransactionRow.jsx` — Current dual-path implementation to refactor

### Established Patterns
- State management: TanStack React Query v5 + React Context
- Styling: Tailwind CSS 3 with design tokens (CSS custom properties)
- Auth: Supabase Auth via AuthContext.jsx
- Data access: `supabase.from(table).select/insert/update/delete`
- Build: Vite 6

### Integration Points
- All 8 page files (`src/pages/*.jsx`) need padding standardization
- 43 files import lucide-react — need systematic replacement
- 3 files import shadcn Card — need migration to design tokens
- Layout.jsx uses FAB — already consolidated
- Planejamento.jsx (674 lines) needs decomposition into shared components

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. User confirmed all recommended options.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-UI Consolidation*
*Context gathered: 2026-05-19*
