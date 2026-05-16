---
name: Lúmen — Gestão Financeira
description: >
  Personal finance dashboard for Brazilian users. Swiss-editorial aesthetic: high contrast,
  brutally precise typography, zero decorative noise. A "financial newspaper" for your
  pocket money — every pixel justifies its existence.

colors:
  # ── Core surfaces ──
  background: "#F8FAFC"
  surface: "#FFFFFF"
  surface-low: "#F1F5F9"
  surface-border: "#E2E8F0"

  # ── Brand ──
  primary: "#0F766E"
  primary-light: "#14B8A6"
  primary-foreground: "#FFFFFF"
  primary-glow: "rgba(15, 118, 110, 0.15)"

  # ── Navy sidebar ──
  navy: "#0A1628"
  navy-light: "#1E293B"
  navy-overlay: "rgba(255,255,255,0.07)"
  navy-active: "rgba(255,255,255,0.15)"

  # ── Text ──
  foreground: "#0F172A"
  muted-foreground: "#64748B"
  on-navy: "#FFFFFF"
  on-navy-muted: "rgba(255,255,255,0.50)"

  # ── Semantic ──
  success: "#059669"
  success-bg: "#ECFDF5"
  danger: "#DC2626"
  danger-bg: "#FEF2F2"
  warning: "#D97706"
  warning-bg: "#FFFBEB"
  info: "#0284C7"
  info-bg: "#F0F9FF"

  # ── Chart / finance ──
  chart-income: "#1A5C3A"
  chart-expense: "#991B1B"
  chart-investment: "#C2410C"
  chart-neutral: "#78716C"

  # ── KPI accent tops ──
  kpi-income-accent: "#10B981"
  kpi-expense-accent: "#EF4444"
  kpi-balance-accent: "#78716C"
  kpi-investment-accent: "#F59E0B"

  # ── Skeleton ──
  skeleton-base: "#E2E8F0"
  skeleton-shine: "#F1F5F9"

typography:
  display:
    fontFamily: "Inter"
    fontSize: "60px"
    fontWeight: 700
    lineHeight: "1.0"
    letterSpacing: "-0.03em"
    fontVariantNumeric: "tabular-nums"
    note: "Hero balance figure — the newspaper headline"

  display-sm:
    fontFamily: "Inter"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "1.2"
    letterSpacing: "-0.02em"
    fontVariantNumeric: "tabular-nums"
    note: "KPI card values"

  headline:
    fontFamily: "Inter"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: "28px"

  title:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 700
    lineHeight: "20px"
    letterSpacing: "0.3px"
    textTransform: "uppercase"
    note: "Section card headers — all-caps label style"

  body-lg:
    fontFamily: "Inter"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"

  body-sm:
    fontFamily: "Inter"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "16px"

  label:
    fontFamily: "Inter"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.08em"
    textTransform: "uppercase"
    note: "KPI sub-labels, table column headers"

  mono-number:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
    letterSpacing: "-0.02em"
    fontVariantNumeric: "tabular-nums"
    fontFeatureSettings: "\"tnum\""
    note: "All currency values, account numbers, transaction amounts"

  mono-kbd:
    fontFamily: "'Fira Code', monospace"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "16px"
    note: "Keyboard shortcut hints in sidebar nav items"

rounded:
  sm: "4px"
  DEFAULT: "6px"
  md: "6px"
  lg: "6px"
  full: "9999px"
  note: >
    Border radii are intentionally near-flat (4–6 px). The design deliberately avoids
    rounded-xl friendliness in favour of editorial sharpness. Only pills/badges use full.

spacing:
  unit: "8px"
  xs: "4px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "40px"
  card-padding: "20px"
  section-padding: "24px"
  sidebar-width: "264px"
  sidebar-collapsed: "76px"
  header-height: "40px"
  mobile-header-height: "56px"
  mobile-nav-height: "64px"

shadows:
  sm: "0 1px 2px 0 rgba(15, 23, 42, 0.05)"
  card: "0 1px 3px 0 rgba(15, 23, 42, 0.10), 0 1px 2px -1px rgba(15, 23, 42, 0.10)"
  card-hover: "0 10px 15px -3px rgba(15, 23, 42, 0.10), 0 4px 6px -4px rgba(15, 23, 42, 0.10)"
  float: "0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.10)"
  focus-ring: "0 0 0 2px rgba(15, 118, 110, 0.15)"

elevation:
  page: "background: #F8FAFC (base canvas)"
  card: "white surface, 1px #E2E8F0 border, shadow-card"
  sidebar: "navy #0A1628, no border, full viewport height"
  modal: "white, shadow-float, 1px border, backdrop blur(4px)"
  tooltip: "card background, 1px border, shadow-card, radius 2px"

motion:
  easing-standard: "ease-out"
  easing-spring: "cubic-bezier(0.22, 1, 0.36, 1)"
  easing-sidebar: "cubic-bezier(0.4, 0, 0.2, 1)"

  fade-in: "opacity 0→1, translateY 6px→0, 350ms ease-out"
  fade-in-up: "opacity 0→1, translateY 12px→0, 450ms ease-out"
  scale-in: "opacity 0→1, scale 0.97→1, 200ms ease-out"
  slide-in-right: "opacity 0→1, translateX 8px→0, 300ms ease-out"
  count-up: "opacity 0→1, translateY 3px→0, 300ms ease-out"
  ticker: "opacity 0→1, translateY 8px→0, 400ms ease-out"
  accordion: "height 0→auto, 200ms ease-out"
  shimmer: "background-position sweep, 1.5s ease-in-out infinite"
  progress-bar: "width transition, 700ms cubic-bezier(0.22, 1, 0.36, 1)"
  interactive: "all 150ms ease (buttons, links)"
  card-shadow: "box-shadow 250ms ease, border-color 250ms ease"
  sidebar: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)"

components:
  # ── Navigation sidebar ──
  sidebar:
    backgroundColor: "#0A1628"
    width: "264px"
    widthCollapsed: "76px"
    transition: "all 300ms cubic-bezier(0.4, 0, 0.2, 1)"

  sidebar-nav-item:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.50)"
    rounded: "6px"
    padding: "10px 12px"
    note: "text-sm font-medium"

  sidebar-nav-item-active:
    backgroundColor: "rgba(255,255,255,0.15)"
    textColor: "#FFFFFF"
    borderLeft: "3px solid #0F766E"
    iconColor: "#14B8A6"
    note: "Active page indicator: 3px primary-colored left edge bar"

  sidebar-logo:
    shape: "hexagon clip-path polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)"
    size: "36px"
    backgroundColor: "#0F766E"
    textColor: "#FFFFFF"
    fontFamily: "'Fira Code', monospace"

  # ── Cards ──
  card:
    backgroundColor: "#FFFFFF"
    border: "1px solid #E2E8F0"
    rounded: "6px"
    shadow: "0 1px 3px 0 rgba(15,23,42,0.10), 0 1px 2px -1px rgba(15,23,42,0.10)"
    shadowHover: "0 10px 15px -3px rgba(15,23,42,0.10), 0 4px 6px -4px rgba(15,23,42,0.10)"
    padding: "20px"

  kpi-card:
    backgroundColor: "#FFFFFF"
    border: "none"
    shadow: "{shadows.card}"
    accentBar: "3px colored top strip (emerald/red/stone/amber per variant)"
    padding: "20px"
    rounded: "6px"
    note: "Color-coded top accent strip drives at-a-glance variant recognition"

  kpi-card-income:
    accentColor: "#10B981"
    iconBg: "#D1FAE5"
    iconColor: "#059669"
    valueColor: "#1A5C3A"

  kpi-card-expense:
    accentColor: "#EF4444"
    iconBg: "#FEE2E2"
    iconColor: "#EF4444"
    valueColor: "#991B1B"

  kpi-card-balance:
    accentColor: "#78716C"
    iconBg: "#F5F5F4"
    iconColor: "#78716C"
    valueColor: "#44403C"

  kpi-card-investment:
    accentColor: "#F59E0B"
    iconBg: "#FEF3C7"
    iconColor: "#D97706"
    valueColor: "#92400E"

  # ── Buttons ──
  button-primary:
    backgroundColor: "#0F766E"
    textColor: "#FFFFFF"
    rounded: "6px"
    height: "36px"
    padding: "0 16px"
    fontSize: "14px"
    fontWeight: 600
    shadow: "{shadows.sm}"
    hoverOpacity: 0.9
    transition: "all 200ms"

  button-secondary:
    backgroundColor: "#F1F5F9"
    textColor: "#1E293B"
    rounded: "6px"
    height: "36px"
    padding: "0 16px"

  button-outline:
    backgroundColor: "transparent"
    border: "1px solid #E2E8F0"
    textColor: "#0F172A"
    rounded: "6px"

  button-ghost:
    backgroundColor: "transparent"
    textColor: "#64748B"
    hoverBg: "#F1F5F9"
    rounded: "6px"

  button-destructive:
    backgroundColor: "#DC2626"
    textColor: "#FFFFFF"
    rounded: "6px"

  button-icon:
    size: "36px"
    rounded: "6px"

  # ── Inputs ──
  input:
    backgroundColor: "#FFFFFF"
    border: "1px solid #E2E8F0"
    rounded: "6px"
    padding: "10px 14px"
    fontSize: "14px"
    focusBorder: "#0F766E"
    focusShadow: "0 0 0 2px rgba(15,118,110,0.15)"
    transition: "border-color 200ms, box-shadow 200ms"

  # ── Badges ──
  badge-income:
    backgroundColor: "#ECFDF5"
    textColor: "#059669"
    border: "1px solid rgba(5,150,105,0.2)"
    rounded: "6px"
    padding: "2px 10px"
    fontSize: "12px"
    fontWeight: 600

  badge-expense:
    backgroundColor: "#FEF2F2"
    textColor: "#DC2626"
    border: "1px solid rgba(220,38,38,0.2)"
    rounded: "6px"

  badge-investment:
    backgroundColor: "#F0F9FF"
    textColor: "#0284C7"
    border: "1px solid rgba(2,132,199,0.2)"
    rounded: "6px"

  # ── Trend pills ──
  trend-pill:
    rounded: "9999px"
    padding: "5px 10px"
    fontSize: "12px"
    fontWeight: 700

  trend-pill-up-good:
    backgroundColor: "hsl(155 40% 92%)"
    textColor: "#1A5C3A"

  trend-pill-up-bad:
    backgroundColor: "#FEF2F2"
    textColor: "#B91C1C"

  # ── Charts ──
  chart-bar:
    barSize: "12px"
    maxBarSize: "40px"
    borderRadius: "[6, 6, 0, 0]"
    incomeColor: "#1A5C3A"
    expenseColor: "#991B1B"

  chart-donut:
    innerRadius: "50px"
    outerRadius: "80px"
    incomeColor: "#1A5C3A"
    expenseColor: "#991B1B"

  chart-grid:
    strokeDasharray: "3 3"
    stroke: "#E2E8F0"
    strokeOpacity: 0.5

  chart-tooltip:
    backgroundColor: "#FFFFFF"
    border: "1px solid #E2E8F0"
    rounded: "2px"
    fontSize: "12px"
    padding: "8px 12px"
    shadow: "0 8px 24px rgba(0,0,0,0.10)"

  # ── Hero balance ──
  hero-balance-positive:
    textColor: "#1A5C3A"
    fontFamily: "Inter"
    fontSize: "60px"
    fontWeight: 700

  hero-balance-negative:
    textColor: "#991B1B"

  hero-divider:
    height: "1px"
    backgroundColor: "#C2410C"
    opacity: 0.3
    marginTop: "16px"
    note: "Burnt-orange editorial rule — the newspaper's column separator"

  # ── Sections ──
  section-card:
    backgroundColor: "#FFFFFF"
    border: "1px solid #E2E8F0"
    rounded: "6px"
    shadow: "{shadows.sm}"
    padding: "24px"

  section-card-header:
    borderBottom: "1px solid #E2E8F0"
    paddingBottom: "16px"
    marginBottom: "20px"

  section-card-icon:
    size: "34px"
    backgroundColor: "#F1F5F9"
    border: "1px solid #E2E8F0"
    rounded: "1px"
    iconColor: "#64748B"

  section-card-title:
    fontSize: "14px"
    fontWeight: 700
    letterSpacing: "0.3px"
    textTransform: "uppercase"
    textColor: "#64748B"

  # ── Transaction list items ──
  transaction-item:
    padding: "14px 0"
    borderBottom: "1px solid #E2E8F0"
    hoverBackground: "#F1F5F9"
    hoverBorderRadius: "4px"
    transition: "background 200ms"

  # ── Empty state ──
  empty-state:
    padding: "48px 24px"
    iconSize: "64px"
    iconBg: "#F1F5F9"
    iconBorder: "1px solid #E2E8F0"
    iconRounded: "6px"

  # ── Mobile FAB ──
  fab:
    backgroundColor: "#0F766E"
    textColor: "#FFFFFF"
    size: "56px"
    rounded: "9999px"
    shadow: "{shadows.float}"
    position: "fixed bottom-20 right-4"

  # ── Modal overlay ──
  modal-overlay:
    backgroundColor: "rgba(18, 16, 14, 0.65)"
    backdropFilter: "blur(4px)"

  modal-content:
    backgroundColor: "#FFFFFF"
    border: "1px solid #E2E8F0"
    rounded: "6px"
    shadow: "{shadows.float}"
    padding: "28px"

  # ── Notification badge ──
  notif-badge:
    backgroundColor: "#EF4444"
    textColor: "#FFFFFF"
    minWidth: "16px"
    height: "16px"
    rounded: "9999px"
    fontSize: "10px"
    fontWeight: 700
---

## Brand & Style

Lúmen is a personal finance management app for Brazilian users built on the principle that financial data should feel like **reading a serious newspaper** — precise, high-contrast, and completely free of decorative noise. The design ethos is described internally as *"Swiss Style. High contrast, precise, clean"* with the hero balance being "The headline of your financial newspaper."

The aesthetic sits in a rare middle ground: **editorial minimalism with utilitarian rigour**. Where most fintech apps reach for rounded corners, soft gradients, and playful illustrations to reduce anxiety, Lúmen doubles down on sharpness and clarity — trusting that honest data presentation, not visual reassurance, is what financially literate users actually want.

The sidebar/main-area contrast is the central spatial drama: a deep **navy (#0A1628)** sidebar functions as the masthead while the **near-white (#F8FAFC) main canvas** is the broadsheet page. Text lives at Slate 900 / Teal 700 — no gradients, no blurred glass panels, just ink on paper.

## Brand Identity

The **Lúmen logo** is rendered in a hexagonal clip-path — six-sided, like a crystal or a carbon lattice. The letterform "L" appears in Fira Code monospace inside the teal hexagon, connecting the brand to precision, code, and light (lúmen = unit of luminous flux). The wordmark uses `font-display: swap` Inter with tight tracking.

The name transition from "Rattio" to "Lúmen" is visible in legacy CSS comments — the new identity leans into the light-and-clarity metaphor rather than ratio/analytics framing.

## Colors

### Light Mode Palette

The palette is built from the **Tailwind slate scale** for neutrals (extremely low-saturation cool grays), with **Teal 700 (#0F766E)** as the sole saturated brand color. This single-hue discipline gives the UI remarkable coherence: teal appears on primary buttons, active sidebar state, focus rings, chart income bars, and the financial health score — all tied to one meaning.

Semantic colors are deliberately separate from brand: **Emerald (#059669)** for income/positive, **Red (#DC2626)** for expense/negative, **Amber (#D97706)** for warnings. These follow financial convention (green = money in, red = money out) without competing with the teal brand.

The **chart palette** uses intentionally darker, more editorial variants: income is Forest Green (#1A5C3A), expense is Deep Crimson (#991B1B), and investment is Burnt Orange (#C2410C). These are not the same as the success/danger UI colors — they're print-ink tones that read well on white paper-like chart backgrounds.

### The Editorial Accent

A **burnt-orange horizontal rule (#C2410C at 30% opacity)** appears below the hero balance figure. This is the only purely decorative element in the entire design system — it references the dividing rules in newspaper column layouts and acts as a visual "dateline" for the month's financial summary.

### Dark Mode

The dark mode inverts the page surface to near-black while keeping the navy sidebar intact (it barely changes). Cards shift to dark slate (#1E293B surface) with adjusted foreground values.

## Typography

**Inter** is the sole typeface for all UI text. The choice is deliberate: Swiss editorial tradition favors neutral grotesque sans-serifs — Helvetica in print, Inter on screen. Inter's optical precision at 11–14px (the density of a financial dashboard) is unmatched.

**JetBrains Mono / Fira Code** handles all financial figures. Every currency value, account balance, and numeric metric uses `font-variant-numeric: tabular-nums` with `letter-spacing: -0.02em` — numbers align vertically in columns, and the slightly condensed tracking packs more digits into tight card spaces without sacrificing legibility.

### Type Hierarchy in Practice

- **Display (60px, weight 700):** Hero balance only. This is the *lede* — the most important number. Users should be able to read it from across the room.
- **Display-SM (22px, weight 700):** KPI card values. Second headline tier.
- **Title (14px, 700, uppercase, tracking 0.3px):** Section headers. All-caps with slight letter-spacing signals "label" vs "content."
- **Label (11px, 600, uppercase, tracking 0.08em):** KPI sub-labels ("AVAILABLE THIS MONTH"). Extreme upper-case at small scale maintains hierarchy without size.
- **Body (14px / 12px, 400):** Standard content text.
- **Mono-number (14px, tabular):** All displayed monetary values below hero tier.

## Layout & Spacing

The layout follows a **desktop-first sidebar + content panel** model. On desktop, a fixed 264px navy sidebar (collapsible to 76px icon rail) frames the main content area. On mobile, the sidebar becomes a slide-over sheet and a bottom navigation bar (64px height) replaces primary navigation — with a floating action button (FAB) for the primary create action.

The **8px base grid** governs all spacing decisions. Notable spatial choices:

- Section cards use 24px internal padding — generous enough to breathe, never wasteful.
- KPI cards use 20px padding to accommodate their compact 4-column grid.
- Section-card-headers include a bottom border + 16px bottom padding before content — the newspaper's "section headline" convention.
- Chart bars are 12px wide with rounded tops, max 40px — thin editorial bars rather than chunky Business Intelligence style pillars.

## Elevation & Depth

Lúmen uses the **minimum elevation necessary**. There are only four shadow values:

1. **shadow-sm:** Barely perceptible (0 1px 2px, 5% opacity) — used for in-page elements that need micro-separation.
2. **shadow-card:** The standard card shadow (1px Y, 10% opacity) — establishes surface hierarchy without drama.
3. **shadow-card-hover:** Reveals on hover (10px Y, 10% opacity) — subtle lift feedback.
4. **shadow-float:** Modals and the FAB (20px Y, 10% opacity) — highest elevation tier.

All shadows use **Slate 900 as the shadow color** (rgba(15, 23, 42, ...)) — cool-toned, not warm. This avoids the muddy gray-brown shadows common in UI kits.

No glassmorphism, no backdrop blurs on cards (except modal overlays), no gradient meshes. The design communicates depth through **border contrast and shadow size alone**.

## Shapes

The design aggressively suppresses border radius. Where shadcn/ui ships with `border-radius: 0.5rem (8px)` as DEFAULT, Lúmen overrides this to **2px** for cards and form elements, **6px** for the CSS custom property `--radius`. The practical effect: cards look like ledger pages, inputs look like form fields in a financial instrument, not a consumer app.

The only exceptions:
- **Pills and badges:** `9999px` — the semantic function (status label, trend indicator) justifies a differentiated shape.
- **Logo hexagon:** A CSS `clip-path` polygon — six angles for the brand mark only.
- **Progress bars:** `9999px` for the track — standard convention, visually subordinate.
- **Scrollbar thumb:** `999px` — invisible at 4px width anyway.

## Components

### KPI Cards

The four KPI cards (Income, Expenses, Balance, Investment) are the cognitive anchor of the dashboard. Each card carries a **3px colored accent bar along the top edge** — the only use of color on the card surface itself. This strip provides at-a-glance variant recognition without coloring the entire background (which would reduce text contrast and create visual noise in a 4-card row).

Inside each card: uppercase tracking label at 11px → mono value at 22px → tiny delta arrow with percentage. Three tiers of information in 80px of vertical space.

### Hero Balance

The hero balance is typographically the most ambitious element: 60px Inter Bold at letter-spacing `-0.03em`. Below it sits a 10px uppercase label (`"DISPONÍVEL ESTE MÊS"`) and a contextual subtitle. The burnt-orange rule (`h-px bg-[#C2410C] opacity-30`) closes the hero section — a deliberate editorial gesture. Nothing else in the UI uses this color.

### Sidebar Navigation

Each nav item shows a **keyboard shortcut `<kbd>` badge** (Fira Code, 10px, white/8% background) that fades in on hover. This treats the sidebar as a command palette entry point, not just a link list. The active state uses a **3px teal left-edge bar** (not a full background fill) — a vertical accent mark, like a margin annotation.

The sidebar footer contains three utility actions: theme toggle, keyboard shortcuts help, and collapse toggle. These are styled identically to nav items (subdued white/40 text, hover to white) — part of the nav, never dominant.

### Charts

Bar charts use thin 12px bars with rounded tops only (`[6, 6, 0, 0]`), reading as clean vertical marks rather than wide histogram bins. Donut charts use a 50px inner radius (significant hole) to keep the center visible for label overlays. Chart grid lines are dashed (3 3) at 50% opacity — present for alignment but invisible at a glance.

Tooltips are minimal: `border-radius: 2px` (matching the overall near-flat radius), 12px font, 8px/12px padding. Shadow is deliberately generous (0 8px 24px, 10% opacity) to ensure tooltip floats clearly above content without a border-heavy box.

### Transaction List

Each transaction item uses a `padding: 14px 0` with a bottom border — **no card wrapping**. On hover, the item gains a background fill and momentarily shifts its padding to `14px 10px` with a negative margin (-10px) — the "expanding row" pattern that adds visual depth without layout reflow. This is the application's most elegant micro-interaction.

### Financial Health Score

A single 0–100 score computed across four financial criteria (savings rate, budget adherence, active goals, positive balance). Displayed as a large number with a labeled progress bar. The score bar uses `transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1)` — an overshoot-adjacent spring easing that makes the fill feel alive, not mechanical.

### Empty States

Empty state containers use a **square icon well** (`64px × 64px`, `border-radius: 6px`, `border: 1px solid #E2E8F0`, `background: #F1F5F9`) rather than the industry-standard circular avatar or illustration. The square matches the overall card aesthetic and renders cleanly at any icon size.

## Accessibility & Internationalisation

- All monetary values are wrapped in `aria-label` attributes with formatted text.
- Charts have `sr-only` siblings with textual summaries of the data.
- Active navigation items carry `aria-current="page"`.
- An `aria-live="polite"` announcer fires on every navigation and modal open.
- A `<kbd>` shortcuts modal (`?` key) documents all global keyboard shortcuts.
- All content is in Portuguese (Brazilian). Month names, currency formatting (`R$ 1.234,56`), and date formats follow pt-BR conventions.
- Focus rings use `outline: 2px solid #0F766E; outline-offset: 2px` — clearly visible against all surface colors.

## Motion Philosophy

Animations are **page-entry only** — no continuous animations on stable UI elements (except skeleton loaders and the pulse-dot indicator). The stagger pattern is: content block fades in with `animation-delay: 0.1s` increments — enough to guide the eye through the hierarchy without feeling choreographed.

The `scale-in` (0.97→1) and `fade-in` (translateY 6px→0) effects are deliberately subtle — financial dashboards require cognitive stillness. The goal is that the user notices the data, not the animation.

The one exception is the FAB expand interaction, which uses radial expansion of sub-actions — a high-affordance moment justified by its critical function (creating income/expense/transfer records).
