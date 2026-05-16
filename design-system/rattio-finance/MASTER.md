# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Rattio/Lúmen — Gestão Financeira
**Maintained:** Manual (alinhado com `design_lumen.md`)
**Category:** Personal Finance Dashboard

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#0F766E` | `--primary` | Teal 700 — brand, buttons, focus rings, active states |
| Primary Light | `#14B8A6` | `--primary-light` | Teal 500 — hover states, secondary accents |
| Navy | `#0A1628` | `--sidebar-bg` | Sidebar background, fixed across themes |
| Navy Light | `#1E293B` | `--navy-light` | Sidebar hover surfaces |
| Background | `#F8FAFC` | `--background` | Slate 50 — light mode page canvas |
| Surface | `#FFFFFF` | `--surface` | Card backgrounds, input fields |
| Surface Low | `#F1F5F9` | `--surface-low` | Secondary surfaces, hover backgrounds |
| Foreground | `#0F172A` | `--foreground` | Slate 900 — primary text |
| Muted | `#64748B` | `--muted-foreground` | Slate 500 — secondary text, labels |
| Border | `#E2E8F0` | `--border` | Slate 200 — card/input borders |
| Success | `#059669` | `--success` | Emerald 600 — income, positive trends |
| Danger | `#DC2626` | `--danger` | Red 600 — expense, negative trends |
| Warning | `#D97706` | `--warning` | Amber 600 — alerts |
| Info | `#0284C7` | `--info` | Sky 600 — informational |

**Dark Mode:** Inverte superfícies mantendo navy sidebar — background → `#0B1326`, surface → `#171F33`.

### Typography

- **UI Font:** Inter (all headings, body, labels, captions)
- **Data Font:** JetBrains Mono (currency values, account numbers, transaction amounts)
- **KBD Font:** Fira Code (keyboard shortcuts)
- **Mood:** swiss, editorial, clean, high-contrast, precise, financial newspaper
- **Google Fonts:** [Inter + JetBrains Mono + Fira Code](https://fonts.google.com/share?selection.family=Inter:wght@400;600;700|JetBrains+Mono:wght@400;500|Fira+Code:wght@600)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Fira+Code:wght@600&display=swap');
```

**Type Scale:**

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| Display | 60px / 1.0 / -0.03em | 700 | Hero balance only |
| Display SM | 22px / 1.2 / -0.02em | 700 | KPI card values |
| Headline | 18px / 28px | 600 | Page titles |
| Title | 14px / 20px / 0.3px | 700 | Section headers (uppercase) |
| Body LG | 14px / 20px | 400 | Standard content |
| Body SM | 12px / 16px | 400 | Secondary content |
| Label | 11px / 16px / 0.08em | 600 | KPI sub-labels (uppercase) |
| Mono Number | 14px / 20px / -0.02em | 400 | Currency values (tabular-nums) |
| Mono KBD | 10px / 16px | 600 | Keyboard shortcuts |

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `sm` | 4px | Subtle radius, alert items |
| `DEFAULT` | 6px | Cards, buttons, inputs, modals |
| `md` | 6px | Same as DEFAULT |
| `lg` | 6px | Same as DEFAULT (near-flat editorial) |
| `full` | 9999px | Pills, badges, FAB, progress bars |

### Z-Index Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--z-content` | 10 | Sticky headers, chart tooltips |
| `--z-calendar` | 20 | Calendar focus states |
| `--z-header` | 40 | Top header bar, mobile backdrop |
| `--z-sidebar` | 50 | Sidebar, bottom nav, FAB, floating surfaces |
| `--z-overlay` | 60 | Dropdowns, selects, popovers, tooltips |
| `--z-modal` | 70 | Dialogs, sheets, drawers |
| `--z-alert` | 80 | Alert dialogs |
| `--z-search` | 90 | Global search overlay |
| `--z-top` | 100 | Keyboard shortcuts, toasts |

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight gaps |
| `sm` | 12px | Icon gaps, inline spacing |
| `md` | 16px | Standard padding |
| `lg` | 24px | Section padding |
| `xl` | 40px | Large gaps |
| `card-padding` | 20px | Internal card padding |
| `section-padding` | 24px | Section container padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `sm` | `0 1px 2px 0 rgba(15,23,42,0.05)` | Subtle lift |
| `card` | `0 1px 3px 0 rgba(15,23,42,0.1), 0 1px 2px -1px rgba(15,23,42,0.1)` | Cards |
| `lg` | `0 10px 15px -3px rgba(15,23,42,0.1), 0 4px 6px -4px rgba(15,23,42,0.1)` | Card hover |
| `float` | `0 20px 25px -5px rgba(15,23,42,0.1), 0 8px 10px -6px rgba(15,23,42,0.1)` | Modals, FAB |

---

## Component Specs

### KPI Cards
```css
.kpi-card {
  background: var(--surface);
  border: 1px solid var(--surface-border);
  border-radius: 6px;
  padding: 20px;
  box-shadow: var(--shadow);
  position: relative;
}
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  /* background set per variant: income=#10B981, expense=#EF4444, balance=#78716C, investment=#F59E0B */
}
```

### Buttons
```css
/* Primary */
background: #0F766E; color: #FFFFFF; border-radius: 6px;
height: 36px; padding: 0 16px; font-size: 14px; font-weight: 600;

/* Secondary */
background: #F1F5F9; color: #1E293B; border-radius: 6px;

/* Outline */
background: transparent; border: 1px solid #E2E8F0; color: #0F172A;

/* Ghost */
background: transparent; color: #64748B; hover: #F1F5F9;

/* Destructive */
background: #DC2626; color: #FFFFFF;
```

### Cards
```css
.card {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  box-shadow: var(--shadow);
  transition: box-shadow 250ms ease, border-color 250ms ease;
}
.card:hover {
  box-shadow: var(--shadow-lg);
}
```

### Inputs
```css
.input {
  background: #FFFFFF;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 10px 14px;
  font-size: 14px;
}
.input:focus {
  border-color: #0F766E;
  box-shadow: 0 0 0 2px rgba(15,118,110,0.15);
}
```

### Sidebar
- Background: `#0A1628` (navy, constant across themes)
- Width: 264px (collapsed: 76px)
- Active state: `rgba(255,255,255,0.15)` background + 3px teal left-edge bar
- Nav items: `rgba(255,255,255,0.50)` text, hover to `#FFFFFF`
- Transition: `all 300ms cubic-bezier(0.4, 0, 0.2, 1)`

### Charts
- Bar: 12px width, rounded tops `[6,6,0,0]`, income=#1A5C3A, expense=#991B1B
- Grid: dashed `3 3`, #E2E8F0 at 50% opacity
- Tooltip: border-radius 2px, 12px font, shadow `0 8px 24px rgba(0,0,0,0.1)`
- Donut: 50px inner, 80px outer radius

---

## Style Guidelines

**Style:** Swiss Editorial Minimalism ("Financial Newspaper")

**Keywords:** high contrast, precise, clean, editorial, swiss, ink-on-paper, tabular data, information density

**Best For:** Financial dashboards, analytics platforms, data-heavy professional tools

**Key Effects:**
- Tonal layering instead of shadows (dark mode)
- 4-6px border radius (near-flat, editorial sharpness)
- Burnt orange hero rule (#C2410C at 25-30%) as sole decorative element
- No gradients, no glassmorphism, no backdrop blur (except modal overlays)
- Motion: page-entry only, 150-450ms, stagger by 0.1s

### Motion Philosophy
- Animations are page-entry only (fade-in, fade-in-up, scale-in, slide-in-right)
- No continuous animations (except skeleton loaders and pulse indicators)
- Stagger: content blocks reveal with 0.1s delay increments
- Progress bars: `transition: width 700ms cubic-bezier(0.22, 1, 0.36, 1)` (spring easing)
- All animations disabled when `prefers-reduced-motion: reduce`

---

## Anti-Patterns (Do NOT Use)

- ❌ **Emojis as icons** — Use Material Symbols or Lucide
- ❌ **Glassmorphism / backdrop blur on cards** — Zero blur, tonal layering only
- ❌ **AI purple/pink gradients** — Solid colors only
- ❌ **Rounded-xl or rounded-2xl** — Max 6px radius (editorial sharpness)
- ❌ **Missing cursor:pointer** — All clickable elements must indicate interactivity
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus rings must be visible for a11y
- ❌ **Ignoring reduced-motion** — Must respect `prefers-reduced-motion: reduce`

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG/Material Symbols instead)
- [ ] All icons from consistent icon set (Material Symbols + Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Dark mode: text contrast verified independently
- [ ] Focus states visible for keyboard navigation (`outline: 2px solid #0F766E`)
- [ ] `prefers-reduced-motion` respected (all animations disabled)
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars (safe-area padding)
- [ ] No horizontal scroll on mobile
- [ ] Touch targets minimum 44x44px
- [ ] Semantic color tokens used (no ad-hoc hex values)
- [ ] 4/8px spacing rhythm maintained
