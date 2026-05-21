# ROADMAP — Lúmen Gestão Financeira

**Created:** 2026-05-19 · **Updated:** 2026-05-19 · **Mode:** yolo · **Depth:** quick · **Parallelization:** true
**Repo:** https://github.com/Samfred-hld/Lumen.git
**Supabase:** `chjndtzrljiywzynrgrb`

---

## Current State Summary

Lúmen is a **production financial management app** for Brazilian users with:

| Metric | Value |
|--------|-------|
| Pages live | 8 (Dashboard, Transactions, Planejamento, Budgets, Goals, Calendar, Reports, Settings) |
| Source files | ~120+ |
| Lines of code | ~9,800 |
| Stack | React 18 + Vite 6 + Tailwind CSS 3 + Base44 BaaS |
| State management | TanStack React Query v5 + React Context + localStorage |
| Backend | 5 Base44 cron functions (serverless) |
| Design system | Fully tokenized (CSS custom properties + Tailwind), Swiss editorial aesthetic |
| UI Review score | 19/24 — strong editorial foundation, needs consolidation |
| Test coverage | **Zero** — no test runner, no test files |
| Type safety | TypeScript installed but 100% JS/JSX source files |

### What's working well
- Real-time cloud sync via Base44 subscriptions
- Robust CSV import (6 Brazilian bank formats, encoding detection, auto-categorization)
- Keyboard accessibility (global shortcuts, ARIA announcer, focus rings)
- Undo pattern for destructive actions
- Dark/light theme fully tokenized
- `prefers-reduced-motion` support
- Defensive data validation throughout (Array.isArray guards, null checks)

### What needs attention
- **Zero test coverage** — any refactor risks financial calculation regressions
- **Design system migration in progress** — dual patterns (shadcn Card vs design tokens) create inconsistency
- **Mixed icon libraries** — Lucide React + Material Symbols coexist
- **Redundant pages** — Planejamento duplicates Budgets + Goals entirely
- **KPI Card fragmentation** — two implementations (shared component vs inline divs)
- **FAB fragmentation** — three different FAB implementations
- **No error tracking** — all errors go to `console.error()` only
- **Large monolithic files** — 4 pages exceed 600 lines each

---

## Phases

- [x] **Phase 0: Base44 → Supabase Migration** — Replace Base44 BaaS with Supabase (auth, database, real-time, edge functions)
- [x] **Phase 1: Foundation Hardening** — Tests, TypeScript strict mode, linting, CI safeguards, monitoring
- [ ] **Phase 2: UI Consolidation** — Unify design system, consolidate duplicated components, fix UI-REVIEW issues
- [ ] **Phase 3: Feature Gaps** — Investment tracking, recurring transactions UI, budget comparison, search, notifications
- [x] **Phase 4: Polish & Platform** — PWA, offline-first, user profile, analytics, remaining gaps

---

## Phase Details

### Phase 0: Base44 → Supabase Migration 🔴 PRIORITY
**Goal:** The app runs on Supabase (auth, PostgreSQL, Realtime, Edge Functions) instead of Base44. Frontend deployed on Vercel. Zero Base44 dependencies remain in the codebase. No user data lost.

**Depends on:** Nothing (current production state — Base44 still active during migration)

**Context Brief:**
Base44 is a proprietary BaaS with lock-in risk and no self-host option. Supabase is open-source, has a generous free tier (500MB DB, 50K MAU, 2GB bandwidth), PostgreSQL direct access, and a mature OSS ecosystem. This migration preserves the same architectural pattern (BaaS → BaaS) — the app keeps using React Query + real-time subscriptions, just with a different provider. The migration is reversible until Base44 app is decommissioned.

**Why now:** Phase 1 (Testing) and Phase 2 (UI Consolidation) are tedious refactors that will touch nearly every file. Doing them AFTER the Supabase migration means we'd need to re-test and re-consolidate. Doing the migration first means tests and types can be written against Supabase from the start.

**Tasks (9):**

1. **Install Supabase SDK & remove Base44 SDK** — Add `@supabase/supabase-js` to `package.json`. Remove `@base44/sdk` and `@base44/vite-plugin`. Update `vite.config.js` to remove the Base44 plugin. Create `src/api/supabaseClient.js` with Supabase client initialization (`createClient(url, anonKey)` from env vars).

2. **Create PostgreSQL schema (8 entities → tables)** — Create all SQL migration scripts mapping Base44 entities to Supabase tables:
   - `transactions` — 19 fields (same as Base44 Transaction entity)
   - `budgets` — category, limit, month, isRecurring
   - `goals` — name, targetValue, currentValue, progressMode, deadline, color, description, investmentType
   - `cards` — name, color, limit, closingDay, dueDay, brand
   - `rules` — keyword, category
   - `templates` — description, value, category, paymentMethod, type
   - `user_configs` — key, value
   - `settings` — key, value
   Add Row Level Security (RLS) policies: users can only access their own data (`auth.uid() = user_id`). Add `user_id` column to all tables.

3. **Migrate authentication (Base44 Auth → Supabase Auth)** — Replace `AuthContext.jsx` to use Supabase Auth:
   - `base44.auth.me()` → `supabase.auth.getUser()`
   - `base44.auth.logout()` → `supabase.auth.signOut()`
   - `base44.auth.redirectToLogin()` → `supabase.auth.signInWithOAuth()` or custom login page
   - Remove `createAxiosClient` calls for app-level auth checks
   - Add login/signup page (Supabase Auth UI or custom React components)
   - Wire email verification and password reset flows via Supabase

4. **Rewrite data hooks (useData.js) for Supabase** — Replace Base64 entity CRUD with Supabase queries:
   - `base44.entities.Transaction.list('-date', limit)` → `supabase.from('transactions').select('*').order('date', { ascending: false }).limit(limit)`
   - `base44.entities.Transaction.filter({...})` → `.select('*').gte('date', ...).lte('date', ...)`
   - `base44.entities.Transaction.create(data)` → `.insert(data).select().single()`
   - `base44.entities.Transaction.update(id, data)` → `.update(data).eq('id', id).select().single()`
   - `base44.entities.Transaction.delete(id)` → `.delete().eq('id', id)`
   - Repeat for Budget, Goal, Card, Rule, Template, Setting, UserConfig

5. **Implement real-time subscriptions (Supabase Realtime)** — Replace Base44 subscribe pattern:
   - `base44.entities.Transaction.subscribe(callback)` → `supabase.channel('transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, callback).subscribe()`
   - Create a custom hook `useSupabaseRealtime(table, queryKey)` that handles channel lifecycle and React Query invalidation

6. **Replace store layer (store.js) for Supabase** — Rewrite `src/lib/store.js` barrel and all `src/lib/store/*` modules:
   - `src/lib/store/helpers.js` — Update prefix logic, add Supabase client access
   - `src/lib/store/cards.js` — Replace `base44.entities.Card` with Supabase queries
   - `src/lib/store/rules.js` — Replace `base44.entities.Rule` with Supabase queries
   - `src/lib/store/templates.js` — Replace `base44.entities.Template` with Supabase queries
   - `src/lib/store/settings.js` — Replace `base44.entities.Setting/UserConfig` with Supabase queries
   - Remove localStorage fallback pattern (Supabase is always available with offline queue)
   - Remove `Promise.allSettled` pattern — use single Supabase query with joins

7. **Migrate cron functions to Supabase Edge Functions** — Convert the 5 Base44 cron functions (`base44/functions/`) to Supabase Edge Functions:
   - `generateRecurring` → `supabase/functions/generate-recurring/index.ts` — Deno runtime, pg_cron trigger
   - `generateSalary` → `supabase/functions/generate-salary/index.ts`
   - `generateRecurringBudgets` → `supabase/functions/generate-recurring-budgets/index.ts`
   - `sendBudgetAlert` → `supabase/functions/send-budget-alert/index.ts` (use Resend or Supabase email)
   - `sendInvoiceReminder` → `supabase/functions/send-invoice-reminder/index.ts`
   - Configure cron schedules via `supabase/functions/*/index.ts` with `pg_cron` extension

8. **Create data migration script** — Build a migration tool that:
   - Exports all user data from Base44 via SDK (all 8 entities)
   - Transforms data to Supabase table schema (add `user_id`, normalize field names)
   - Imports into Supabase tables using upsert with conflict resolution
   - Validates row counts match between Base44 and Supabase
   - Runs as a one-shot script (`scripts/migrate-base44-to-supabase.js`)

9. **Configure Vercel deployment** — Set up production and preview deployments:
   - Create `vercel.json` with SPA rewrite rules
   - Add environment variables to Vercel: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
   - Remove `VITE_BASE44_*` env vars
   - Configure deploy previews for branches
   - Verify build passes (`npm run build` produces correct `dist/` with Supabase client)

**Concerns addressed:** CONCERN A (Tight coupling to Base44), CONCERN B (No .env.example)
**Gaps addressed:** GAPS #15 (Deployment configuration), GAPS #12 (Offline-first — partial, foundation for Phase 4)
**Requirements:** Total independence from Base44 · All 8 entities operational on PostgreSQL · Auth working with Supabase · Real-time subscriptions functional · Cron functions running on edge

**Success Criteria** (what must be TRUE):
1. `npm run build` succeeds with zero Base44 imports — `rg "@base44" src/` returns empty
2. All 8 entity tables exist in Supabase with RLS policies; `user_id` column present on each
3. Users can sign up, log in, and reset password via Supabase Auth — `AuthContext.jsx` uses Supabase exclusively
4. All 4 data hooks (`useTransactions`, `useBudgets`, `useGoals`, `useCards`) return live data from Supabase
5. Real-time subscriptions work: adding a transaction in one tab updates all other tabs in <3s
6. `generateRecurring` edge function runs on schedule and creates recurring transactions for all users
7. `scripts/migrate-base44-to-supabase.js` completes with 100% row count match for all entities
8. App deploys to Vercel and is accessible at a public URL with Supabase backend

**Plans:** 9 (TBD)
**UI hint:** minimal — login/signup page only

---

### Phase 1: Foundation Hardening
**Goal:** The app has automated test safety nets, type enforcement, and CI guardrails — any developer can confidently refactor without breaking financial calculations.

**Depends on:** Phase 0 (Supabase migration completes — tests target Supabase, not Base44)

**Context Brief:**
This phase addresses the highest-risk technical debt. The app is in production with zero automated tests and no type safety. Every deployment is a manual verification exercise. A single broken `calcTotals()` or `filterByMonth()` is a P0 bug for a financial app. Additionally, the Base44 `base44-builder[bot]` can auto-commit changes to the repo without review — we need visibility into what it changes.

**Tasks (7):**

1. **Install Vitest + Testing Library** — Add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to devDependencies. Configure `vitest.config.js` with path aliases matching `jsconfig.json`.

2. **Write unit tests for financeUtils.js** — Pure functions are the highest-value test target: `filterByMonth()`, `calcTotals()`, `groupByCategory()`, `formatCurrency()`, `getBudgetUsed()`, `getGoalProgress()`. These power every page.

3. **Write unit tests for csvParser.js helpers** — Extract and test encoding detection, date format parsing, amount parsing, dedup logic. The parser has 6 documented responsibilities — each needs independent verification.

4. **Enable TypeScript strict mode on frontend** — Create `tsconfig.json` (strict mode) replacing `jsconfig.json`. Add JSDoc types to all `useData` hooks and store functions. Begin converting `src/lib/financeUtils.js` → `financeUtils.ts`, `src/lib/categories.js` → `categories.ts`.

5. **Fix ESLint ignores** — Remove `src/lib/**/*` from `eslint.config.js` ignores. Run `npm run lint:fix`. Address any Rules of Hooks violations found. Keep `src/components/ui/**` ignored (shadcn noise).

6. **Add pre-commit hook for base44-builder monitoring** — Create a `.husky/pre-commit` hook or equivalent that logs the bot's last commit metadata. Add a script `npm run bot:diff` that shows what the bot last changed. Optional: add `npm run bot:review` that blocks the bot from pushing unreviewed changes (via branch protection).

7. **Add error boundary reporting** — Wire `ErrorBoundary.jsx` to capture crashes to a simple endpoint or at minimum log structured JSON to console with a `[CRASH]` prefix + stack trace for grep-ability. Add `Sentry.init()` if budget allows, otherwise a lightweight `window.onerror` logger.

**Concerns addressed:** CONCERN #1 (Zero test coverage), CONCERN #2 (No TS strict mode), CONCERN #3 (Bot commits), CONCERN #13 (No error tracking)

**Gaps addressed:** GAPS T1 (No linting in CI), GAPS T2 (Bundle size monitoring — partial), GAPS T3 (Dependency audit), GAPS T4 (Environment variables)

**Requirements:** CONCERN #1, #2, #3, #13 · GAPS T1, T2, T3, T4
**Success Criteria** (what must be TRUE):
1. Running `npm test` executes ≥30 unit tests covering all pure functions in `financeUtils.js` and `csvParser.js` with ≥80% line coverage on those modules
2. TypeScript `tsc --noEmit` passes with strict mode enabled — zero type errors on converted modules
3. ESLint runs against `src/lib/**` — all Rules of Hooks violations resolved (zero `react-hooks/*` errors)
4. Error boundary captures crash metadata (component name, error message, stack trace) and logs it in structured format
5. Bot commit activity is visible via `npm run bot:diff` — developer can inspect what changed since last review

**Plans:** 4 plans

Plans:
- [ ] 01-01-PLAN.md — Install Vitest + Testing Library, write ≥30 unit tests for financeUtils.js
- [ ] 01-02-PLAN.md — Write unit tests for csvParser.js helpers (encoding, parsing, date/amount normalization)
- [ ] 01-03-PLAN.md — Enable TypeScript strict mode, convert financeUtils + categories to .ts, fix ESLint coverage
- [ ] 01-04-PLAN.md — CI guardrails (bot:diff, audit, build:check) and error boundary [CRASH] logging

---

### Phase 2: UI Consolidation
**Goal:** Every page uses the shared design system consistently — no duplicated components, no hardcoded colors, no mixed icon libraries. The UI Review score moves from 19/24 to 22/24.

**Depends on:** Phase 1 (tests and types prevent regressions during refactoring)

**Context Brief:**
The codebase has accumulated fragmentation during rapid feature development. Three different FAB implementations exist. KPI cards are rendered differently on Dashboard vs Transactions. Planejamento.jsx (677 lines) completely duplicates Budgets + Goals logic. The design system migration from shadcn `Card` to design tokens is mid-flight — both patterns coexist. This phase consolidates, standardizes, and eliminates duplication.

**Tasks (7):**

1. **Unify KPI card rendering** — Refactor `Transactions.jsx` KPI row to use the shared `KpiCard` component. Restore variant-specific value colors in `KpiCard.jsx` (income = forest-green `#1A5C3A`, expense = deep-crimson `#991B1B`). Replace hardcoded Tailwind colors in Transactions filter pills with semantic tokens (`bg-kpi-income`, `bg-kpi-expense`).

2. **Unify FAB into single shared component** — Consolidate Layout FAB, Transactions FAB, and `src/components/ui/fab.jsx` into one canonical FAB. Standardize visibility logic: `md:hidden` only. Standardize positioning: `bottom-24 right-6`. Standardize styling: `bg-primary`.

3. **Collapse Planejamento duplication** — Make Planejamento.jsx delegate to shared `BudgetCard` and `GoalCard` components (extracted from Budgets.jsx and Goals.jsx). Move duplicated schemas (`goalSchema`, `budgetSchema`) and icon maps (`CAT_MATERIAL_ICONS`) into a single canonical location. Planejamento becomes a thin layout orchestrator.

4. **Complete shadcn Card migration** — Audit all 8 pages + 19 components for remaining `Card`/`CardContent` imports. Replace with divs using design tokens (`bg-surface border border-surface-border p-card-padding`). Delete `src/components/ui/card.jsx` after last reference removed.

5. **Consolidate icon library** — Replace remaining Lucide React imports with Material Symbols equivalents. Map: `Pencil` → `edit`, `Trash2` → `delete`, `TrendingUp` → `trending_up`, `Copy` → `content_copy`, `Plus` → `add`, etc. Remove `lucide-react` from `package.json` after all references gone. Keep only action-specific Lucide icons if Material Symbols doesn't have a direct equivalent.

6. **Standardize page-level padding and TransactionRow** — Apply uniform padding convention (`px-lg py-xl`) to all pages. Collapse TransactionRow.jsx dual mobile/desktop render paths into a single responsive path using Tailwind responsive classes.

7. **Add skeleton loading states** — Wire `isLoading` from React Query hooks into skeleton components using the existing `.shimmer` classes in CSS. Add `<DashboardSkeleton />`, `<TransactionsSkeleton />`, `<ReportsSkeleton />` with correct layout shape. Cache onboarding state locally to eliminate the 800ms check on every load.

**Concerns addressed:** CONCERN #4 (Planejamento redundancy), CONCERN #5 (KPI Card inconsistency), CONCERN #6 (FAB fragmentation), CONCERN #7 (TransactionRow dual render), CONCERN #8 (Hardcoded colors), CONCERN #9 (No skeletons), CONCERN #10 (Inconsistent padding), CONCERN #11 (Mixed icons), CONCERN #12 (Onboarding re-check)

**Gaps addressed:** GAPS N1 (Budgets not in nav — preserved routing), GAPS N2 (Goals not in nav — preserved routing)

**Requirements:** CONCERN #4, #5, #6, #7, #8, #9, #10, #11, #12 · UI-REVIEW fixes #1-22
**Success Criteria** (what must be TRUE):
1. Dashboard and Transactions pages render KPI cards identically — same component, same variant colors, same accent bar pattern
2. Exactly one FAB component exists in the codebase; all pages use it; visibility logic is consistent (`md:hidden`)
3. Planejamento.jsx is reduced to ≤150 lines as a thin layout orchestrator delegating to shared components
4. Zero `Card`/`CardContent` imports remain in any page or component file
5. Zero `lucide-react` imports remain in the codebase (or at most 2-3 action icons with no Material Symbols equivalent)
6. All 8 pages render with uniform padding (`px-lg py-xl`); TransactionRow uses a single responsive render path
7. Between auth completion and data arrival, skeleton placeholders display instead of zero-value flashes

**Plans:** 5 plans

Plans:
- [x] 02-01-PLAN.md — Icon migration: create iconMap.js + migrate 22 custom files from lucide-react to MsIcon
- [x] 02-02-PLAN.md — FAB consolidation + TransactionRow responsive fix + hardcoded color cleanup
- [x] 02-03-PLAN.md — BudgetCard + GoalCard extraction + shadcn Card migration
- [x] 02-04-PLAN.md — Planejamento decomposition + page padding standardization + KPI consistency
- [x] 02-05-PLAN.md — Skeleton loading states + OnboardingModal caching fix
**UI hint:** yes

---

### Phase 3: Feature Gaps
**Goal:** Users can track investments, manage recurring transactions, compare budgets, set bill reminders, search across all entities, configure notifications, and see richer analytics.

**Depends on:** Phase 2 (consolidated codebase enables safe feature addition)

**Context Brief:**
Several P0/P1 features are missing that limit the app's value. Users cannot manage recurring transactions (the cron function creates them but there's no UI). Budgets have no comparison view. The global search only scans transactions. No notification preferences exist. The `Goal` entity has an `investmentType` field that is unused in the UI — investment tracking is just a category label. Phase 3 closes these gaps.

**Tasks (7):**

1. **Recurring transactions management UI** — Create `src/pages/Recurring.jsx` or a tab in Settings that lists `FixedTemplate` entities. CRUD operations: view scheduled recurring transactions, edit amount/description/category/day, toggle active/inactive, delete. Wire to the existing `generateRecurring` cron function. Add sidebar nav item.

2. **Budget comparison dashboard** — Add a "Comparação" tab to Planejamento or Budgets showing: all categories side-by-side in a comparison table (budgeted vs actual, % used), month-over-month trend sparklines per category, historical budget adherence rate (last 3/6/12 months). Use existing `useBudgets()` and `useTransactions()` data.

3. **Enhanced global search** — Expand `GlobalSearch.jsx` to search across all entities: budgets (by name), goals (by name), cards (by name/last4), rules (by keyword), and settings. Use React Query `useQueries()` for parallel entity searches. Maintain existing transaction search as primary.

4. **Notification preferences & bill reminders** — Create `src/pages/NotificationSettings.jsx` or a tab in Settings: toggle budget alerts on/off, set custom thresholds (default 80%/100%), configure email for alerts (wires to `UserConfig.email`), add manual bill reminders (new entity or extended Fields on existing entities). Wire to `sendBudgetAlert` and `sendInvoiceReminder` cron functions.

5. **Investment tracking v1** — Add investment portfolio section to Dashboard or a new page `src/pages/Investments.jsx`. Use the existing `Goal` entity's `investmentType` field. Show: allocation pie chart (by type), total invested, gain/loss (manual entry or CSV), basic ROI. Keep it simple — manual entry only, no API integration.

6. **Goal timeline visualization** — Add a timeline/Gantt view to Goals page using the existing `deadline` field. Show goals on a horizontal timeline with progress fill. Highlight overdue or at-risk goals (within 30 days of deadline, <50% complete).

7. **Analytics & insights engine** — Create `src/lib/insights.ts` with: spending pattern detection (most expensive day of week, top merchant), month-over-month change detection (category spending up >30% → flag), income stability score, savings rate calculation. Display in a new "Insights" section on Dashboard or a dedicated tab.

**Concerns addressed:** CONCERN #25 (Global search limited to transactions)

**Gaps addressed:** GAPS #1 (Investment tracking), GAPS #2 (Recurring transaction UI), GAPS #4 (Budget vs actual comparison), GAPS #5 (Bill management), GAPS #6 (Search across entities), GAPS #9 (Goal timeline), GAPS #10 (Notification preferences), GAPS #11 (Analytics)

**Requirements:** CONCERN #25 · GAPS #1, #2, #4, #5, #6, #9, #10, #11
**Success Criteria** (what must be TRUE):
1. User can view, create, edit, toggle, and delete recurring transactions from the UI — changes reflected in cron function output
2. User can see all budget categories side-by-side with actual spending and month-over-month sparklines
3. Global search returns results for transactions, budgets, goals, cards, and rules
4. User can configure which notifications to receive and set custom budget alert thresholds
5. User can add manual bill reminders with due dates and see them alongside card due dates
6. Goals page shows a timeline visualization with overdue/at-risk highlighting
7. Dashboard shows ≥3 automated insights (top category change, savings rate, spending anomaly)

**Plans:** 5 plans

Plans:
- [x] 03-01-PLAN.md — Enhanced global search (all entities) + Goal timeline visualization
- [x] 03-02-PLAN.md — Budget comparison dashboard with sparklines
- [x] 03-03-PLAN.md — Investment tracking v1 (portfolio page with allocation pie chart)
- [x] 03-04-PLAN.md — Notification preferences + Bill reminders + Dashboard insights
- [x] 03-05-PLAN.md — Recurring transactions page + Route/navigation wiring
**UI hint:** yes

---

### Phase 4: Polish & Platform
**Goal:** The app works offline, can be installed as a PWA, has user profile management, dark mode scheduling, and data backup/restore.

**Depends on:** Phase 3 (features are complete before platform hardening)

**Context Brief:**
The app is fully online-dependent — if Base44 is unreachable, the app shows an error screen. There's no PWA support, no service worker, no install prompt. Users have no profile management (password change, email update, account deletion). Dark mode is manual-only with no scheduling. This phase adds platform capabilities that make the app feel complete and production-grade.

**Tasks (6):**

1. **PWA + offline-first support** — Add `vite-plugin-pwa` with `manifest.json` (name "Lúmen", icons, theme_color `#0F766E`). Implement service worker with cache-first strategy for static assets. Add offline detection UI (banner when network lost). Queue offline mutations (write to localStorage, sync when online). Install prompt on mobile.

2. **User profile & account management** — Create `src/pages/Profile.jsx` with: user info display (email, name from Base44), password change (via Base44 SDK), email update, account deletion with confirmation flow, active session display. Add to sidebar nav.

3. **Data backup/restore** — Expand `TabDados.jsx` to include: full backup (all entities as JSON download), restore from file (upload JSON, validate structure, batch create entities with progress), cloud backup trigger (store backup snapshot as a Base64 Setting entity).

4. **Dark mode scheduling** — Add auto theme switching based on `prefers-color-scheme` media query with manual override. Add options: "Claro" / "Escuro" / "Automático (sistema)". Persist preference with the automatic flag.

5. **Environment + deployment hardening** — Create `.env.example` file with documented variables. Add `npm run build:check` script (build + typecheck + lint). Add `.github/workflows/ci.yml` or equivalent CI config. Add `npm audit` to `package.json` scripts. Document deployment targets (Vercel, Netlify, static hosting).

6. **WCAG accessibility audit** — Run automated audit (axe-core or Lighthouse). Fix any critical/serious findings. Add `@media print` stylesheet for Reports page. Ensure all interactive elements meet 44px minimum touch target. Add focus trap to modals.

**Concerns addressed:** CONCERN #14 (Large files — addressed across all phases), CONCERN #15 (localStorage schema), CONCERN #16 (CSS size), CONCERN #17-24 (various low concerns — addressed opportunistically)

**Gaps addressed:** GAPS #12 (Offline-first), GAPS #13 (PWA), GAPS #14 (User profile), GAPS #15 (Deployment config), GAPS #16 (Dark mode scheduling), GAPS #17 (Accessibility audit), GAPS #21 (Printable reports)

**Requirements:** CONCERN #14, #15, #16, #17-24, A, B, C · GAPS #8, #12, #13, #14, #15, #16, #17, #21
**Success Criteria** (what must be TRUE):
1. App displays "Instalar Lúmen" prompt on mobile; installation creates a standalone PWA with app icon
2. User sees an offline banner and can queue transactions locally; queued transactions sync when connectivity returns
3. User can change password, update email, and delete account from the Profile page
4. User can export all data (transactions, budgets, goals, cards, settings) as a single JSON file and restore from it
5. Dark mode automatically follows system preference with manual override option
6. Automated accessibility audit shows zero critical or serious WCAG 2.1 AA violations

**Plans:** 6 plans

Plans:
- [x] 04-01-PLAN.md — PWA + offline-first support (service worker, install prompt, offline queue)
- [x] 04-02-PLAN.md — User profile & account management (Profile page, password change, account deletion)
- [x] 04-03-PLAN.md — Dark mode scheduling + Settings consolidation
- [x] 04-04-PLAN.md — Data backup/restore (JSON export/import, zod validation)
- [x] 04-05-PLAN.md — CI pipeline + print stylesheet + PageNotFound PT + env docs
- [x] 04-06-PLAN.md — WCAG 2.1 AA accessibility audit gap closure (axe-core, touch targets, focus traps)
**UI hint:** yes

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Base44 → Supabase | 9/9 | ✓ Complete | 2026-05-19 |
| 1. Foundation Hardening | 4/4 | ✓ Complete | 2026-05-19 |
| 2. UI Consolidation | 5/5 | Complete | 2026-05-20 |
| 3. Feature Gaps | 5/5 | Complete | 2026-05-20 |
| 4. Polish & Platform | 6/6 | Complete | 2026-05-21 |

---

## Concern Coverage Map

| Concern | Phase | Description |
|---------|-------|-------------|
| CONCERN A | Phase 0 | Tight coupling to Base44 |
| CONCERN B | Phase 0 | No .env.example (environment docs) |
| CONCERN #1 | Phase 1 | Zero test coverage |
| CONCERN #2 | Phase 1 | No TypeScript strict mode |
| CONCERN #3 | Phase 1 | Automated bot commits (eliminated — no Base44 bot) |
| CONCERN #4 | Phase 2 | Planejamento duplicates Budgets + Goals |
| CONCERN #5 | Phase 2 | KPI Card inconsistency (two implementations) |
| CONCERN #6 | Phase 2 | FAB fragmentation (three implementations) |
| CONCERN #7 | Phase 2 | TransactionRow dual render paths |
| CONCERN #8 | Phase 2 | Hardcoded colors bypassing design tokens |
| CONCERN #9 | Phase 2 | No skeleton loading states |
| CONCERN #10 | Phase 2 | Inconsistent page-level padding |
| CONCERN #11 | Phase 2 | Mixed icon libraries |
| CONCERN #12 | Phase 2 | Onboarding modal fires every load |
| CONCERN #13 | Phase 1 | No error tracking or monitoring |
| CONCERN #14 | Phases 2-4 | Large component files (split across phases) |
| CONCERN #15 | Phase 4 | localStorage schema without versioning |
| CONCERN #16 | Phase 4 | CSS size (941 lines) |
| CONCERN #17-24 | Phase 4 | Various low UI concerns (opportunistic) |
| CONCERN #25 | Phase 3 | Global search limited to transactions |
| CONCERN C | Phase 4 | PageNotFound mixed language |
| CONCERN D | - | Frontend-only state (acceptable for current scale) |

## Gap Coverage Map

| Gap | Phase | Description |
|-----|-------|-------------|
| GAPS #1 | Phase 3 | Investment tracking (P0) |
| GAPS #2 | Phase 3 | Recurring transaction management UI (P0) |
| GAPS #3 | v2 | Bank account/sync integration (Open Finance — deferred) |
| GAPS #4 | Phase 3 | Budget vs actual comparison view (P1) |
| GAPS #5 | Phase 3 | Bill/invoice management beyond cards (P1) |
| GAPS #6 | Phase 3 | Search across all entities (P1) |
| GAPS #7 | v2 | Multi-currency support (deferred — app is BRL-focused) |
| GAPS #8 | Phase 4 | Data backup/restore (P1) |
| GAPS #9 | Phase 3 | Goal timeline visualization (P2) |
| GAPS #10 | Phase 3 | Notification preferences (P2) |
| GAPS #11 | Phase 3 | Analytics/insights beyond health score (P2) |
| GAPS #12 | Phase 4 | Offline-first capability (P2) |
| GAPS #13 | Phase 4 | PWA support (P2) |
| GAPS #14 | Phase 4 | User profile management (P2) |
| GAPS #15 | Phase 0 | Deployment configuration (P2) |
| GAPS #16 | Phase 4 | Dark mode scheduling (P3) |
| GAPS #17 | Phase 4 | Accessibility audit (P3) |
| GAPS #18 | v2 | Import from other apps (deferred) |
| GAPS #19 | v2 | Receipt/attachment support (deferred) |
| GAPS #20 | v2 | Multi-user/sharing (deferred) |
| GAPS #21 | Phase 4 | Printable reports (P3) |
| GAPS #22 | v2 | Public API (deferred) |
| GAPS N1-N3 | Phase 2/3 | Navigation gaps (addressed in UI and feature phases) |
| GAPS T1 | Phase 1 | No linting in CI |
| GAPS T2 | Phase 1 | Bundle size monitoring |
| GAPS T3 | Phase 1 | Dependency audit |
| GAPS T4 | Phase 4 | Environment variables documentation |

---

## Deferred to v2

These items are out of scope for the current roadmap — important but not blocking:

- **Bank integration** (GAPS #3): Open Finance, Plaid, or Brazilian equivalent. Major integration effort requiring API partnerships.
- **Multi-currency support** (GAPS #7): Entire codebase is BRL-hardcoded. Requires fundamental refactoring of `formatCurrency()` and entity schemas.
- **Import from other apps** (GAPS #18): OFX/QIF parsing, competitor data migration.
- **Receipt/attachment support** (GAPS #19): Requires Base64 storage or external file service.
- **Multi-user/family sharing** (GAPS #20): Requires auth model redesign, permission system.
- **Public REST API** (GAPS #22): Major architectural addition.
- **CI/CD pipeline** (GAPS T1 partial): Full GitHub Actions with deploy steps (setup groundwork in Phase 4).

---

## Execution Notes

- **Parallelization enabled**: Within each phase, tasks with no shared file dependencies can be executed in parallel. Phase 1 tasks 1+5+6+7 are independent. Phase 2 tasks 1+4+6+7 have minimal overlap. Phase 3 tasks are mostly independent features.
- **Phase gates**: Run `npm test && npm run build && npm run lint` after each phase to validate. Phase 1 tests are the safety net for Phases 2-4.
- **Bot commits**: If `base44-builder[bot]` pushes changes during any phase, pause and review the diff before continuing. Phase 1 adds monitoring for this.
- **Design system**: Consult `design_lumen.md` and `DEV_GUIDE.md` for all visual decisions. The design system compliance matrix in `00-UI-REVIEW.md` is the target.
- **Portuguese-first**: All user-facing text must be in Brazilian Portuguese. The 404 page inconsistency (CONCERN C) should be fixed opportunistically in any phase.
