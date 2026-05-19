# Code Quality Assessment

**Analysis Date:** 2026-05-19

## Codebase Health Summary

| Metric | Rating | Details |
|--------|--------|---------|
| Architecture clarity | Good | Clean separation: pages → hooks → BaaS. Consistent provider pattern. |
| Code consistency | Mixed | In-progress migrations (icons, card components) create dual patterns in the codebase |
| Test coverage | **Critical** | Zero test files. No test runner configured. No `.test.*` or `.spec.*` files found. |
| File size discipline | Poor | 6 pages >400 lines; CSVImport at 795 lines; csvParser at 669 lines |
| Linting | Incomplete | ESLint ignores `src/lib/**` (all core logic) and `src/components/ui/**` (all base components) |
| Type safety | Partial | TypeScript installed but only used for type checking; source is 100% JS/JSX |
| Documentation | Excellent | DEV_GUIDE.md, design_lumen.md, 7 docs/ files, graph knowledge graph |
| Dependency health | Good | All packages are current, actively maintained, with clear version ranges |

## Technical Debt

### 1. Zero Test Coverage — No Test Framework Configured

- **Issue:** The project has no test runner (no Jest, Vitest, or any testing library in devDependencies), no test files, and no test configuration. All 8 pages, 19 components, and 23 library modules are untested.
- **Files:** All of `src/` — 120+ source files with zero corresponding tests
- **Impact:** Any refactor, dependency upgrade, or new feature risks introducing regressions with no automated safety net. The `DEV_GUIDE.md` checklist has no testing step.
- **Fix approach:** 
  1. Install Vitest (pairs with Vite), `@testing-library/react`, `@testing-library/jest-dom`
  2. Start with unit tests for `src/lib/financeUtils.js` (pure functions: `filterByMonth`, `calcTotals`, `groupByCategory`, `formatCurrency`, `getBudgetUsed`)
  3. Add tests for `src/lib/csvParser.js` (encoding detection, date format detection, amount parsing)
  4. Add integration tests for `useData.js` hooks (mock `base44` SDK)
  5. Add component tests for `KpiCard`, `TransactionRow`, `HeroBalance`
- **Priority:** High

### 2. Design System Migration In Progress (Dual Patterns)

- **Issue:** The codebase is migrating from shadcn `Card`/`CardContent` wrapper components to direct `div` elements with design system tokens. Both patterns coexist, creating inconsistency.
- **Files:** `src/components/ui/card.jsx` (still exists, deprecated); `src/pages/Reports.jsx` (uses `Card`); Dashboard, Transactions, KpiCard (migrated to div patterns)
- **Impact:** New contributors can't determine which pattern to follow. CSS specificity conflicts possible between shadcn card styles and direct design tokens.
- **Fix approach:** Audit all pages/components for `Card`/`CardContent` imports. Replace with divs using `bg-surface border border-surface-border p-card-padding`. Delete `src/components/ui/card.jsx` after all references removed.
- **Priority:** Medium

### 3. Mixed Icon Libraries (Material Symbols + lucide-react)

- **Issue:** Two icon systems coexist: Material Symbols (via `<span>` ligatures or `<MsIcon>` component) and `lucide-react` (React component imports). `DEV_GUIDE.md` mandates Material Symbols but lucide-react is still heavily used.
- **Files:** `src/pages/Dashboard.jsx:3` (imports 12 lucide icons); `src/components/finance/TransactionRow.jsx`; `src/components/dashboard/OnboardingModal.jsx:4`; `src/components/finance/CSVImport.jsx:8`; `src/pages/Reports.jsx:2`
- **Impact:** Two rendering approaches (React component vs ligature span), inconsistent icon sizes, potential style conflicts. Bundle includes entire lucide-react library.
- **Fix approach:** Replace lucide-react imports with `<MsIcon name="..." />` or `<span className="material-symbols-outlined">...</span>`. Map lucide names to Material Symbols equivalents (Pencil → edit, Trash2 → delete, TrendingUp → trending_up, etc.). Remove `lucide-react` from `package.json`.
- **Priority:** Medium

### 4. Store Module Redundancy

- **Issue:** `notificationStore.js` is a compatibility layer that re-exports from `notifications.js` and duplicates `generateBudgetAlerts()` as `generateBudgetNotifications()`. `financeUtils.js` re-exports category constants from `categories.js`. `store.js` is a barrel file re-exporting from 6 submodules — useful but adds indirection.
- **Files:** `src/lib/notificationStore.js:1-7` (compatibility re-export); `src/lib/financeUtils.js:6` (re-exports CAT_COLORS, MONTH_NAMES, etc.)
- **Impact:** Unclear canonical source. `Layout.jsx:7` imports from `notificationStore` while new code should use `notifications` directly per `notificationStore.js:4` comment.
- **Fix approach:** Update `Layout.jsx` to import from `@/lib/notifications` directly. Delete `notificationStore.js`. Keep `store.js` barrel file but remove duplicate re-exports from `financeUtils.js` — have callers import from `categories.js` directly.
- **Priority:** Low

### 5. No TypeScript Source Files Despite TS Tooling

- **Issue:** `typescript` 5.8.2 is installed as devDependency with `tsc` script, `jsconfig.json` for path aliases, and `@types/*` packages — but the entire `src/` directory is `.js`/`.jsx` files (except `src/utils/index.ts` stub). The type checker runs against JS files via JSDoc inference only.
- **Files:** All `src/**/*.jsx`, `src/**/*.js`
- **Impact:** No compile-time type checking on props, function signatures, or API responses. `Array.isArray` guards required defensively throughout because Base44 SDK responses are untyped. Bug-prone refactors.
- **Fix approach:** Incrementally convert mission-critical files to TypeScript: start with `src/lib/financeUtils.js` → `financeUtils.ts`, `src/lib/categories.js` → `categories.ts`, `src/api/base44Client.js` → `base44Client.ts`. Add proper interfaces for Transaction, Budget, Goal, Card entities.
- **Priority:** Medium

### 6. ESLint Ignores Critical Code

- **Issue:** `eslint.config.js` explicitly ignores `src/lib/**/*` and `src/components/ui/**/*` — skipping all business logic, store modules, parsers, and base UI components.
- **Files:** `eslint.config.js:14` (`ignores: ["src/lib/**/*", "src/components/ui/**/*"]`)
- **Impact:** Rules of Hooks violations, unused imports, and other lint issues in `src/lib/` (23 files) and `src/components/ui/` (60+ files) go undetected. The `notificationStore.js` duplication, for example, could have been caught.
- **Fix approach:** Remove the `ignores` entry for `src/lib/**`. Run `npm run lint:fix` and address violations. For `src/components/ui/**`, consider adding with relaxed rules if shadcn component noise is the concern.
- **Priority:** Medium

### 7. Large Monolithic Files

- **Issue:** Multiple source files exceed 400 lines, with CSVImport reaching 855 lines. These files mix multiple concerns: data fetching, filtering, rendering, modal state, drag-and-drop, and progress tracking.
- **Files (largest):**
  - `src/components/finance/CSVImport.jsx` — 795 lines
  - `src/lib/csvParser.js` — 669 lines (6 sub-responsibilities documented in header comments)
  - `src/pages/CalendarPage.jsx` — 635 lines
  - `src/pages/Planejamento.jsx` — 623 lines
  - `src/pages/Reports.jsx` — 608 lines
  - `src/pages/Transactions.jsx` — 580 lines
  - `src/components/ui/sidebar.jsx` — 574 lines
  - `src/components/finance/TransactionModal.jsx` — 481 lines
  - `src/components/finance/TransactionInlineForm.jsx` — 467 lines
  - `src/lib/entitySetup.js` — 460 lines
- **Impact:** Harder to debug, test, and review. Single developer fatigue — these files are difficult to navigate and reason about.
- **Fix approach:** For `CSVImport.jsx`: extract encoding detection into separate hook, extract ColumnMapper rendering, extract progress UI. For pages: extract filter controls, empty states, loading skeletons, and table rendering into sub-components. For `csvParser.js`: split into `csvEncoding.js`, `csvDateParser.js`, `csvAmountParser.js` per its documented responsibilities.
- **Priority:** Medium

## Known Bugs

### MONTH_SHORT Crash in financeUtils.js (Fixed)

- **Symptoms:** `financeUtils.js` tried to access `MONTH_SHORT` from `categories.js` before the import was resolved, causing a runtime crash on certain code paths.
- **Files:** `src/lib/financeUtils.js:7`, `src/lib/categories.js:109-112`
- **Trigger:** Fixed — MONTH_SHORT is now properly imported in `financeUtils.js`.
- **Note:** This bug is documented in the graph knowledge graph (Community 14) and referenced in `DEV_GUIDE.md` as one of the "bugs reais" that informed the development rules.

### Dashboard useMemo Inside Nested Function (Fixed)

- **Symptoms:** `useMemo` was placed inside the `renderSection()` helper function, violating Rules of Hooks. This was caught and fixed by the `base44-builder[bot]` auto-correction system.
- **Files:** `src/pages/Dashboard.jsx`
- **Trigger:** Fixed — `DEV_GUIDE.md` rule #1 documents this as the canonical example of what NOT to do.
- **Note:** This incident drove the creation of the "Rules of Hooks — NUNCA violar" documentation.

## Security Considerations

### Client-Side App Secrets

- **Risk:** `appParams` from `src/lib/app-params.js` exposes Base44 `appId` and `token` to the browser. While this is inherent to the BaaS client-side architecture, the token is visible in browser devtools.
- **Files:** `src/lib/app-params.js`, `src/api/base44Client.js`
- **Current mitigation:** `.env.local` is gitignored; token is set at build time via Vite environment variables. Base44 SDK manages token lifecycle.
- **Recommendations:** Ensure VITE_BASE44 tokens have restrictive CORS policies and minimal scope. Monitor Base44 dashboard for unauthorized access patterns.

### localStorage Data Exposure

- **Risk:** All user financial data cached in localStorage is accessible to any JavaScript running on the same origin. XSS vulnerability would expose transaction history, budget data, and user settings.
- **Files:** `src/lib/store/helpers.js` (getLocal/setLocal), all `store/` modules
- **Current mitigation:** Content Security Policy should be configured (not detected in current config). React's JSX escaping prevents XSS via rendered data.
- **Recommendations:** Add CSP headers. Consider encrypting sensitive localStorage values. Audit all `dangerouslySetInnerHTML` usage (not detected — good).

### No Input Sanitization Beyond Zod

- **Risk:** Transaction descriptions, category names, and CSV-imported data flow directly from user input to Base44 cloud and back to UI rendering. While React escapes JSX output, no server-side sanitization exists.
- **Files:** `src/components/finance/TransactionModal.jsx`, `src/pages/Transactions.jsx`, `src/components/finance/CSVImport.jsx`
- **Current mitigation:** `zod` schemas validate shape but don't sanitize content. `DOMPurify` is in `node_modules` but doesn't appear to be used in source.
- **Recommendations:** Add `DOMPurify.sanitize()` on user-provided text fields before storing.

## Performance Bottlenecks

### Unfiltered useTransactions on Every Page

- **Problem:** `Layout.jsx` calls `useTransactions()` to power the notification center, causing a full 2000-transaction fetch on every page load even when the notification bell is never clicked.
- **Files:** `src/components/Layout.jsx:112` (`const { data: transactions = [] } = useTransactions()`)
- **Cause:** `NotificationCenter` component inside Layout unconditionally subscribes to all transactions and budgets.
- **Improvement path:** Move `useTransactions()` inside `NotificationCenter` with lazy loading — only fetch when the bell is opened. Use a dedicated lightweight endpoint for budget alert computation.

### Monthly Refiltering on Every Render

- **Problem:** `filterByMonth()` is called inside `useMemo` on Dashboard, but `transactions` array reference changes on every `useQuery` data update, triggering re-computation of all derived values (totals, category breakdown, prev month comparison, goal progress, budget usage).
- **Files:** `src/pages/Dashboard.jsx:83-98` (5 useMemo blocks dependent on transactions array)
- **Cause:** No memoization of the transactions array itself. `useQuery` returns a new reference on every fetch.
- **Improvement path:** Consider `useMemo` on the filtered `monthTx` as the primary derived value, and have other computations derive from it. Use `React.useDeferredValue` for non-critical computations.

### CSV Import: 2000 Records Batch Create

- **Problem:** CSV import creates transactions one-by-one via `base44.entities.Transaction.create()` in a `for` loop, with each triggering a subscribe invalidation.
- **Files:** `src/components/finance/CSVImport.jsx` (import loop)
- **Cause:** `pauseSubscribeRef` is used to suppress invalidations during import, but individual `create()` calls are still sequential API requests.
- **Improvement path:** Use batch create endpoint if available in Base44 SDK. Implement concurrent creates with `Promise.all` and configurable concurrency limit.

## Fragile Areas

### csvParser.js — 6 Responsibilities, 669 Lines

- **Files:** `src/lib/csvParser.js`
- **Why fragile:** The file's own header documents 6 distinct responsibilities (encoding detection, CSV parsing, date format detection, transaction type detection, auto-categorization, dedup). A change to any one of these subsystems risks breaking others due to shared internal state and helper functions.
- **Safe modification:** Split into separate modules before modifying: `csvEncoding.js`, `csvDateParser.js`, `csvAmountParser.js`. Each should be independently testable.
- **Test coverage:** None

### Layout.jsx — 5 Embedded Components, 440 Lines

- **Files:** `src/components/Layout.jsx`
- **Why fragile:** Contains `MsIcon`, `AriaAnnouncer`, `ShortcutsModal`, `NotificationCenter`, and `Layout` itself — all in one file. `NotificationCenter` alone is 75 lines of JSX with its own state, effects, and data subscriptions.
- **Safe modification:** Extract `NotificationCenter`, `ShortcutsModal`, and `AriaAnnouncer` into separate files under `src/components/`. They already have clear boundaries.
- **Test coverage:** None

### AuthContext.jsx — Auth State Machine

- **Files:** `src/lib/AuthContext.jsx`
- **Why fragile:** Manages 7 state variables (`user`, `isAuthenticated`, `isLoadingAuth`, `isLoadingPublicSettings`, `authError`, `authChecked`, `appPublicSettings`) with complex async flows for app public settings check, user auth check, and error handling. One of the few places where a bug would take down the entire app.
- **Safe modification:** Add comprehensive error logging. Consider extracting the auth check logic into a custom hook for testability.
- **Test coverage:** None

## Missing Critical Features

### No Offline Mode

- **Problem:** The app requires Base44 connectivity to function. No service worker, no offline-first architecture, no local data mutation queue.
- **Blocks:** Usage without internet connectivity. The app shows a loading spinner or error screen if Base44 is unreachable.
- **Note:** `localStorage` caches exist but are treated as secondary — no offline write-then-sync pattern.

### No Automated Backup/Restore

- **Problem:** User financial data lives only in Base44 cloud and localStorage cache. No export/import of complete financial state (all transactions, budgets, goals, cards, settings).
- **Blocks:** Data portability, disaster recovery, user confidence.
- **Note:** CSV import exists for transactions, but no equivalent for budgets/goals/cards/settings.

### No End-to-End Testing

- **Problem:** No Playwright, Cypress, or any E2E testing framework. Critical user flows (create transaction, import CSV, set budget, achieve goal) have no automated verification.
- **Blocks:** Confident deployments, regression detection, onboarding of new developers.
- **Note:** `DEPLOYMENT.md` or equivalent production readiness document not found.

## Dependencies at Risk

### @hello-pangea/dnd

- **Risk:** Used only for dashboard section reordering. At 17.0.0 it's a mature fork of `react-beautiful-dnd`, but drag-and-drop is a high-churn dependency category. The library adds significant bundle weight for a single feature.
- **Impact:** If abandoned or broken by React 19, dashboard customization breaks. Alternatives exist (native HTML5 drag-and-drop, `@dnd-kit/core`).
- **Migration plan:** Evaluate replacing with native drag-and-drop or lighter library when refactoring Dashboard.

### next-themes

- **Risk:** Theme provider used alongside custom `getTheme()`/`setTheme()` in store. Two theme systems coexist — `next-themes` provides `<ThemeProvider>` context while `store/settings.js` directly manipulates `document.documentElement` class and localStorage.
- **Impact:** Potential race conditions or conflicting theme state if both systems modify `data-theme` or `class` attributes simultaneously.
- **Migration plan:** Choose one system. Either remove `next-themes` and use only the store-based approach (already fully functional), or migrate all theme logic into `next-themes` provider.

### framer-motion 11.16.4

- **Risk:** Large library (150KB+) used sparingly. Only detected usage is in shadcn/ui animated components and possibly sidebar transitions. Tailwind CSS keyframes already handle the defined animation tokens (`fade-in`, `scale-in`, etc.).
- **Impact:** Bundle size bloat. No functional risk.
- **Migration plan:** Audit actual framer-motion usage. If only used for sidebar collapse animation, replace with CSS transition. Remove if unused.

## Code Conventions Observed

### Naming Patterns

**Files:**
- PascalCase for components: `KpiCard.jsx`, `TransactionRow.jsx`, `ErrorBoundary.jsx`
- camelCase for utilities/hooks: `financeUtils.js`, `useData.js`, `csvParser.js`
- `store/` submodules are camelCase: `cards.js`, `settings.js`, `clearAllData.js`

**Functions:**
- camelCase for all functions: `formatCurrency()`, `filterByMonth()`, `getGoalProgress()`
- Hook functions prefixed with `use`: `useTransactions()`, `useMonthNavigation()`
- Internal functions prefixed with `_`: `_autoDeduplicate()`, `_migratedThisSession`

**Variables:**
- camelCase: `monthTx`, `prevMonthData`, `refetchTx`
- PascalCase constants: `NAV_ITEMS`, `DEFAULT_CATEGORIES`, `CAT_COLORS`, `MONTH_NAMES`

**Types:**
- No TypeScript types/interfaces in use. Entity shapes documented in comments in `entitySetup.js:17-26`.

### Code Style

**Formatting:**
- No Prettier config detected. ESLint handles basic formatting only.
- Consistent 2-space indentation throughout.
- Trailing commas in multi-line objects/arrays (consistent).
- Single quotes preferred for strings.

**Linting:**
- ESLint 9 flat config (`eslint.config.js`)
- React plugin with hooks rule enforcement
- Unused import detection (auto-fix available)
- PropTypes disabled (project uses no prop validation)

### Import Organization

**Typical order:**
1. React imports (`import React, { useState } from 'react'`)
2. Third-party libraries (Base44 SDK, react-router-dom, date-fns, lucide-react)
3. Internal path aliases (`@/lib/...`, `@/components/...`, `@/hooks/...`)
4. Relative imports for co-located files (`./TransactionModal`)

**Path Aliases:**
- `@/` → `src/` (universal, used by all imports)

### Module Comments

**Consistent header pattern in lib files:**
```js
// ══════════════════════════════════════════
// LÚMEN — Module Name
// ══════════════════════════════════════════
// Brief description of module responsibilities
```

**Section separators within files:**
```js
// ── Section Name ──
```

### Error Handling

**Pattern:** Defensive coding with `try/catch` wrapping all async operations. Fallbacks to `[]`, `null`, or default values. Errors logged to `console.error` with `[Store]` or `[Lúmen ErrorBoundary]` prefix for grep-ability.

**Specific patterns:**
```js
// Array guard on API responses
const transactions = Array.isArray(rawTransactions) ? rawTransactions : [];

// Safe localStorage reads with defaults
const saved = getDashSections();
return Array.isArray(saved) ? saved : DEFAULT_DASH_SECTIONS;

// Async error suppression (non-critical operations)
_autoDeduplicate().catch(() => {});

// Promise.allSettled for parallel independent operations
await Promise.allSettled([fetchCards(), fetchRules(), fetchTemplates(), ...]);
```

### Function Design

**Size:** Most functions under 30 lines. Notable exceptions: CSV parsing functions (50-100 lines due to algorithmic complexity).

**Parameters:** Positional parameters, no destructured options objects. Hooks receive simple params: `useTransactions(limit, pauseSubscribeRef)`.

**Return Values:** Consistent: hooks return `{ data, isLoading, error }` from React Query. Store functions return plain values or Promises.

### Module Design

**Exports:** Named exports preferred over default exports. `store.js` and `notificationStore.js` use barrel re-export pattern.

**Barrel Files:**
- `src/lib/store.js` — Re-exports from 6 submodules (helpers, cards, rules, templates, settings, dedup, clearAllData)
- `src/lib/notificationStore.js` — Re-exports from `notifications.js` (compatibility layer)
- `src/lib/financeUtils.js` — Re-exports category constants from `categories.js`

---

*Quality analysis: 2026-05-19*
