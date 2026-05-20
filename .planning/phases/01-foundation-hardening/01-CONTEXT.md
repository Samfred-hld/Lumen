# Phase 01: Foundation Hardening - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

The app has automated test safety nets, type enforcement, and CI guardrails — any developer can confidently refactor without breaking financial calculations.
</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
All implementation choices are at the agent's discretion — pure infrastructure phase. Use ROADMAP phase goal, success criteria, and existing codebase conventions (Swiss editorial aesthetic, Portuguese-first, Supabase backend) to guide decisions.
</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/financeUtils.js` — Pure functions (filterByMonth, calcTotals, groupByCategory, formatCurrency, getBudgetUsed, getGoalProgress)
- `src/lib/csvParser/csvParser.js` — CSV parser with encoding detection, date parsing, amount parsing, dedup
- `src/lib/categories.js` — Category mapping utilities
- `src/components/ErrorBoundary.jsx` — Existing error boundary (needs reporting wire-up)
- `src/hooks/useData.js` — Supabase React Query hooks (useTransactions, useBudgets, useGoals, useCards)
- `src/lib/store/` — Store layer already on Supabase

### Established Patterns
- State management: TanStack React Query v5 + React Context
- Styling: Tailwind CSS 3 with design tokens (CSS custom properties)
- Auth: Supabase Auth via AuthContext.jsx
- Data access: `supabase.from(table).select/insert/update/delete`
- Build: Vite 6

### Integration Points
- Vitest config should match jsconfig.json path aliases (`@/` → `src/`)
- Tests target Supabase-backed hooks (Phase 0 completed)
- ESLint config at `eslint.config.js` currently ignores `src/lib/**/*`
- `tsconfig.json` replaces `jsconfig.json` with strict mode
</code_context>

<specifics>
## Specific Ideas

No specific requirements — infrastructure phase. Follow ROADMAP task breakdown:
1. Install Vitest + Testing Library
2. Write unit tests for financeUtils.js (≥30 tests, ≥80% coverage)
3. Write unit tests for csvParser.js helpers
4. Enable TypeScript strict mode (tsconfig.json, convert financeUtils.js → .ts, categories.js → .ts)
5. Fix ESLint ignores (remove src/lib/** from ignores, run lint:fix)
6. Add pre-commit hook (bot diff monitoring)
7. Add error boundary reporting ([CRASH] prefix logging)
</specifics>

<deferred>
## Deferred Ideas

None — infrastructure phase.
</deferred>
