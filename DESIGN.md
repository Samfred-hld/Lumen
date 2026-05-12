# DESIGN.md — Lúmen Design System

Premium fintech visual identity. Inspired by Linear, Notion, and Stripe Dashboard.

## Cores

### Paleta Principal
| Token | Hex | HSL | Uso |
|-------|-----|-----|-----|
| `--primary` | `#4F46E5` | `243 75% 59%` | Primary actions, focus rings, active states |
| `--primary-light` | `#818CF8` | `239 84% 74%` | Hover states, subtle highlights |
| `--income` | `#10B981` | `160 84% 39%` | Income, positive values, success |
| `--expense` | `#F43F5E` | `350 89% 60%` | Expense, negative values, danger |
| `--investment` | `#8B5CF6` | `260 88% 66%` | Investments, violet accents |

### Backgrounds & Surfaces
| Token | Hex | HSL | Uso |
|-------|-----|-----|-----|
| `--background` | `#FAFAFA` | `0 0% 98%` | Page background |
| `--card` | `#FFFFFF` | `0 0% 100%` | Card surfaces |
| `--sidebar-bg` | `#1E1B4B` | `244 47% 20%` | Sidebar (navy dark) |
| `--content-bg` | `#F8FAFC` | `210 40% 98%` | Content area background |

### Borders & Text
| Token | Hex | Uso |
|-------|-----|-----|
| `--border` | `#E5E7EB` | Card borders, dividers |
| `--foreground` | `#1E1B4B` | Primary text (navy) |
| `--muted-foreground` | `#6B7280` | Secondary text |

## Tipografia

- **Família**: DM Sans (Google Fonts)
- **Headings**: DM Sans, weight 500-600, tracking `-0.02em`
- **Body**: DM Sans, weight 400
- **Numbers/Montantes**: DM Sans + `tabular-nums` + `font-semibold`
- **Monospace**: JetBrains Mono (códigos, dados tabulares)

### Escala
| Nível | Tamanho | Peso | Uso |
|-------|---------|------|-----|
| Heading 1 | 24px | 600 | Page titles |
| Heading 2 | 18px | 600 | Section headers |
| Heading 3 | 16px | 500 | Card titles |
| Body | 14px | 400 | Content |
| Small | 12px | 400 | Labels, meta |
| Caption | 11px | 500 | Badges, pills |

## Espaçamento e Grid

- **Grid base**: 8px
- **Card padding**: 24px (p-6)
- **Card gap**: 20px (gap-5)
- **Section gap**: 24px (mb-6)
- **Sidebar width**: 220px desktop, overlay on mobile
- **Content max-width**: 1280px centered

## Componentes

### Card
```css
background: #FFFFFF;
border: 1px solid #E5E7EB;
border-radius: 16px;
padding: 24px;
/* No box-shadow */
```
Hover: border-color shifts to `#D1D5DB`

### Button
- **Primary**: filled `#4F46E5`, white text, rounded-xl, 14px semibold
- **Outline**: border `#E5E7EB`, transparent bg, hover bg `#F8FAFC`
- **Ghost**: transparent, hover bg `#F4F6F8`
- **Focus**: ring-2 ring-indigo-500/30

### Badge
```css
border-radius: 9999px; /* full pill */
padding: 2px 10px;
font-size: 12px;
font-weight: 500;
```
- Income: bg `#ECFDF5`, text `#059669`, border `#D1FAE5`
- Expense: bg `#FFF1F2`, text `#E11D48`, border `#FFE4E6`
- Investment: bg `#F5F3FF`, text `#7C3AED`, border `#EDE9FE`

### Input
```css
background: #FFFFFF;
border: 1px solid #E5E7EB;
border-radius: 10px;
padding: 10px 14px;
font-size: 14px;
```
Focus: border `#4F46E5`, ring-3 ring-indigo-100

### Chart
- Minimal grid lines (dashed, `#E5E7EB`)
- Rounded bar tops (radius 6px top)
- Custom tooltip: white card, subtle shadow, DM Sans, 12px

## Padrões de Layout

### Sidebar
- Width: 220px desktop, overlay + hamburger on mobile
- Background: `#1E1B4B` (navy)
- Text/icons: white with opacity layers
- Active item: white/15 bg, left accent bar (indigo, 3px)
- Logo: hexagon "L" mark, indigo gradient

### Bottom Nav (Mobile)
- Fixed bottom, 64px height
- 5 items: Início, Transações, Orçamentos, Metas, Config
- Active: indigo color + top indicator bar

### Page Layout
- Top bar: breadcrumb/month nav + action buttons
- Content: generous padding (p-6), max-w-[1280px]
- Responsive: single column on mobile, 2-col grid on tablet+

## Regras de Responsividade

| Breakpoint | Width | Layout |
|-----------|-------|--------|
| Mobile | < 768px | Sidebar overlay, bottom nav, single col |
| Tablet | 768px - 1024px | Collapsible sidebar, 2-col possible |
| Desktop | > 1024px | Full sidebar (220px), multi-col grids |

### Mobile-specific
- Sidebar: slide-in overlay with backdrop blur
- Bottom nav: always visible
- Cards: full-width, stacked
- Tables: horizontal scroll or card view
- Charts: single column, reduced height
