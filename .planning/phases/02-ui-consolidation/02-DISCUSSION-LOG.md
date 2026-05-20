# Phase 02: UI Consolidation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-19
**Phase:** 02-ui-consolidation
**Areas discussed:** TransactionRow + padding, Icon migration scope, Skeleton loading depth

---

## TransactionRow + padding

### Q1: TransactionRow unification approach

| Option | Description | Selected |
|--------|-------------|----------|
| Single responsive path | Merge into one component using Tailwind responsive classes (hidden/block, md:). Simpler codebase, single source of truth. | ✓ |
| Keep dual paths, just clean up | Keep mobile and desktop as separate render paths within the same file. | |
| Split into two components | Split into TransactionRowMobile and TransactionRowDesktop, parent picks based on useMediaQuery. | |

**User's choice:** Single responsive path (Recommended)
**Notes:** None

### Q2: Page-level padding approach

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform px-lg py-xl | Apply to all 8 pages consistently. Simple, predictable. | ✓ |
| Page-type variants | Dashboard gets more generous padding, data-heavy pages get tighter padding. | |
| Claude decides | Agent discretion. | |

**User's choice:** Uniform px-lg py-xl (Recommended)
**Notes:** None

### Q3: Swipe-to-delete behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Keep swipe on mobile only | Keep swipe-to-delete on mobile, long-press or swipe on desktop. | ✓ |
| Same interaction everywhere | Use the same interaction on both form factors. | |
| Claude decides | Agent discretion. | |

**User's choice:** Keep swipe on mobile only (Recommended)
**Notes:** None

### Q4: Transaction action buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Desktop: visible buttons, Mobile: swipe + tap | Action buttons visible on desktop (md:), hidden on mobile where swipe handles delete and tap opens detail/edit. | ✓ |
| Kebab menu on both | Show a kebab/three-dot menu on both form factors. | |
| Claude decides | Agent discretion. | |

**User's choice:** Desktop: visible buttons, Mobile: swipe + tap (Recommended)
**Notes:** None

---

## Icon migration scope

### Q1: Migration approach

| Option | Description | Selected |
|--------|-------------|----------|
| Full migration to Material Symbols | Replace all 43 files' lucide-react imports. Complete consistency, one icon library. | ✓ |
| Pragmatic hybrid | Migrate most, keep Lucide for 2-3 action icons where MS has no good equivalent. | |
| Split by purpose | Keep Lucide for action icons, use Material Symbols for category/navigation icons. | |

**User's choice:** Full migration to Material Symbols (Recommended)
**Notes:** None

### Q2: How to render Material Symbols icons

| Option | Description | Selected |
|--------|-------------|----------|
| Use existing MsIcon component | Use the existing ms-icon.jsx component as the wrapper. | ✓ |
| Raw span elements | Use raw <span className="material-symbols-outlined"> directly. | |
| New unified Icon component | Create a unified Icon component that wraps Material Symbols with size/variant props. | |

**User's choice:** Use existing MsIcon component (Recommended)
**Notes:** None

### Q3: Icon mapping management

| Option | Description | Selected |
|--------|-------------|----------|
| Centralized mapping file | Create src/lib/iconMap.js documenting every Lucide → Material Symbol replacement. | ✓ |
| Inline replacement per file | Replace inline in each file as we go. No central mapping. | |
| Claude decides | Agent discretion. | |

**User's choice:** Centralized mapping file (Recommended)
**Notes:** None

### Q4: shadcn/ui internal lucide-react imports

| Option | Description | Selected |
|--------|-------------|----------|
| Leave shadcn/ui untouched | Only replace lucide imports in custom components. Clean boundary. | |
| Replace everywhere | Replace lucide imports even in shadcn/ui components. | |
| Claude decides | Agent discretion. | ✓ |

**User's choice:** Claude decides
**Notes:** Agent discretion — will leave shadcn/ui components untouched (vendor code, modification creates maintenance burden).

---

## Skeleton loading depth

### Q1: Which pages need skeletons

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard | Hero balance, KPI cards, category breakdown, charts section, goals section. | ✓ |
| Transactions | KPI row, filter bar, transaction list. | ✓ |
| Reports | Chart placeholders, summary cards. | ✓ |
| Budgets/Goals/Planejamento | Budget cards, goal cards. | |

**User's choice:** Dashboard, Transactions, Reports
**Notes:** User asked for Portuguese explanation of skeleton loading concept before answering.

### Q2: Animation style

| Option | Description | Selected |
|--------|-------------|----------|
| Shimmer gradiente suave | Blocos cinza com animação de gradiente suave da esquerda para direita. | ✓ |
| Estático (sem animação) | Blocos cinza estáticos sem animação. | |
| Pulso suave | Pulsar suave (opacity vai e volta). | |

**User's choice:** Shimmer gradiente suave (Recommended)
**Notes:** None

### Q3: Skeleton fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Alta fidelidade — imita o layout real | Cada seção do Dashboard mostra blocos que imitam o formato real. | ✓ |
| Genérico — blocos retangulares | Blocos retangulares genéricos para todo o conteúdo. | |
| Claude decides | Agent discretion. | |

**User's choice:** Alta fidelidade — imita o layout real (Recommended)
**Notes:** None

### Q4: When to show skeletons

| Option | Description | Selected |
|--------|-------------|----------|
| Só no carregamento inicial | Mostra skeleton só na primeira vez que a página carrega (quando não tem cache). | ✓ |
| Sempre que busca dados | Mostra skeleton sempre que os dados estão sendo buscados, incluindo refetch. | |
| Claude decides | Agent discretion. | |

**User's choice:** Só no carregamento inicial (Recommended)
**Notes:** None

---

## Claude's Discretion

- **shadcn/ui icons:** Agent chose to leave vendor components untouched — only custom code migrated.
- **Planejamento strategy:** Follows ROADMAP guidance — thin orchestrator delegating to shared BudgetCard/GoalCard.

## Deferred Ideas

None — all discussion areas stayed within Phase 2 scope.
