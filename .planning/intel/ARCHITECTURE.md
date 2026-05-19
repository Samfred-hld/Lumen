# Architecture

**Analysis Date:** 2026-05-19

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Entry Point: App.jsx                              │
│              AuthProvider → QueryClientProvider → Router                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                  │
│  │   Layout.jsx  │   │ AuthContext  │   │ErrorBoundary │                  │
│  │  (Desk+mobile │   │  `lib/`      │   │ `components/`│                  │
│  │   shell)      │   │              │   │              │                  │
│  └──────┬─────┬──┘   └──────────────┘   └──────────────┘                  │
│         │     │                                                           │
│         ▼     ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │                       Pages (8 total)                              │    │
│  │  Dashboard · Transactions · Budgets · Goals · Calendar · Reports   │    │
│  │                    Settings · Planejamento                          │    │
│  │              All wrapped in <ErrorBoundary> per route               │    │
│  └───────────────┬───────────────────────────────────────────────────┘    │
│                  │                                                        │
│         ┌────────┼────────┬──────────┬──────────┐                         │
│         ▼        ▼        ▼          ▼          ▼                         │
│  ┌──────────┐ ┌──────┐ ┌──────┐ ┌────────┐ ┌──────────┐                  │
│  │  useData │ │store │ │finance│ │ csv    │ │notificat.│                  │
│  │  hooks   │ │ lib/ │ │Utils  │ │Parser  │ │ Store    │                  │
│  └────┬─────┘ └──┬───┘ └──────┘ └────────┘ └──────────┘                  │
│       │          │                                                        │
│       ▼          ▼                                                        │
│  ┌────────────────────────────────────────────────────────────┐          │
│  │                    Base44 BaaS (via @base44/sdk)            │          │
│  │  Entities: Transaction · Budget · Goal · Card · Rule       │          │
│  │             Template · Setting · UserConfig                 │          │
│  │  Auth: base44.auth.me() / logout() / redirectToLogin()      │          │
│  └────────────────────────────────────────────────────────────┘          │
│       │                                                                   │
│       ▼                                                                   │
│  ┌────────────────┐    ┌────────────────┐                                │
│  │  localStorage  │◄──►│  Base44 Cloud  │   (read-through cache)          │
│  │  (per-user key)│    │  (source of    │                                 │
│  │                │    │   truth)       │                                 │
│  └────────────────┘    └────────────────┘                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App` | Top-level providers: Auth, QueryClient, Router | `src/App.jsx` |
| `AuthenticatedApp` | Auth gate, route definitions, initStore on mount | `src/App.jsx` |
| `Layout` | Desktop sidebar, mobile bottom nav, top AppBar, keyboard shortcuts, notification center, theme toggle, FAB | `src/components/Layout.jsx` |
| `ErrorBoundary` | Class-based React error boundary with reload button | `src/components/ErrorBoundary.jsx` |
| `AuthProvider` / `useAuth` | Base44 auth state, token handling, login/logout redirects | `src/lib/AuthContext.jsx` |
| `useTransactions/useBudgets/useGoals/useCards` | React Query hooks with real-time Base44 subscribe | `src/hooks/useData.js` |
| `useMonthNavigation` | Month/year navigation state for date-filtered pages | `src/hooks/useMonthNavigation.js` |
| `initStore` | Cloud→localStorage sync on app start, legacy prefix migration, auto-dedup | `src/lib/store.js` |
| `base44` client | Singleton Base44 SDK client instance | `src/api/base44Client.js` |
| `queryClientInstance` | Global TanStack React Query v5 client | `src/lib/query-client.js` |

## Pattern Overview

**Overall:** Single-page application with BaaS backend (no traditional REST API server).

**Key Characteristics:**
- **BaaS-first architecture** — Base44 SDK handles auth, CRUD, real-time subscriptions, and cloud persistence
- **Read-through cache** — Cloud (Base44) is source of truth; localStorage caches user settings and acts as fallback
- **React Query + subscribe pattern** — `useData.js` hooks combine `useQuery` (30s staleTime) with `subscribe()` for real-time cloud updates
- **Per-route error isolation** — Each route is wrapped in its own `<ErrorBoundary>`
- **Desktop-first with mobile adaptation** — Sidebar/Sheet hybrid, bottom nav on mobile via `useIsMobile()` hook
- **Design system migration in progress** — Phasing out shadcn `Card`/`CardContent` wrapper in favor of direct divs with design tokens

## Layers

**Provider Layer:**
- Purpose: Global context wiring (auth, data fetching, routing)
- Location: `src/App.jsx:73-86`, `src/lib/AuthContext.jsx`, `src/lib/query-client.js`
- Contains: `AuthProvider`, `QueryClientProvider`, `BrowserRouter`
- Depends on: `base44Client.js` (API), `app-params.js` (config)
- Used by: Everything

**Shell Layout Layer:**
- Purpose: Navigation chrome (sidebar, top bar, bottom nav), keyboard shortcuts, notifications
- Location: `src/components/Layout.jsx`
- Contains: `Layout`, `NotificationCenter`, `ShortcutsModal`, `AriaAnnouncer`, `FAB`
- Depends on: `useData` hooks, `notificationStore`, `AuthContext`, `GlobalSearch`
- Used by: All pages via `<Outlet />`

**Page Layer:**
- Purpose: Feature-specific UI orchestration
- Location: `src/pages/*.jsx` (8 pages)
- Contains: Dashboard, Transactions, Budgets, Goals, Planejamento, CalendarPage, Reports, Settings
- Depends on: `useData` hooks, `financeUtils`, `store`, `dashboard/` and `finance/` components
- Used by: Router in `AuthenticatedApp`

**Component Library Layer:**
- Purpose: Reusable UI blocks
- Location: `src/components/dashboard/` (8 files), `src/components/finance/` (11 files), `src/components/settings/` (3 files), `src/components/ui/` (60+ shadcn/ui files)
- Contains: KpiCard, HeroBalance, DashSection, TransactionRow, TransactionModal, CSVImport, QuickEntry, FinancialHealthScore, etc.
- Depends on: `lib/utils.js` (cn), `lib/financeUtils.js`, design tokens
- Used by: Pages

**Data Access Layer:**
- Purpose: Base44 SDK wrapper, localStorage helpers
- Location: `src/api/base44Client.js`, `src/hooks/useData.js`, `src/lib/store.js` (+ `store/` submodules), `src/lib/notificationStore.js`
- Contains: Entity CRUD, real-time subscriptions, cloud/local sync
- Depends on: `@base44/sdk`, `app-params.js`
- Used by: Pages, components

**Utility Layer:**
- Purpose: Pure computation, parsing, formatting
- Location: `src/lib/financeUtils.js`, `src/lib/categories.js`, `src/lib/csvParser.js`, `src/lib/csvDedup.js`, `src/lib/csvProfile.js`, `src/lib/amountParser.js`, `src/lib/stringUtils.js`, `src/lib/transactionDetectors.js`, `src/lib/app-params.js`, `src/lib/chartTheme.js`, `src/lib/utils.js`
- Contains: Currency formatting, date helpers, category definitions, CSV parsing engine, auto-categorization, chart styling constants
- Depends on: `date-fns`, `clsx`/`tailwind-merge`
- Used by: Pages, components, store modules

## Data Flow

### Primary Request Path (page load)

1. `main.jsx` renders `<App />` into `#root` (`src/main.jsx:6`)
2. `App.jsx` mounts `AuthProvider` → checks Base44 auth via `checkAppState()` (`src/lib/AuthContext.jsx:21-90`)
3. On auth success, `AuthenticatedApp` fires `initStore()` to sync cloud settings/localStorage (`src/App.jsx:26-33`)
4. Route matches → page component mounts → calls `useTransactions()` / `useBudgets()` / `useGoals()` / `useCards()` from `useData.js`
5. Each hook calls `useQuery` (initial fetch from Base44) + `useEffect` (subscribe to real-time changes via `invalidateQueries`)
6. Page computes derived data with `React.useMemo` using `financeUtils` (filterByMonth, calcTotals, groupByCategory)
7. UI renders with design system tokens (Tailwind classes + CSS variables)

### Transaction Create Flow

1. User presses `N` key or clicks FAB → `useTransactionModal.open()` dispatches global event (`src/lib/transactionModalStore.js`)
2. Page's `useEffect` listens for modal subscriber → opens `TransactionModal` (`src/components/finance/TransactionModal.jsx`)
3. Form uses `react-hook-form` + `zod` schema for validation
4. On submit: `base44.entities.Transaction.create(data)`
5. Base44 SDK automatically notifies all subscribers → React Query `invalidateQueries({ queryKey: ['transactions'] })` fires
6. All pages re-render with fresh data

### CSV Import Flow

1. `CSVImport` component mounts in `Transactions.jsx` (`src/components/finance/CSVImport.jsx`)
2. User drops/selects file → `readFileWithEncoding()` detects BOM/encoding → `parseCSV()` parses rows (`src/lib/csvParser.js`)
3. `detectBankProfile()` auto-matches column mapping to known Brazilian bank formats (`src/lib/csvProfile.js`)
4. `enrichWithDedup()` checks for duplicates against existing transactions (`src/lib/csvDedup.js`)
5. `ColumnMapper` UI shown if auto-detection fails → user maps columns manually
6. Preview step shows matched rows with auto-categorized categories via `suggestCategoryFromRules()`
7. On confirm: batch creates via `base44.entities.Transaction.create()` with `pauseSubscribeRef` to prevent N subscription invalidations

### Settings Sync Flow

1. User changes a setting (e.g., theme toggle)
2. Component calls `setTheme(newTheme)` from `src/lib/store/settings.js`
3. `setTheme()` writes to localStorage immediately (`setLocal('theme', t)`)
4. `setTheme()` also writes to Base44 cloud: `setSettingToCloud('theme', t)` → `base44.entities.Setting.filter({ key })` then `create` or `update`
5. On next app load, `initStore()` calls `fetchTheme()` → reads cloud first, falls back to localStorage

### Notification Flow

1. `Layout.jsx` renders `NotificationCenter` which listens to `useBudgets()` and `useTransactions()` data
2. On data change → `generateBudgetNotifications(budgets, transactions)` from `src/lib/notificationStore.js`
3. For each budget where spending ≥80% of limit → `createNotification()` with `type: 'budget_alert'`
4. Notifications stored in localStorage via notification store (`src/lib/notifications.js`)
5. Bell icon in top bar shows unread count badge
6. Clicking notification navigates to relevant page (e.g., `/budgets`)

**State Management:**
- **Server state:** TanStack React Query v5 (Base44 entities with real-time invalidation)
- **User preferences:** localStorage with Base44 cloud sync (read-through cache pattern)
- **UI state:** React `useState` in components (modals, sidebar collapse, search overlay)
- **Cross-component state:** Global events via `CustomEvent` (aria announcements, transaction modal)
- **Auth state:** React Context (`AuthContext`) with Base44 SDK

## Key Abstractions

**`useData` hooks:**
- Purpose: Unified data access layer combining React Query caching with Base44 real-time subscriptions
- Examples: `useTransactions(limit, pauseSubscribeRef)`, `useBudgets()`, `useGoals()`, `useCards()`
- Pattern: Each hook returns `{ data, isLoading, error }` from `useQuery` with `staleTime: 30s`, `gcTime: 5min`

**`store/` modules:**
- Purpose: CRUD wrappers for entities that need localStorage caching (Cards, Rules, Templates, Settings)
- Examples: `getCards()`, `fetchCards()`, `addCard()`, `saveSalaryConfig()`
- Pattern: Dual-write to localStorage (immediate) + Base44 (async). Read returns localStorage value; `fetch*()` syncs from cloud.

**`AdaptiveModal`:**
- Purpose: Responsive modal that renders as `<Dialog>` on desktop and `<Sheet>` (bottom drawer) on mobile
- Location: `src/components/ui/adaptive-modal.jsx:6`
- Pattern: Uses `useIsMobile()` hook to branch between `<Dialog>` and `<Sheet>` components

**`Entity setup` (lumenSetup):**
- Purpose: One-time entity creation/verification utility for Base44 backend
- Location: `src/lib/entitySetup.js`
- Pattern: Checks 8 required entities exist, creates test records if missing, migrates localStorage to cloud

## Entry Points

**Browser entry:**
- Location: `index.html` → `src/main.jsx` → `src/App.jsx`
- Triggers: User navigates to app URL
- Responsibilities: Initialize React, mount providers, bootstrap auth

**Route entry (each page):**
- Location: `src/App.jsx:57-69` (route definitions)
- Triggers: URL change via react-router-dom v6
- Responsibilities: Lazy render page component wrapped in `<ErrorBoundary>` inside `<Layout>` outlet

**Global keyboard shortcuts:**
- Location: `src/components/Layout.jsx:216-241`
- Triggers: `keydown` event on `document`
- Responsibilities: `N` = new transaction, `/` or `Ctrl+K` = search, `1-7` = navigate, `?` = shortcuts modal, `Esc` = close

**FAB (Floating Action Button):**
- Location: `src/components/ui/fab.jsx`, rendered in `Layout.jsx`
- Triggers: Button tap/click (mobile)
- Responsibilities: Opens transaction modal for quick entry

## Architectural Constraints

- **Threading:** Single-threaded event loop (browser JS). All Base44 operations are async (Promise-based). No Web Workers used.
- **Global state:** `base44Client.js` exports a singleton SDK client (`base44`). `queryClientInstance` is a module-level singleton. `AuthContext` provides auth state via Context API. Global event bus for cross-component communication (`lumen-announce`, `useTransactionModal.subscribe`).
- **Circular imports:** Not detected. Dependency graph flows: pages → hooks → API client; pages → components → lib/utils.
- **Bundle splitting:** Dynamic `import()` used for `entitySetup.js` in `App.jsx:30` to keep it out of main bundle.
- **Platform:** Browser-only SPA. No SSR, no static generation. Runs on Vite dev server / static build.

## Anti-Patterns

### shadcn Card Migration In Progress

**What happens:** The project is mid-migration from `<Card><CardContent>` wrappers to direct `<div className="bg-surface border...">` with design system tokens. Both patterns coexist.
**Why it's wrong:** Inconsistency creates confusion for new contributors. `src/components/ui/card.jsx` still exists but is deprecated per `DEV_GUIDE.md` rule #3. Some older pages (Reports) still import `Card` from shadcn.
**Do this instead:** Use `<div className="bg-surface border border-surface-border p-card-padding">` with the 3px colored accent bar pattern. See `KpiCard.jsx` for the canonical example.

### Mixed Icon Libraries

**What happens:** `lucide-react` icons (Pencil, Trash2, TrendingUp, etc.) and Material Symbols (`<span className="material-symbols-outlined">`) coexist throughout the codebase.
**Why it's wrong:** Two icon systems means two rendering approaches (React component vs. ligature span), inconsistent sizing, and potential style conflicts. `DEV_GUIDE.md` rule #4 mandates Material Symbols for visual icons, but migration is incomplete.
**Do this instead:** Use `<MsIcon name="icon_name" size={20} />` or inline `<span className="material-symbols-outlined">icon</span>` for all visual icons. Reserve lucide-react only for interactive action buttons (Pencil, Trash2, Copy).

### Store Module Duplication

**What happens:** `notificationStore.js` re-exports from `notifications.js` as a "compatibility layer" (`src/lib/notificationStore.js:1-7`). `financeUtils.js` re-exports `CAT_COLORS`, `MONTH_NAMES`, `MONTH_SHORT` from `categories.js` (`src/lib/financeUtils.js:6`).
**Why it's wrong:** Barrel re-exports create indirection and make it unclear which module is canonical. `notificationStore.js` adds a legacy `generateBudgetNotifications()` function that wraps `createNotification()` — duplicating `generateBudgetAlerts()` from the canonical `notifications.js`.
**Do this instead:** Use a single canonical module. Deprecate `notificationStore.js` entirely. Import `generateBudgetAlerts` directly from `@/lib/notifications` in `Layout.jsx`.

### Large Monolithic Pages

**What happens:** Several page components exceed 400 lines: Dashboard (447), Goals (437), Transactions (580), Reports (608), Planejamento (623), CalendarPage (635). These files mix data fetching, computation, filtering UI, modals, and rendering logic.
**Why it's wrong:** Harder to maintain, test in isolation, and reason about. CalendarPage at 635 lines mixes month navigation, transaction rendering, inline editing, and calendar UI.
**Do this instead:** Extract sub-components (filters, list renderers, empty states) into dedicated files under `components/finance/` or `components/dashboard/`. Follow the pattern already established with `ChartsSection`, `CategoryBreakdown`, `GoalsSection` extracted from Dashboard.

## Error Handling

**Strategy:** Defensive rendering with fallbacks. Errors are caught, not propagated.

**Patterns:**
- **Route-level Error Boundaries:** Each page in `src/App.jsx:59-67` is wrapped in `<ErrorBoundary>` — a single page crash does not take down the whole app
- **Global Error Boundary:** `App.jsx:75` wraps the entire provider tree
- **Array.isArray guards:** All hooks that return data from Base44 defensively check `Array.isArray(rawX) ? rawX : []` before using (`src/pages/Dashboard.jsx:63-66`)
- **try/catch on all async ops:** `initStore()` uses `Promise.allSettled` to prevent one failed sync from blocking others (`src/lib/store.js:71`)
- **null/undefined guards:** `formatCurrency(value || 0)`, optional chaining throughout
- **Data validation on localStorage reads:** `getLocal` callers check return types (array, object) before use (`DEV_GUIDE.md` rule #7)

## Cross-Cutting Concerns

**Logging:** `console.error` for caught errors in store/API operations. `console.info` for init flow markers. No structured logging or error reporting service.

**Validation:**
- Forms: `react-hook-form` + `zod` schemas (e.g., `goalSchema` in Goals)
- localStorage: Array type checks before state initialization
- API responses: Null/undefined guards, Array.isArray checks

**Authentication:**
- Base44 SDK handles token lifecycle, login redirect, logout
- `AuthContext` provides `user`, `isAuthenticated`, `authError`, `logout()`, `navigateToLogin()`
- Three error states rendered: loading spinner, `UserNotRegisteredError`, auth redirect
- User-specific localStorage prefix: `rattio_{userId}_` (migrated from legacy `rattio_` prefix)

**Internationalization:**
- All UI text in Brazilian Portuguese (pt-BR)
- Currency formatted as `R$ 1.234,56` via `Intl.NumberFormat('pt-BR', ...)`
- Month names, day names, date formats follow pt-BR conventions
- No i18n library — all strings hardcoded in Portuguese

**Accessibility:**
- `aria-live="polite"` announcer for navigation/modal events (`Layout.jsx:42-54`)
- `aria-current="page"` on active nav items
- `aria-label` with formatted values on KPI cards and monetary elements
- `sr-only` chart summaries
- Keyboard shortcuts documented in `?` modal
- Focus rings: `outline: 2px solid #0F766E; outline-offset: 2px`

---

*Architecture analysis: 2026-05-19*
