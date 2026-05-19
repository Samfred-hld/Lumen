# Technology Stack

**Analysis Date:** 2026-05-19

## Languages

**Primary:**
- JavaScript (ES2022+) with JSX — 100% of application code (`src/**/*.{js,jsx}`)
- TypeScript 5.8 — Dev dependency only; `tsc` checks against `jsconfig.json` but no `.ts`/`.tsx` source files in application code (only `src/utils/index.ts` stub)

**Secondary:**
- CSS (Tailwind CSS 3 utility classes + custom properties)
- JSON — `src/data/correlations.json` (2070 lines of auto-categorization rules)

## Runtime

**Environment:**
- Browser (SPA — no SSR, no Node.js server runtime)
- Vite 6.1 development server and build tool

**Package Manager:**
- npm (Node.js)
- Lockfile: `package-lock.json` present (commit includes `.package-lock.json` at root level)

## Frameworks

**Core:**
- React 18.2 — UI framework (functional components with hooks)
- Vite 6.1 — Build tool and dev server with `@vitejs/plugin-react` 4.3.4
- Tailwind CSS 3.4.17 — Utility-first CSS framework with `tailwindcss-animate` plugin for Radix animations
- react-router-dom 6.26 — Client-side routing (BrowserRouter, nested routes with `<Outlet>`)
- Base44 SDK 0.8.28 — Backend-as-a-Service: data entities, authentication, real-time subscriptions
- @base44/vite-plugin 1.0.16 — Vite integration with HMR notifier, navigation notifier, analytics tracker, visual edit agent

**State & Data:**
- TanStack React Query 5.84.1 — Server state management, caching, background refetching, real-time invalidation
- React Context API — Auth state (`AuthContext`)

**Forms & Validation:**
- react-hook-form 7.54.2 — Form state management
- zod 3.24.2 — Schema validation (used with `@hookform/resolvers` 4.1.2)
- @hookform/resolvers 4.1.2 — Zod resolver for react-hook-form

**UI Components:**
- shadcn/ui (Radix UI primitives) — 60+ component wrappers in `src/components/ui/`
- Radix UI primitives (39 packages: accordion, alert-dialog, avatar, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, label, menubar, navigation-menu, popover, progress, radio-group, scroll-area, select, separator, slider, slot, switch, tabs, toast, toggle, toggle-group, tooltip, aspect-ratio) — All version range `^1.1.x` to `^2.2.x`
- class-variance-authority 0.7.1 — Component variant definitions (`buttonVariants`, `alertVariants`, `toastVariants`, `sheetVariants`)
- clsx 2.1.1 + tailwind-merge 3.0.2 — The `cn()` utility for conditional class merging

**Charts:**
- recharts 2.15.4 — Bar, line, pie, area charts with `ResponsiveContainer`
- Canvas libraries: `html2canvas` 1.4.1, `jspdf` 4.0.0 — PDF/chart export

**Icons:**
- Material Symbols Outlined (Google Fonts CDN, weight 100-700, FILL 0-1) — Primary icon system
- lucide-react 0.475.0 — Legacy action icons (Pencil, Trash2, Copy, TrendingUp, etc.) — being phased out

**Date/Time:**
- date-fns 3.6.0 — Date formatting, month arithmetic, `getDaysInMonth`, `subMonths`, `startOfMonth`, `format`
- react-day-picker 8.10.1 — Calendar date picker component

**Animations:**
- framer-motion 11.16.4 — Declarative animations (used sparingly)
- Tailwind CSS keyframe animations — `fade-in`, `fade-in-up`, `scale-in`, `slide-in-right`, `count-up`, `ticker`

**File Processing:**
- xlsx 0.18.5 — Excel file reading (CSV import fallback)

**Notifications:**
- sonner 2.0.1 — Toast notifications
- react-hot-toast 2.6.0 — Alternative toast system

**Keyboard & Command:**
- cmdk 1.0.0 — Command palette component (used in `GlobalSearch`)

## Key Dependencies

**Critical:**
| Package | Version | Why it matters |
|---------|---------|----------------|
| `@base44/sdk` | 0.8.28 | Entire data layer — auth, CRUD, real-time subscriptions for 8 entities |
| `@tanstack/react-query` | 5.84.1 | Cache layer between UI and Base44; 30s staleTime, 5min gcTime |
| `react-router-dom` | 6.26 | 8 routes under `<Layout>` outlet, 1 catch-all |
| `recharts` | 2.15.4 | All chart visualizations (bar, pie, line, area) |
| `react-hook-form` + `zod` | 7.54.2 / 3.24.2 | Form validation for transaction entry, goal creation, budget editing |
| `tailwindcss` | 3.4.17 | 100% of styling via utility classes + design tokens |
| `date-fns` | 3.6.0 | All date operations (month filtering, formatting, calendar logic) |

**Infrastructure:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@base44/vite-plugin` | 1.0.16 | Base44 SDK Vite integration |
| `@vitejs/plugin-react` | 4.3.4 | React Fast Refresh, JSX transform |
| `postcss` | 8.5.3 | CSS processing pipeline |
| `autoprefixer` | 10.4.20 | CSS vendor prefixes |

**Data Processing:**
| Package | Version | Purpose |
|---------|---------|---------|
| `xlsx` | 0.18.5 | Read XLSX/XLS files for CSV import |
| `lodash` | 4.17.21 | Utility functions (used sparingly) |
| `canvas-confetti` | 1.9.4 | Celebration animation on goal completion |
| `uuid` | (transitive) | Unique ID generation |

**UI Enhancement:**
| Package | Version | Purpose |
|---------|---------|---------|
| `@hello-pangea/dnd` | 17.0.0 | Drag-and-drop (dashboard section reordering) |
| `embla-carousel-react` | 8.5.2 | Carousel component |
| `vaul` | 1.1.2 | Drawer component (bottom sheet) |
| `input-otp` | 1.4.2 | OTP input component |
| `react-resizable-panels` | 2.1.7 | Resizable panel layouts |
| `next-themes` | 0.4.4 | Theme provider (dark/light mode toggle) |
| `@stripe/react-stripe-js` + `@stripe/stripe-js` | 3.0.0 / 5.2.0 | Stripe payment elements |

## Dev Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `eslint` | 9.19.0 | Linting (flat config) |
| `eslint-plugin-react` | 7.37.4 | React-specific lint rules |
| `eslint-plugin-react-hooks` | 5.0.0 | Rules of Hooks enforcement |
| `eslint-plugin-react-refresh` | 0.4.18 | Fast Refresh compatibility checks |
| `eslint-plugin-unused-imports` | 4.3.0 | Unused import detection and auto-fix |
| `typescript` | 5.8.2 | Type checking via `tsc -p ./jsconfig.json` (no .ts source files) |
| `@types/react` | 18.2.66 | React type definitions for TS checking |
| `@types/react-dom` | 18.2.22 | React DOM type definitions |
| `@types/node` | 22.13.5 | Node.js type definitions |
| `globals` | 15.14.0 | ESLint global variable definitions |
| `baseline-browser-mapping` | 2.8.32 | Browser compatibility data |

## Configuration

**Environment:**
- `.env.example` → `.env.local` (not committed): `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`
- `appParams` module (`src/lib/app-params.js`) reads from Vite env vars and constructs the Base44 client config

**Build:**
- `vite.config.js` — Vite 6 config with `@base44/vite-plugin` (HMR notifier, navigation notifier, analytics tracker, visual edit agent) and `@vitejs/plugin-react`
- `tailwind.config.js` — Custom design tokens: 80+ semantic color tokens, 12 spacing values (4px-based grid), 15 font families (all Inter except mono-number/mono-kbd), 10 font sizes, 8 keyframe animations
- `postcss.config.js` — Tailwind CSS + autoprefixer
- `jsconfig.json` — TypeScript compiler options, path aliases

**Linting:**
- `eslint.config.js` — Flat config format. Only lints `src/components/**` and `src/pages/**`. **Deliberately ignores:** `src/lib/**` and `src/components/ui/**`.

**Path Aliases:**
- `@/` → `src/` (configured in `jsconfig.json` and resolved by Vite)

## Platform Requirements

**Development:**
- Node.js (any version supporting Vite 6)
- `npm install` to restore dependencies
- `.env.local` with Base44 credentials
- `npm run dev` — Vite dev server with HMR on default port (5173)

**Production:**
- `npm run build` — Produces static assets in `dist/`
- Deployment target: Any static hosting (the app is a client-side SPA)
- Base44 BaaS handles all server-side logic (auth, data, real-time)

**Available scripts:**
```bash
npm run dev            # Vite dev server
npm run build          # Production build
npm run preview        # Preview production build
npm run lint           # ESLint (quiet mode)
npm run lint:fix       # ESLint with auto-fix
npm run typecheck      # TypeScript type checking
```

---

*Stack analysis: 2026-05-19*
