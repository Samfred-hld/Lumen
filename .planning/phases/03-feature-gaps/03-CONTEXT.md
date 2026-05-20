# Phase 03: Feature Gaps - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can track investments, manage recurring transactions, compare budgets, set bill reminders, search across all entities, configure notifications, and see richer analytics. The app transitions from a transaction tracker to a full personal finance management tool.

</domain>

<decisions>
## Implementation Decisions

### Page Placement (ROADMAP guidance — user confirmed "keep as-is")
- **D-01:** Recurring transactions: standalone page `src/pages/Recurring.jsx` with sidebar nav item
- **D-02:** Budget comparison: "Comparação" tab in Planejamento page
- **D-03:** Notification preferences: tab in Settings page
- **D-04:** Investment tracking: new page `src/pages/Investments.jsx`
- **D-05:** Goal timeline: integrated into existing Goals page (no new page)
- **D-06:** Analytics/insights: new "Insights" section on Dashboard

### Search UX
- **D-07:** Results grouped by category (Transações, Orçamentos, Metas, Cartões, Regras) with up to 3 results per category and "Ver mais" link
- **D-08:** Substring matching (contains) — simple, predictable, works well for Portuguese names
- **D-09:** Keyboard navigation: arrow keys to navigate, Enter to open, Esc to close
- **D-10:** Search triggers after 2 characters with 300ms debounce

### Visualization Approaches
- **D-11:** Budget comparison: table with budgeted vs actual, % used, month-over-month sparklines per category
- **D-12:** Goal timeline: horizontal progress bars with deadline indicators (not Gantt chart — too complex for this phase)
- **D-13:** Analytics: automated insights as card-based section on Dashboard (not a separate page)

### Technical Decisions
- **D-14:** Investment tracking: manual entry only, no API integration. Use existing `Goal` entity's `investmentType` field
- **D-15:** Notification preferences: wire to existing `sendBudgetAlert` and `sendInvoiceReminder` cron functions
- **D-16:** Recurring transactions: CRUD on `FixedTemplate` entity, wire to existing `generateRecurring` cron function

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Prior Phase Context
- `.planning/phases/01-foundation-hardening/01-CONTEXT.md` — Established patterns (React Query, Supabase Auth, design tokens, Tailwind CSS)
- `.planning/phases/02-ui-consolidation/02-CONTEXT.md` — UI patterns (shared components, icon migration, skeleton loading)

### Codebase (no external specs)
No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/dashboard/KpiCard.jsx` — Shared KPI card component (use for investment stats)
- `src/components/finance/BudgetCard.jsx` — Shared budget card (use in comparison view)
- `src/components/finance/GoalCard.jsx` — Shared goal card (use in timeline view)
- `src/components/ui/ms-icon.jsx` — Material Symbols wrapper (use for all new icons)
- `src/lib/financeUtils.js` — Pure utility functions (formatCurrency, calcTotals, etc.)
- `src/lib/iconMap.js` — Centralized icon mappings (Phase 2)

### Established Patterns
- State management: TanStack React Query v5 + React Context
- Styling: Tailwind CSS 3 with design tokens (CSS custom properties)
- Auth: Supabase Auth via AuthContext.jsx
- Data access: `supabase.from(table).select/insert/update/delete`
- Build: Vite 6
- Skeleton loading: shimmer components for Dashboard, Transactions, Reports (Phase 2)

### Integration Points
- `FixedTemplate` entity — existing recurring transaction template (cron uses it, no UI)
- `GlobalSearch.jsx` — existing search component (only searches transactions)
- `Goal` entity — has `investmentType` field (unused in UI)
- `useBudgets()` and `useTransactions()` hooks — available for comparison view
- `sendBudgetAlert` and `sendInvoiceReminder` cron functions — existing notification infrastructure

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

*Phase: 03-Feature Gaps*
*Context gathered: 2026-05-19*
