# UI-REVIEW — Lúmen Gestão Financeira

**Date:** 2026-05-16 · **Overall:** 19/24

| Pillar | Score |
|--------|-------|
| Copywriting | 3/4 |
| Visuals | 3/4 |
| Color | 3/4 |
| Typography | 4/4 |
| Spacing | 3/4 |
| Experience Design | 3/4 |

---

## 1. Copywriting — 3/4

### Strengths
- **Consistent pt-BR voice.** All UI text is in Brazilian Portuguese — labels, toasts, empty states, modals. Natural and localised.
- **UPPERCASE conventions applied systematically.** KPI labels (`"DISPONÍVEL ESTE MÊS"`), filter pills (`"TODOS"`, `"RECEITAS"`), section headers — all uppercase with letter-spacing. Conveys editorial authority.
- **Clear microcopy in toasts.** Deletion shows undo action with transaction name. CSV import reports exact counts (`"23 transação(ões) ignorada(s)"`).
- **Empty-state copy is helpful.** `"Sem transações neste mês"`, `"Ajuste os filtros de busca ou adicione um novo registro para começar."` — actionable, not dead-end.
- **Keyboard shortcut modal.** Accessible via `?` key, documents all shortcuts in Portuguese with `<kbd>` badges. Thoughtful.

### Issues

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 1 | LOW | `Dashboard.jsx:275` | `"Ver Tudo"` — initial caps inconsistent with surrounding all-uppercase labels. | Use `"VER TUDO"` to match section style. |
| 2 | LOW | `Transactions.jsx:444-454` | `"Meta de Economia"` card shows hardcoded `R$ 0,00` and `0% concluído`. Appears to be a placeholder. | Wire to real savings goal data or remove. |
| 3 | LOW | `Layout.jsx:348` | Search bar placeholder `"Buscar transações..."` uses ellipsis but no other placeholder does. | Drop ellipsis for consistency: `"Buscar transações"`. |
| 4 | LOW | Multiple | Mixed icon libraries. Lucide icons used alongside Material Symbols in the same views (e.g., `TrendingUp` from lucide vs `trending_up` from Material Symbols). | Choose one icon system per component. The design_lumen.md specifies Material Symbols; use those throughout. |

### Recommendation
Standardise casing: all interactive labels in all-caps with tracking, descriptive prose in sentence case. Settle on Material Symbols exclusively (already the dominant system).

---

## 2. Visuals — 3/4

### Strengths
- **KPI cards with 3px accent bars.** The colored top strip provides instant variant recognition without background colouring. Clean, non-garish. Matches design_lumen.md spec precisely.
- **Hero balance + editorial rule.** 60px display figure followed by a burnt-orange 1px divider (`bg-editorial-rule`). The most distinctive visual element in the app — newspaper headline metaphor executed perfectly.
- **Transaction row micro-interactions.** Hover expands padding/margin with background fill (`margin: -4px, padding: +4px`). Subtle, non-layout-shifting. Excellent.
- **Navy sidebar constant across themes.** The navy sidebar (`#0A1628`) stays dark in both light and dark modes — anchors the layout. Good architectural decision.
- **Minimal shadows. Dark mode zero-shadow rule.** Shadows reset to `none` in dark mode (except float). Depth achieved via tonal surface layering — exactly as DESIGN.md prescribes.
- **Swipe-to-delete on mobile.** Native-feeling gesture for transaction rows. Well-implemented.
- **FAB with expand animation.** Main button rotates to X, sub-actions animate in with staggered `animate-fade-in`. High affordance.

### Issues

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 5 | MEDIUM | `Dashboard.jsx:318-370` vs `Transactions.jsx:381-417` | Two competing KPI card implementations. Dashboard uses the shared `KpiCard` component (clean). Transactions page uses inline `<div>` cards with hardcoded colours. Visual inconsistency between pages. | Refactor Transactions KPI row to use the shared `KpiCard` component. |
| 6 | LOW | `Dashboard.jsx:319` | Health score card uses `border-2` introducing variable border width. All other cards use `border` (1px). | Change to `border` for consistency. |
| 7 | LOW | `Transactions.jsx:334-340` | CSV/EXCEL/New buttons use three different visual styles (outline, outline, solid respectively). The grouping is clear but the solid `bg-inverse-surface` pill stands out oddly. | Unify action button style: all outline with icon, or use Button component variants. |
| 8 | LOW | `Layout.jsx:259-264` | Logo uses `<img>` with hardcoded `w-14 h-14`. The `design_lumen.md` specifies a 36px hexagonal logo with CSS clip-path. | Implement hexagon logo via CSS `clip-path: polygon(50% 0%, 100% 25%, ...)` matching the spec. |
| 9 | LOW | `TransactionRow.jsx:39-112` | Two entirely separate render paths for mobile vs desktop (duplicate markup). Mobile uses `lg:hidden`, desktop uses `hidden lg:grid`. Doubles DOM weight. | Use responsive classes on a single render path: `className="grid ... md:grid lg:grid"`. |

### Recommendation
Consolidate KPI card rendering into the shared `KpiCard` component. Implement the hexagonal logo. Collapse TransactionRow into a single responsive render.

---

## 3. Color — 3/4

### Strengths
- **Single-hue brand discipline.** Teal 700 (`#0F766E`) is the only saturated brand color. Appears on: primary buttons, active sidebar state, focus rings, chart income bars, progress fills. Coherent.
- **Semantic separation from brand.** Emerald for income/green, Red for expense/negative, Amber for warnings — these are financial convention colours that don't compete with teal branding. Good decision.
- **Editorial accent colour.** Burnt orange (`#C2410C` at 30% opacity) used ONLY for the hero divider rule. Unique identifier — no other element uses this colour.
- **Dark mode fully tokenised.** Every CSS variable has a `[data-theme="dark"]` override. Dark mode inverts surface tones while keeping semantic meaning intact. Navy sidebar stays constant.
- **CSS custom properties for theme switching.** `var(--primary-hex)`, `var(--surface)`, etc. — single source of truth. Theme toggle changes one `data-theme` attribute.
- **Focus ring visible.** `outline: 2px solid #0F766E; outline-offset: 2px` — visible against all surfaces in both themes.

### Issues

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 10 | MEDIUM | `KpiCard.jsx:5-9` | KPI value colour is always `text-on-surface` (generic). design_lumen.md specifies variant-specific colours: income `#1A5C3A`, expense `#991B1B`, balance `#44403C`, investment `#92400E`. | Apply `KPI_STYLES[variant].valueColor` to the value text. |
| 11 | LOW | `Transactions.jsx:463-479` | Filter pills use hardcoded colour classes (`bg-emerald-600`, `bg-red-600`, `bg-violet-600`) bypassing semantic CSS variables. | Use `bg-kpi-income`, `bg-kpi-expense`, `bg-info` tokens instead. |
| 12 | LOW | `Dashboard.jsx:252` | Alert banner uses `bg-error-container` with `border border-danger/20` — opacity on border creates subtle rendering differences across browsers. | Use solid `border-error-container` or a dedicated token. |
| 13 | LOW | `Dashboard.jsx:390-396` | AI analysis card uses `bg-on-primary-fixed` + `text-on-primary`. This fixed-colour combination doesn't adapt to dark mode cleanly (on-primary-fixed is a light-mode token). | Use `bg-primary-container` with `text-on-primary-container` for theme-safe rendering. |

### Recommendation
Restore variant-specific value colours in KpiCard. Replace hardcoded Tailwind colour classes with semantic tokens (`kpi-income`, `kpi-expense`, etc.) throughout the Transactions filter bar.

---

## 4. Typography — 4/4

### Strengths
- **Clear type hierarchy.** Display (60px) → Display-SM (22px) → Headline (18px) → Title (14px/caps) → Label (11px/caps) → Body (14px/12px) → Mono-number (14px). Six tiers, each with a defined role. No ambiguity.
- **Inter-only UI typeface.** One grotesque sans-serif for all interface text. Swiss editorial tradition — consistent, readable, no distractions. Matches `design_lumen.md` exactly.
- **JetBrains Mono / Fira Code for financial figures.** Every currency value uses `font-variant-numeric: tabular-nums` + `letter-spacing: -0.02em`. Numbers align vertically in columns. Critical for financial data scanning.
- **Uppercase labels with tracking.** Section headers and filter pills use `font-weight: 700`, `letter-spacing: 0.3px` (title) or `0.08em` (label). The distinction between "label" and "content" is visually immediate.
- **Monospace keyboard shortcuts.** `<kbd>` badges in sidebar nav use Fira Code at 10px — different from body text, visually distinct, scannable.
- **Tailwind config mirrors design tokens exactly.** `fontSize`, `fontFamily`, `letterSpacing` in `tailwind.config.js` are direct translations of `design_lumen.md` typography scales.
- **No font loading flash.** Inter is system-ui fallback compatible; JetBrains Mono loads asynchronously but tabular-nums works with Consolas fallback.

### Issues — None critical

No issues identified. The typography system is fully implemented per spec. Minor observations:
- Filter pill text at 10px (`text-[10px]`) is below WCAG recommended minimum (12px) but is bold + uppercase which aids legibility. Acceptable for label-only text.
- `formatCurrency` produces `R$ 1.234,56` — Brazilian locale formatting is correct and applied consistently.

### Recommendation
Keep as-is. Consider bumping filter pill text to 11px to match `label-caps` size, but 10px is functional for the current density target.

---

## 5. Spacing — 3/4

### Strengths
- **8px base grid.** `spacing.unit: 8px` in tailwind config. All custom spacing (`xs: 4px`, `sm: 12px`, `md: 16px`, `lg: 24px`, `xl: 40px`) are multiples or halves of 8px. Rigid, predictable.
- **Responsive layout system.** Desktop: fixed sidebar (264px/76px) + fluid content. Mobile: bottom nav (64px) + FAB + slide-over sidebar. Breakpoints clean — `md:` for sidebar presence, `lg:` for multi-column grids.
- **Card padding consistent.** KPI cards: 20px. Section cards: 24px. Transaction items: 14px vertical. All within the design spec.
- **Sidebar dimensions.** 264px expanded, 76px collapsed — matches `design_lumen.md` exactly. Transition `cubic-bezier(0.4, 0, 0.2, 1)` for smooth collapse.
- **FAB positioning.** `bottom-20 right-4` on mobile — accessible thumb zone. Fixed position, always available.

### Issues

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 14 | MEDIUM | Multiple pages | Inconsistent content padding. Dashboard uses `py-xl mb-md` (Tailwind extended). Transactions uses `p-4 lg:p-6`. Settings likely uses another pattern. | Standardise page-level padding: `px-lg py-xl` for all pages. |
| 15 | LOW | `Layout.jsx:362` | Main content area has `pt-header-height pb-mobile-nav-height md:pb-xl`. The `md:pb-xl` (40px) on desktop is disproportionate to the top padding (40px header). | Add symmetric top/bottom padding on desktop: `pt-header-height pb-xl`. |
| 16 | LOW | `Dashboard.jsx:259` | KPI grid uses `gap-md` (16px). On mobile single-column, this creates excessive vertical spacing between stacked KPI cards. | Use `gap-sm` (12px) on mobile, `gap-md` on larger screens: `gap-sm md:gap-md`. |
| 17 | LOW | `Layout.jsx:278` | Sidebar nav items have `px-lg py-sm` but the collapsed state uses `px-0`. In collapsed mode, click targets shrink to ~76px width — still adequate for touch (44px minimum) but narrow. | Ensure min touch target of 44px in collapsed state (already met: `px-0` with 76px width = 38px per side, but overall width exceeds 44px). Acceptable. No change needed. |

### Recommendation
Adopt a single page-level padding convention (`px-lg py-xl` or `p-lg`). Use responsive gap utilities for card grids that collapse from 4-col to 1-col.

---

## 6. Experience Design — 3/4

### Strengths
- **Comprehensive keyboard shortcuts.** `N` = new transaction, `/` = search, `1-7` = page navigation, `?` = shortcuts help, `Esc` = close. Works globally regardless of focus. No mouse required.
- **ARIA-first.** `aria-live="polite"` announcer on navigation. `aria-current="page"` on active nav items. `aria-label` on all icon-only buttons. Charts have `sr-only` text summaries.
- **prefers-reduced-motion support.** All animations disabled to 0.01ms when the OS preference is set. Comprehensive — covers `*`, `*::before`, `*::after`.
- **Undo pattern for deletions.** Deleting a transaction shows a toast with "Desfazer" button — recreates the transaction from saved data. Non-destructive UX. Excellent.
- **Staggered page-entry animations.** `fade-in` (350ms), `fade-in-up` (450ms), `scale-in` (200ms) — subtle enough to guide the eye without feeling choreographed. Matches motion philosophy.
- **Progress bar spring easing.** `cubic-bezier(0.22, 1, 0.36, 1)` at 700ms — overshoot-adjacent easing that makes fills feel alive, not mechanical.
- **Dark/light mode announcement.** Toggling theme triggers `announce("Modo escuro ativado")` — screen-reader accessible feedback.
- **Empty state design.** `64×64px` icon well with `border-radius: 6px` — square, not circular. Matches the near-flat card aesthetic.

### Issues

| # | Severity | Location | Issue | Fix |
|---|----------|----------|-------|-----|
| 18 | MEDIUM | `Layout.jsx:393-398` vs `Transactions.jsx:590-595` | Two independent FAB implementations. Layout.jsx places FAB at `bottom-24 right-6` with `bg-primary`. Transactions page places its own at same position with `bg-inverse-surface`. On desktop, neither should appear (mobile only) but both check `md:hidden` and `lg:hidden` differently. | Use single shared FAB component (or the existing `<FAB>` component at `src/components/ui/fab.jsx`). |
| 19 | LOW | `Dashboard.jsx:50` | Onboarding modal fires after 800ms delay. For returning users who already completed onboarding, the 800ms check-every-time pattern adds unnecessary latency to the initial render. | Cache the `onboarded` flag locally after first successful check to avoid repeated async verification. |
| 20 | LOW | `Layout.jsx:353-357` | Avatar is a generic person icon with no user-specific data. The `bg-primary-light` circle is always teal — if the user has a profile image, no avatar substitution exists. | Add `src` prop support using Base44 user metadata if available. Fall back to generic icon. |
| 21 | LOW | Multiple | Loading states lack skeleton screens in most views. `Dashboard.jsx` loads 4 data sources concurrently but shows only a spinner in `App.jsx` during auth. Between auth completion and data arrival, the page renders with zeros/empty state briefly. | Add `isLoading` checks with skeleton components (`.shimmer` classes exist in CSS but unused in JSX). |
| 22 | LOW | `Transactions.jsx:421-427` | Cross-month navigation warning (`"Nenhuma transação em Maio, mas há 12 transação(ões) em outros meses"`) uses explicit month name but only appears when `monthTx.length === 0` AND `otherMonthsCount > 0`. Edge case: if user lands on a month with 1 transaction (not zero), the hint never appears even if most data is elsewhere. | Consider showing the hint when `monthTx.length < 3` and `otherMonthsCount > monthTx.length` — a softer threshold. |

### Recommendation
Consolidate FAB into a single shared component. Add skeleton loading states between auth completion and data arrival (the `.shimmer` classes are already defined). Cache onboarding state.

---

## Top Fixes (Prioritised)

1. **Consolidate KPI card rendering.** Two implementations (Dashboard `KpiCard` component vs Transactions inline cards) cause visual inconsistency and maintenance burden. Refactor Transactions page to use shared `KpiCard`. *(Visuals #5, Color #10)*

2. **Restore variant-specific KPI value colours.** `KpiCard` renders all values as `text-on-surface` instead of the per-variant colours specified in `design_lumen.md` (income forest-green, expense deep-crimson). *(Color #10)*

3. **Unify FAB implementation.** Three FAB placements exist across Layout, Transactions, and the shared FAB component — with inconsistent styling, positioning, and visibility logic. *(Experience Design #18)*

4. **Add skeleton loading states.** The CSS `.shimmer` classes are defined but unused. Pages briefly render with zero values while data loads. Wire `isLoading` from React Query into skeleton components. *(Experience Design #21)*

5. **Standardise page-level padding.** Dashboard, Transactions, and other pages use different padding conventions making the layout feel uncalibrated. *(Spacing #14)*

---

## Design System Compliance Matrix

| Spec (design_lumen.md) | Implemented | Notes |
|------------------------|-------------|-------|
| Navy sidebar (#0A1628) | ✓ Yes | Constant across themes |
| Teal 700 primary (#0F766E) | ✓ Yes | Brand colour in CSS vars |
| Inter-only UI typeface | ✓ Yes | `font-family: 'Inter'` on body |
| Mono financial numbers (tabular-nums) | ✓ Yes | `.tabular-nums` class + tailwind config |
| 60px hero display | ✓ Yes | `text-display-hero` with correct tracking |
| KPI accent bars (3px top strip) | ✓ Yes | Both Dashboard and Transactions pages |
| Editorial rule (#C2410C at 30%) | ✓ Yes | `.hero-rule` + `bg-editorial-rule` |
| Shadow tiers (4 levels) | ✓ Yes | sm → card → card-hover → float |
| Dark mode zero shadows (tonal layering) | ✓ Yes | `[data-theme="dark"]` resets to `none` |
| 8px base grid | ✓ Yes | `spacing.unit: 8px` |
| 6px border radius (near-flat) | Partial | `var(--radius): 6px` but shadcn components may override |
| Hexagonal logo | ✗ No | Uses rectangular `<img>` instead |
| Material Symbols icons | Partial | Mixed with Lucide in several places |
| Swiss editorial aesthetic | ✓ Yes | Clean, high-contrast, zero decorative noise |

---

## Accessibility Quick-Check

| Criterion | Status |
|-----------|--------|
| aria-live announcer | ✓ Present |
| aria-current on nav | ✓ Present |
| aria-label on icon buttons | ✓ Present |
| sr-only chart summaries | ✓ Present |
| Focus ring visible (both themes) | ✓ 2px teal, 2px offset |
| prefers-reduced-motion | ✓ All animations disabled |
| Keyboard navigation (Tab) | ✓ Standard focus order |
| Keyboard shortcuts | ✓ N, /, 1-7, ?, Esc, Cmd+K |
| Color contrast (light mode) | ✓ Teal on white = 4.7:1+ |
| Color contrast (dark mode) | ✓ Light text on navy/slate passes |
| Minimum touch target (44px) | ✓ FAB = 56px, nav items = 44px+ |
| Font size minimum (12px) | ⚠ Filter pills at 10px |

---

## Summary

Lúmen's UI is **well-executed and unusually disciplined** for a codebase of this size (~55 frontend files, 9,800+ lines). The editorial aesthetic ("Swiss-style financial newspaper") is not just documented — it's implemented consistently across CSS variables, Tailwind config, component design, and motion philosophy.

**What's working exceptionally well:**
- Type system and hierarchy
- Colour tokenisation with dual-theme support
- Keyboard-first accessibility
- Transaction row micro-interactions
- Undo pattern for destructive actions

**What needs attention:**
- KPI card consolidation (two implementations)
- FAB fragmentation (three placements)
- Missing skeleton states between auth and data
- Hardcoded colour classes in Transactions filters
- Page-level padding standardisation

**Score: 19/24** — Strong editorial foundation with targeted cleanup opportunities. The gap from 19 to 22-24 lies entirely in consolidation and consistency, not in missing features or broken patterns.
