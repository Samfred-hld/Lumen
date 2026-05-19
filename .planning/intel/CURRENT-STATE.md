# CURRENT-STATE — Lúmen Gestão Financeira (Rattio)

**Updated:** 2026-05-19 · **Source:** Codebase exploration + UI-REVIEW.md + DEV_GUIDE.md + graphify report
**Migration target:** Supabase (`chjndtzrljiywzynrgrb`) · Repo: `github.com/Samfred-hld/Lumen`

---

## ⚠️ Migration Context (2026-05-19)

Phase 0 of the ROADMAP is a complete migration from **Base44 BaaS → Supabase**. The migration preserves the same BaaS architecture pattern:
- **Auth:** Base44 Auth → Supabase Auth
- **Database:** Base44 entities → PostgreSQL tables with RLS
- **Real-time:** Base44 subscribe → Supabase Realtime
- **Backend functions:** Base44 cron → Supabase Edge Functions (Deno)
- **Hosting:** Base44 preview → Vercel deploy previews
- **Build:** `@base44/vite-plugin` → pure Vite (no BaaS plugin needed)

The migration is designed to be reversible until verified. Both Base44 and Supabase run in parallel during development.

Lúmen is a **personal finance dashboard for Brazilian users** built on React 18 + Vite + Tailwind CSS. The backend is **Base44 BaaS** (serverless) with 5 cron functions for automation. The design follows a **Swiss-editorial aesthetic** — a "financial newspaper for your pocket money." It is **in production** with real users.

- **Stack:** React 18, Vite 6, Tailwind CSS 3, TanStack React Query v5, Recharts, react-hook-form + Zod, react-router-dom v6, Base44 SDK (`@base44/sdk` v0.8.28)
- **Codebase:** ~55 frontend source files, ~9,800+ lines of JSX/JS, plus 5 TypeScript cron functions
- **Design System:** Fully tokenized CSS custom properties with dual light/dark theme, 6-tier typography scale, 8px base grid, navy sidebar constant across themes
- **UI Review Score:** 19/24 (Strong editorial foundation, needs consolidation)

---

## Pages Implemented (8 total, all working)

| Page | File | Lines | Status | Key Features |
|------|------|-------|--------|-------------|
| **Dashboard** | `src/pages/Dashboard.jsx` | 484 | ✅ Live | Hero balance, KPI cards, health score, charts section, category breakdown, goals section, customizable sections, onboarding modal |
| **Transactions** | `src/pages/Transactions.jsx` | 627 | ✅ Live | Full CRUD, 6 filter dimensions, CSV import, XLSX import, pagination (20/page), bulk select/delete, swipe-to-delete mobile, installment confirm, inline form, quick entry |
| **Planejamento** | `src/pages/Planejamento.jsx` | 677 | ✅ Live | Unified budgets + goals view, budget inline edit, goal progress tracking (linked/manual modes), Material Symbols icons per category |
| **Budgets** | `src/pages/Budgets.jsx` | 292 | ✅ Live | Budget CRUD, inline limit editing (double-click), progress bars, recurring flag, overrun warnings |
| **Goals** | `src/pages/Goals.jsx` | 466 | ✅ Live | Goal CRUD, linked/manual progress modes, color picker, deadline tracking, deposit action |
| **Calendar** | `src/pages/CalendarPage.jsx` | 667 | ✅ Live | Month grid with transaction dots, day detail sheet/dialog, card statement view, CSV export, keyboard navigation |
| **Reports** | `src/pages/Reports.jsx` | 643 | ✅ Live | Period selector (month/quarter/semester/year/all), pie/bar/line/area charts, cash flow forecast, CSV export, paginated detail table |
| **Settings** | `src/pages/Settings.jsx` | 252 | ✅ Live | Card management (modal CRUD), rules management, themes (3 tabs), data export (CSV/JSON/PDF), clear all data |

---

## Data Architecture

### Base44 Entities (8 + FixedTemplate)
- **Transaction** — Core financial record (19 fields including installment tracking)
- **Budget** — Category budget per month (4 fields)
- **Goal** — Savings/debt goal (8 fields)
- **Card** — Credit card with billing cycle (6 fields)
- **Rule** — Auto-categorization keyword→category (2 fields)
- **Template** — Transaction template for quick entry (5 fields)
- **Setting** — Key-value app settings (2 fields)
- **UserConfig** — User preferences key-value (2 fields)
- **FixedTemplate** — Recurring transaction template (cron-only)

### Data Flow
```
Base44 BaaS → @base44/sdk → base44Client.js → useData hooks (React Query + subscribe)
                                                    ↓
                                              Page components
                                                    ↓
                                        localStorage cache (store layer)
                                                    ↓
                                    Cron functions (5 serverless handlers)
```

### Hooks Layer (`src/hooks/useData.js` — 107 lines)
- `useTransactions(limit, pauseSubscribeRef)` — Real-time subscription with batch-import pause
- `useBudgets()` — Real-time subscription
- `useGoals()` — Real-time subscription
- `useCards()` — Real-time subscription
- `useMonthNavigation(paramMonth?, paramYear?)` — Month/year navigation state
- `useIsMobile()` — Responsive breakpoint hook

### Store Layer (`src/lib/store.js` — 90 lines, barrel for `src/lib/store/*`)
- localStorage with per-user prefix (`rattio_{userId}_`)
- Cloud sync via Base44 Setting entity (fire-and-forget with localStorage cache)
- `initStore()` — Fetches all config from cloud on app start (Promise.allSettled)
- Auto-deduplication runs once per session
- Legacy prefix migration (`rattio_` → `rattio_{userId}_`)

---

## Backend Cron Functions (5 Base44 serverless)

| Function | File | Schedule | Purpose |
|----------|------|----------|---------|
| `generateRecurring` | `base44/functions/generateRecurring/entry.ts` | Day 1, 00:00 | Creates monthly fixed transactions from FixedTemplates |
| `generateSalary` | `base44/functions/generateSalary/entry.ts` | Monthly | Creates salary income transaction |
| `generateRecurringBudgets` | `base44/functions/generateRecurringBudgets/entry.ts` | Day 1 | Copies recurring budgets to current month |
| `sendBudgetAlert` | `base44/functions/sendBudgetAlert/entry.ts` | Weekly (Mon) | Emails user when budgets are exceeded |
| `sendInvoiceReminder` | `base44/functions/sendInvoiceReminder/entry.ts` | Daily | Reminds about upcoming card due dates |

---

## Key Utilities

| File | Lines | Purpose |
|------|-------|---------|
| `src/lib/financeUtils.js` | 173 | Currency formatting (pt-BR), date helpers, month filtering, totals calculation, goal progress, installment series |
| `src/lib/csvParser.js` | 763 | CSV/Excel parsing engine: encoding detection (UTF-8/16/Windows-1252), date format detection, bank profile mapping, auto-categorization, duplicate detection, installment detection |
| `src/lib/csvProfile.js` | ~200 | Bank-specific CSV profiles: Nubank, Inter, Bradesco, Itaú, C6 Bank, XP |
| `src/lib/autoCorrelations.js` | 55 | Built-in description→category correlations (Brazilian merchants) |
| `src/lib/notifications.js` | 168 | Browser push notifications (card due dates, salary), in-app notification center (localStorage, max 50, dedup within 24h), budget alert generation |
| `src/lib/entitySetup.js` | 526 | Entity schema management, localStorage→cloud migration, deduplication (cards, rules, templates) |
| `src/lib/clearAllData.js` | 181 | Batch entity deletion with deleteMany fallback, localStorage cleanup, React Query cache invalidation |
| `src/lib/chartTheme.js` | 37 | Shared Recharts styles for tooltip, axis, colors |
| `src/lib/categories.js` | 153 | 30 default categories, Material Symbols icon mapping, color palette |

---

## Design System Status (from UI-REVIEW.md)

| Spec | Implemented | Note |
|------|-------------|------|
| Navy sidebar (#0A1628) constant across themes | ✅ Yes | |
| Teal 700 primary brand (#0F766E) | ✅ Yes | CSS variables + Tailwind tokens |
| Inter-only UI typeface | ✅ Yes | |
| Mono financial numbers (tabular-nums) | ✅ Yes | JetBrains Mono with `.tabular-nums` |
| 60px hero display figure | ✅ Yes | `text-display-hero` |
| KPI 3px accent bars | ✅ Yes | Both Dashboard and Transactions |
| Editorial burnt-orange divider rule | ✅ Yes | `bg-editorial-rule` at 30% opacity |
| Shadow tiers (4 levels) | ✅ Yes | sm → card → card-hover → float |
| Dark mode zero-shadow rule | ✅ Yes | Tonal surface layering |
| 8px base grid | ✅ Yes | `spacing.unit: 8px` |
| 6px border radius (near-flat) | ✅ Yes | `var(--radius): 6px` |
| Hexagonal logo | ❌ No | Uses rectangular `<img>` instead |
| Material Symbols exclusively | ⚠ Partial | Lucide icons still used in several places |

---

## What's Working Well

1. **Real-time cloud sync** — Base44 subscriptions keep all entities in sync across devices
2. **CSV import** — Robust parser handles 6 Brazilian bank formats, encoding detection, auto-categorization
3. **Keyboard accessibility** — Global shortcuts (N, /, 1-7, ?, Esc), ARIA announcer, focus rings
4. **Undo pattern** — Delete operations show toast with "Desfazer" (undo) that recreates the record
5. **Dark/light theme** — Fully tokenized, single `data-theme` attribute toggle, screen-reader announcement
6. **prefers-reduced-motion** — All animations disabled to 0.01ms when OS preference is set
7. **Data integrity** — Array validation everywhere (`Array.isArray()`), defensive null checks, data migration on startup
8. **Clear all data** — Complete wipe of both cloud entities and localStorage with progress reporting
9. **Notification center** — Persistent (localStorage), budget alerts (80%/100% thresholds), due date reminders
