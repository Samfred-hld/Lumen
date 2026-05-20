---
phase: 03-feature-gaps
plan: 01
subsystem: search-and-goals
tags: [search, goals, timeline, ux]
depends_on:
  requires: []
  provides: [multi-entity-search, goal-timeline]
  affects: [src/components/GlobalSearch.jsx, src/pages/Goals.jsx]
tech_stack:
  added: []
  patterns: [grouped-search, debounced-input, timeline-visualization]
key_files:
  created: []
  modified:
    - src/components/GlobalSearch.jsx
    - src/pages/Goals.jsx
decisions:
  - "Used getRules() from store (localStorage-backed) instead of useQuery hook for rules — rules are synced to localStorage by fetchRules()"
  - "Implemented GoalTimeline as inline component in Goals.jsx rather than separate file — keeps related logic co-located"
  - "Used flat index across all groups for keyboard navigation — simpler than nested group+item indices"
metrics:
  duration: 146s
  completed: "2026-05-20T04:18:00Z"
  tasks: 2
  files: 2
---

# Phase 03 Plan 01: Multi-Entity Search + Goal Timeline Summary

**One-liner:** Expanded global search to 5 entity types with grouped results and added deadline-aware goal timeline visualization.

## What Was Built

### Task 1: Multi-Entity GlobalSearch (`212dbb9`)

Rewrote `GlobalSearch.jsx` from a transactions-only search to a multi-entity grouped search covering:

- **Transactions:** match on description, category, notes
- **Budgets:** match on category
- **Goals:** match on name, description, icon
- **Cards:** match on name, brand
- **Rules:** match on keyword, category

Key implementation details:
- Imports `useBudgets`, `useGoals`, `useCards` from `@/hooks/useData` and `getRules` from `@/lib/store/rules`
- 300ms debounce with 2-character minimum trigger (D-10)
- Results grouped by entity type with headers: Transações, Orçamentos, Metas, Cartões, Regras
- Up to 3 results per group (D-07) with overflow count indicator
- Keyboard navigation (ArrowUp/Down/Enter/Esc) across flat index of all visible results (D-09)
- Entity-specific navigation: transactions go to `/transactions`, budgets to `/planejamento`, goals to `/goals`, cards/rules to `/settings`
- Placeholder updated from "Buscar transações..." to "Buscar..."

### Task 2: Goal Timeline (`fd89db4`)

Added a `GoalTimeline` component to `Goals.jsx` with horizontal progress bars and deadline awareness (D-05/D-12):

- Calculates goal status: overdue, at-risk (<=30 days, <50% progress), on-track, completed, no-deadline
- Horizontal progress bar per goal with width = progress %, color = goal.color
- Color-coded left borders: red (overdue), amber (at-risk), blue (on-track), green (completed), gray (no-deadline)
- Status badges: Concluído, No prazo, Atenção, Vencido, Sem prazo
- Deadline text: "vence em X dias" or "vencido há X dias"
- Sorted by severity: overdue first, no-deadline last
- Section header "Cronograma das Metas" placed after the goal cards grid
- Hint text "Defina prazos nas metas para visualizar o cronograma" when no goals have deadlines

## Verification Results

| Check | Result |
|-------|--------|
| GlobalSearch imports useBudgets, useGoals, useCards, getRules | 6 matches found |
| Search groups by 5 entity types | Confirmed |
| 300ms debounce with 2-char minimum | Confirmed |
| Keyboard navigation across groups | Confirmed |
| GoalTimeline component exists | Confirmed |
| Status badges with correct colors | Confirmed |
| Deadline sorting (overdue first) | Confirmed |
| Hint for goals without deadlines | Confirmed |
| Braces/parens balanced (GlobalSearch) | 147/147, 171/171 |
| Braces/parens balanced (Goals) | 179/179, 200/200 |
| No file deletions | Confirmed |

## Decisions Made

1. **Rules data source:** Used `getRules()` from `@/lib/store/rules` (localStorage-backed) instead of creating a `useRules` hook. Rules are synced to localStorage by the existing `fetchRules()` function, so a synchronous read is appropriate for search.

2. **Timeline as inline component:** Implemented `GoalTimeline` as a component defined directly in `Goals.jsx` rather than extracting to a separate file. The component is only used on the Goals page and shares `getGoalProgress` / `formatCurrency` imports already present.

3. **Flat keyboard navigation:** Used a single flat index across all visible results rather than nested group+item indices. Simpler implementation, and the number of visible results (max 15 = 5 groups x 3) is small enough that flat navigation is natural.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all data sources are wired (transactions, budgets, goals, cards, rules all fetched from Supabase or localStorage).

## Threat Flags

None - no new network endpoints, auth paths, or trust boundary changes introduced.

## Self-Check: PASSED

- FOUND: src/components/GlobalSearch.jsx
- FOUND: src/pages/Goals.jsx
- FOUND: .planning/phases/03-feature-gaps/03-01-SUMMARY.md
- FOUND: 212dbb9
- FOUND: fd89db4
