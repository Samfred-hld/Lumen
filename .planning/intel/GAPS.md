# GAPS — Missing Functionality & Unimplemented Features

**Updated:** 2026-05-19 · **Source:** Codebase exploration cross-referenced with DEV_GUIDE.md, design_lumen.md, and UI-REVIEW.md

---

## 🔴 Critical Gaps (P0 — User-visible missing features)

### 1. No Investment Tracking Beyond Basic Category
"Investimentos" is just a category label. There's no portfolio tracking, no asset allocation, no ROI calculation. The `Goal` entity has `investmentType` field but it's unused in the UI.
- **Evidence:** `Goals.jsx` handles only savings goals. `entitySetup.js:21` defines `investmentType` field but no UI renders it.
- **User impact:** Cannot track investment performance or allocation.

### 2. No Recurring Transaction Management UI
Base44 cron function `generateRecurring` creates transactions from `FixedTemplate` entities, but there is **no UI** for users to view, edit, or manage their recurring transactions.
- **Evidence:** `base44/functions/generateRecurring/entry.ts` exists and works. No corresponding React component. `FixedTemplate` entity not exposed in any page.
- **User impact:** Users cannot see what recurring transactions exist or modify them. Must use console (`lumenSetup.run()`).

### 3. No Bank Account / Sync Integration
All data entry is manual or CSV import. No Open Finance, Plaid, or Brazilian equivalent integration. The CSV profiles for 6 banks help but require user-initiated export from bank websites.
- **User impact:** High friction for users with multiple accounts. Manual CSV imports from each bank.

---

## 🟠 High Priority Gaps (P1 — Missing features that limit app value)

### 4. No Budget vs Actual Comparison View
The Budgets page (`Budgets.jsx`) shows per-category budget cards with spent/limit progress bars. But there's **no comparison view** — no table or chart showing all categories side-by-side, no month-over-month trend, no historical budget adherence.
- **Evidence:** `Budgets.jsx:212-280` renders individual cards in a grid. `Reports.jsx` doesn't reference budgets at all (though it imports `useBudgets`).
- **User impact:** Cannot easily identify which categories consistently go over budget.

### 5. No Bill/Invoice Management Beyond Card Due Dates
Browser notifications (`notifications.js:35-70`) only check card `dueDay` and salary day. No support for manual bill reminders (e.g., rent, utilities, subscriptions).
- **Evidence:** `notifications.js:44` only iterates `getCards()`. No generic bill entity.
- **User impact:** Users must remember non-card recurring bills themselves.

### 6. No Search Across All Entities
`GlobalSearch.jsx` only searches transactions (by description, category, notes). Cannot find budgets, goals, cards, or rules.
- **Evidence:** `GlobalSearch.jsx:15-23` uses `useTransactions(500)` exclusively.
- **User impact:** Limited to finding only transactions.

### 7. No Multi-Currency Support
Everything is hardcoded to BRL (Brazilian Real) via `formatCurrency()` with `pt-BR` locale.
- **Evidence:** `financeUtils.js:12-17` — Intl.NumberFormat('pt-BR', { currency: 'BRL' }).
- **User impact:** Cannot track foreign currency transactions or accounts.

### 8. No Data Backup/Restore (Cloud)
`TabDados.jsx` provides CSV/JSON export of transactions. But there's **no cloud backup/restore** — only localStorage export which is fragile.
- **Evidence:** `TabDados.jsx:40-72` — creates download links, no upload/restore from file.
- **User impact:** If localStorage is cleared, data is gone (unless Base44 cloud sync works).

---

## 🟡 Medium Priority Gaps (P2 — Important but not blocking)

### 9. No Financial Goal Timeline Visualization
Goals page shows progress bars but no timeline view. The `Goal` entity has `deadline` field but no Gantt chart or calendar view for goal deadlines.
- **Evidence:** `Goals.jsx` renders cards with progress bars only. `deadline` field exists in schema but only shown as text date.
- **User impact:** Cannot visualize when goals should be completed.

### 10. No Notification Preferences
Notification center exists (`notifications.js:72-134`) but has no preferences UI. Users cannot:
- Opt out of budget alerts
- Choose notification channels (browser push only)
- Set alert thresholds (hardcoded 80%/100%)
- Configure email alerts (backend `sendBudgetAlert.ts` uses UserConfig `userEmail` but no UI sets it)

### 11. No Analytics or Insights Beyond Health Score
The financial health score (`FinancialHealthScore.jsx`) provides a single composite score (0-100). No:
- Spending pattern detection
- Anomaly detection (unusual transactions)
- Category trend analysis
- Income stability metrics
- Savings rate trajectory

### 12. No Offline-First Capability
The app requires Base44 connectivity. React Query `staleTime: 30_000` provides 30-second resilience but no persistent offline queue. If a user adds a transaction while offline, it's lost.
- **Evidence:** `useData.js` — all hooks depend on `base44.entities.*.list()` which requires network.

### 13. No PWA / Mobile App
No `manifest.json`, no service worker, no install prompt. The app is mobile-responsive (bottom nav, FAB, swipe-to-delete) but not installable.
- **Evidence:** `vite.config.js` has no PWA plugin. No `manifest.json` in `public/`.

### 14. No User Profile / Account Management
Auth exists (`AuthContext.jsx`) but there's no:
- User profile page
- Password change
- Email update
- Account deletion
- Session management (view active sessions)

### 15. Missing Vercel/Netlify Deployment Configuration
`package.json` has `npm run preview` (Vite preview) but no deployment scripts. No `vercel.json`, `netlify.toml`, or Docker configuration.
- **Evidence:** Only `vite preview` and `vite build` scripts. No CI/CD pipeline.

---

## 🟢 Low Priority Gaps (P3 — Nice to have)

### 16. No Dark Mode Scheduling
Theme toggle is manual only. No automatic switch based on OS preference or time of day.
- **Evidence:** `Layout.jsx` theme toggle is a click handler. `prefers-color-scheme` media query not used.

### 17. No Accessibility Audit Results
Accessibility features exist (ARIA announcer, focus rings, keyboard shortcuts) but no automated audit. WCAG compliance level unknown.

### 18. No Data Import from Other Apps
CSV import handles bank exports only. No import from:
- Other financial apps (Mobills, Organizze, Guiabolso)
- OFX/QIF formats
- JSON backup from other tools

### 19. No Receipt/Attachment Support
Transaction entity has no `attachment` or `receipt` field. Users cannot attach images or PDFs to transactions.

### 20. No Sharing / Multi-User
Single-user only. No family/shared budget, no read-only access for financial advisors.

### 21. No Printable Reports
`TabDados.jsx` has basic PDF export via jsPDF but it's a raw dump, not a formatted report. The Reports page has no print stylesheet.
- **Evidence:** `TabDados.jsx:58-71` — basic text PDF. No `@media print` styles in CSS.

### 22. No API for External Integrations
All data flows through Base44 SDK. No public REST API for users to build their own integrations.

---

## Navigation/Discovery Gaps

### N1. Budgets Page Not in Main Navigation
`Budgets.jsx` exists at route `/budgets` but is **not linked** from the sidebar (`NAV_ITEMS` in `Layout.jsx:25-32`). Sidebar links to `/planejamento` which is the unified page. Notification alerts link to `/budgets` creating a dead-end navigation experience.

### N2. Goals Page Not in Main Navigation
`Goals.jsx` exists at route `/goals` but is **not linked** from the sidebar. Only accessible through Planejamento or direct URL entry.

### N3. No Onboarding for New Features
The onboarding modal (first-time only) covers basic concepts. No feature discovery for:
- Keyboard shortcuts (only `?` key reveals them)
- Swipe-to-delete gesture
- Double-click to edit (Budgets page)
- CSV import capability
- Global search (Cmd+K / Ctrl+K)

---

## Technical Debt Gaps

### T1. No Linting in CI
`package.json` has `npm run lint` and `npm run lint:fix` but no CI pipeline to enforce them on PRs.

### T2. No Bundle Size Monitoring
No `vite-bundle-visualizer` or similar tool. The 941-line CSS file and ~80 component files have no size tracking.

### T3. No Dependency Audit
`package.json` has 47 production dependencies and 14 dev dependencies. No `npm audit` in scripts, no Dependabot/Renovate configuration.

### T4. No Environment Variables Documentation
DEV_GUIDE.md references `.env.example` which does not exist. New developers cannot set up the project without guessing required env vars.
