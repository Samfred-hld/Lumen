# CONCERNS — Risks, Technical Debt & Areas Needing Attention

**Updated:** 2026-05-19 · **Source:** Full codebase exploration + UI-REVIEW.md + DEV_GUIDE.md

---

## 🔴 Critical Risks

### 1. Zero Test Coverage
**No test files exist anywhere in the project.** No unit tests, integration tests, or E2E tests. With ~9,800+ lines of production code, every deployment is a manual verification exercise. The `npm run typecheck` script uses `tsc -p ./jsconfig.json` which is not configured for strict mode.

- **Impact:** Regressions on core financial calculations (balance, budget alerts, health score) go undetected until user reports.
- **Priority:** A single broken `calcTotals()` or `filterByMonth()` is a P0 bug for a financial app.
- **Files at risk:** `src/lib/financeUtils.js` (173 lines, 100% untested), `src/lib/csvParser.js` (763 lines, 100% untested), `src/lib/notifications.js` (168 lines, 100% untested).

### 2. No TypeScript Strict Mode
The project uses `jsconfig.json` instead of `tsconfig.json`. Only 5 cron function files (`base44/functions/*/entry.ts`) are TypeScript. All frontend code is plain JSX/JS. Base44 SDK is typed but the app layer is untyped.

- **Impact:** Runtime-only error detection. Type mismatches in entity schemas (Transaction fields, Budget fields) surface as production bugs.
- **Files:** All 50+ source files under `src/` are `.jsx` or `.js`.

### 3. Automated Bot Commits (`base44-builder[bot]`)
DEV_GUIDE.md line 148: *"O `base44-builder[bot]` pode fazer commits de correção automática — sempre revisar e aprender com eles."* This means the Base44 platform can automatically push code changes to the repo.

- **Impact:** Unreviewed code changes can introduce runtime bugs or override intentional patterns.
- **Priority:** Unknown scope of bot changes — could affect any file.

---

## 🟠 High Technical Debt

### 4. Redundant Pages: Planejamento vs Budgets + Goals
`Planejamento.jsx` (677 lines) reimplements the FULL functionality of both `Budgets.jsx` (292 lines) and `Goals.jsx` (466 lines) in a single unified page. This is ~758 lines of duplicate logic spread across 2 pages.

- **Duplicate schemas:** `goalSchema` defined independently in both `Goals.jsx:21-36` and `Planejamento.jsx:77-83`. `budgetSchema` in `Budgets.jsx:21-27`.
- **Duplicate modals:** `GoalModal` defined in both files with slightly different implementations.
- **Duplicate icon maps:** `CAT_MATERIAL_ICONS` (38 entries) duplicated between `Planejamento.jsx:38-72` and `categories.js`.
- **Navigation confusion:** Sidebar links to `/planejamento` (Planejamento) but notification alerts link to `/budgets` and `/goals` (separate pages).

### 5. KPI Card Inconsistency (Two Implementations)
- **Shared component:** `src/components/dashboard/KpiCard.jsx` (56 lines) — clean, design-system-compliant, with `KPI_STYLES` variant map.
- **Inline implementation:** `Transactions.jsx` uses inline `<div>` KPI cards with hardcoded colors instead of the shared component.
- **UI-REVIEW.md Issue #5 (MEDIUM):** Visual inconsistency between Dashboard and Transactions KPI rows.
- **UI-REVIEW.md Issue #10 (MEDIUM):** `KpiCard` renders all values as `text-on-surface` instead of variant-specific colors (`text-kpi-income`, `text-kpi-expense`).

### 6. FAB Fragmentation (Three Implementations)
- **Shared FAB:** `src/components/ui/fab.jsx` — exists but not consistently used.
- **Layout FAB:** `Layout.jsx` places its own FAB at `bottom-24 right-6` with `bg-primary`.
- **Transactions FAB:** `Transactions.jsx` places another FAB at same position with `bg-inverse-surface`.
- **UI-REVIEW.md Issue #18 (MEDIUM):** Different visibility logic — `md:hidden` in one, `lg:hidden` in another.

### 7. TransactionRow Dual Render Paths
`TransactionRow.jsx:39-112` has two entirely separate render trees for mobile vs desktop:
- Mobile: `lg:hidden` block with simplified layout
- Desktop: `hidden lg:grid` block with full table-row layout

This doubles the DOM weight and means any change to transaction display must be made twice. UI-REVIEW.md Issue #9.

---

## 🟡 Medium Concerns

### 8. Hardcoded Colors Bypassing Design Tokens
`Transactions.jsx:463-479` — Filter pills use hardcoded Tailwind color classes (`bg-emerald-600`, `bg-red-600`, `bg-violet-600`) instead of semantic tokens (`bg-kpi-income`, `bg-kpi-expense`). These won't adapt to theme changes correctly. UI-REVIEW.md Issue #11.

### 9. No Skeleton Loading States
The CSS defines `.shimmer` classes but no component uses them. Between auth completion and data arrival, pages render with zeros/empty states, causing a brief flash of wrong data. UI-REVIEW.md Issue #21.

- **Files affected:** `Dashboard.jsx` (4 concurrent data sources), `Transactions.jsx`, `Reports.jsx`

### 10. Inconsistent Page-Level Padding
- Dashboard: `py-xl mb-md` (tailwind extended tokens)
- Transactions: `p-4 lg:p-6`
- Settings/Others: unspecified pattern
UI-REVIEW.md Issue #14 (MEDIUM).

### 11. Mixed Icon Libraries
Lucide React icons coexist with Material Symbols across the codebase:
- `Dashboard.jsx` imports 16 Lucide icons (lines 3,4) plus uses Material Symbols inline
- `Transactions.jsx` imports 6 Lucide icons
- `Reports.jsx` imports 7 Lucide icons
- DEV_GUIDE.md Rule #4 says "Use Material Symbols, not lucide-react" but enforcement is inconsistent
UI-REVIEW.md Issue #4.

### 12. Onboarding Modal Fires Every Load
`Dashboard.jsx:43-55` checks `isOnboarded()` on every render, fires an 800ms timeout for the modal if not found, then checks cloud. For returning users who completed onboarding, the 800ms delay still runs before cloud check returns. UI-REVIEW.md Issue #19.

### 13. No Error Tracking or Monitoring
All errors go to `console.error()` only. There's no Sentry, no error reporting endpoint, no crash analytics. The `ErrorBoundary.jsx` catches React render errors but does not report them.

### 14. Large Component Files
Four pages exceed 600 lines:
- `Planejamento.jsx` — 677 lines
- `CalendarPage.jsx` — 667 lines
- `Reports.jsx` — 643 lines
- `Transactions.jsx` — 627 lines

AND three more exceed 400 lines:
- `Dashboard.jsx` — 484 lines
- `Goals.jsx` — 466 lines
- `TransactionModal.jsx` — 513 lines

These files contain embedded modals, validation schemas, and helper functions that should be extracted.

### 15. localStorage Schema Without Versioning
The localStorage data has no schema version marker. If the data structure changes (e.g., new field added to cards or transactions), old data is silently incompatible. The `isOnboarded()` check illustrates the problem — no version migration strategy exists.

### 16. CSS Size
`src/index.css` is 941 lines with full design system token definitions. The file has both `:root` and `[data-theme="dark"]` selectors but no minification or token deduplication. Many custom properties are defined but not all are used.

---

## 🟢 Low Concerns

### 17. AI Analysis Card Uses Wrong Color Tokens
`Dashboard.jsx:390-396` — AI analysis card uses `bg-on-primary-fixed` + `text-on-primary` which doesn't adapt to dark mode. UI-REVIEW.md Issue #13.

### 18. Health Score Card Inconsistent Border Width
`Dashboard.jsx:319` — Uses `border-2` (2px) where all other cards use `border` (1px). UI-REVIEW.md Issue #6.

### 19. Search Bar Placeholder Inconsistency
`Layout.jsx:348` — Search placeholder uses ellipsis ("Buscar transações...") but no other placeholder does. UI-REVIEW.md Issue #3.

### 20. Hardcoded Logo
`Layout.jsx:259-264` — Logo uses rectangular `<img>` with `w-14 h-14`. The `design_lumen.md` specifies a 36px hexagonal logo with CSS `clip-path`. UI-REVIEW.md Issue #8.

### 21. Avatar is Always Generic
`Layout.jsx:353-357` — Avatar shows a generic person icon with no user-specific data. No support for profile images from Base44 user metadata. UI-REVIEW.md Issue #20.

### 22. Cross-Month Warning Threshold Too Strict
`Transactions.jsx:421-427` — Warning only shows when `monthTx.length === 0` AND `otherMonthsCount > 0`. A month with just 1 transaction won't trigger the hint even if 100+ exist in other months. UI-REVIEW.md Issue #22.

### 23. "Meta de Economia" Placeholder Card
`Transactions.jsx:444-454` — Shows hardcoded `R$ 0,00` and `0% concluído`. Appears to be a placeholder not wired to real data. UI-REVIEW.md Issue #2.

### 24. Dashboard Label Case Inconsistency
`Dashboard.jsx:275` — "Ver Tudo" uses initial caps while surrounding labels use all-caps. UI-REVIEW.md Issue #1.

### 25. Global Search Limited to Transactions
`src/components/GlobalSearch.jsx` only searches transactions (via `useTransactions(500)`). Does not search budgets, goals, cards, or settings.

---

## Architecture Concerns

### A. Tight Coupling to Base44
The entire data layer depends on `@base44/sdk`. If the Base44 service has an outage, the app has **no offline-first fallback**. React Query cache provides brief resilience (30s staleTime) but not extended offline use.

### B. No Environment Configuration
There is no `.env.example` or `.env.template` file for new developers. The DEV_GUIDE.md mentions `cp .env.example .env.local` but the file does not exist.

### C. PageNotFound Uses Mixed Language
`src/lib/PageNotFound.jsx` — The 404 page is written in English ("Page Not Found", "Ask it to implement it in the chat") while the entire rest of the app is in Brazilian Portuguese. This is a jarring inconsistency for users.

### D. Frontend-Only State Management
All state is managed via React hooks + localStorage + Base44 sync. There's no Zustand, Redux, or Context-based state beyond AuthContext. While this keeps things simple, the transaction modal store (`src/lib/transactionModalStore.js`) is a minimal pub/sub pattern that could benefit from a more robust solution as complexity grows.
