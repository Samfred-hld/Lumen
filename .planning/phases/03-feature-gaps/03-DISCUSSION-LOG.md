# Phase 03: Feature Gaps - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 03-feature-gaps
**Areas discussed:** Search UX (page placement confirmed as ROADMAP guidance)

---

## Page Placement

### User input

**User's choice:** "A localização deve permanecer da forma que está" (keep as-is per ROADMAP)

**Notes:** No discussion needed — ROADMAP guidance is authoritative for:
- Recurring transactions: standalone page
- Budget comparison: Planejamento tab
- Notification preferences: Settings tab
- Investment tracking: new page
- Goal timeline: integrated into Goals page
- Analytics: Dashboard section

---

## Search UX

### Q1: How to organize search results

| Option | Description | Selected |
|--------|-------------|----------|
| Grouped by category | Show categories (Transactions, Budgets, Goals, etc.) with up to 3 results each. User can click "Ver mais" for more. | ✓ |
| Single mixed list | All results in one list sorted by relevance. Simpler but confusing with different types. | |
| Tabs by category | Tabs at top (Transactions | Budgets | Goals | ...) that user can click to filter. More control but more clicks. | |

**User's choice:** Grouped by category (Recommended)
**Notes:** None

### Q2: Text matching type

| Option | Description | Selected |
|--------|-------------|----------|
| Substring (contains) | Match by substring. Simple, predictable. 'alug' finds 'Aluguel'. Works well for Portuguese names. | ✓ |
| Approximate (fuzzy) | Fuzzy matching. 'alguel' finds 'Aluguel'. More tolerant but may return unexpected results. | |
| Hybrid | Combines substring for names and fuzzy for typos. More complex but better experience. | |

**User's choice:** Substring (Recommended)
**Notes:** None

### Q3: Keyboard navigation

| Option | Description | Selected |
|--------|-------------|----------|
| Arrows + Enter + Esc | Arrow keys to navigate results, Enter to open, Esc to close. Accessibility standard, expected by power users. | ✓ |
| Click/tap only | Only mouse/touch interaction. Simpler but less accessible. | |
| Claude decides | Agent discretion. | |

**User's choice:** Arrows + Enter + Esc (Recommended)
**Notes:** None

### Q4: Search trigger timing

| Option | Description | Selected |
|--------|-------------|----------|
| 2 chars + 300ms debounce | Start searching after 2 characters with 300ms debounce. Fast response, doesn't overload database. | ✓ |
| 3 chars + 300ms debounce | Start searching after 3 characters. Fewer requests but less responsive for short terms. | |
| Claude decides | Agent discretion. | |

**User's choice:** 2 chars + 300ms debounce (Recommended)
**Notes:** None

---

## Deferred Ideas

None — all discussion areas stayed within Phase 3 scope.
