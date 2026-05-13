# DEV_GUIDE — Rattio (Lúmen)

Guia de desenvolvimento para o projeto Rattio. Consulte `design_lumen.md` para a referência completa do design system.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | React 18 + Vite |
| Styling | Tailwind CSS 3 + design tokens customizados |
| Icons | **Material Symbols Outlined** (não lucide-react) |
| State | React hooks + localStorage |
| Data | Base44 SDK (`@base44/sdk`) |
| Routing | react-router-dom v6 |
| Forms | react-hook-form + zod |
| Charts | recharts |

## Setup

```bash
npm install
cp .env.example .env.local   # configurar VITE_BASE44_APP_ID e VITE_BASE44_APP_BASE_URL
npm run dev
```

## Estrutura

```
src/
  components/
    dashboard/    — KpiCard, HeroBalance, DashSection, ChartsSection, etc.
    finance/      — TransactionRow, TransactionModal, FinancialHealthScore, etc.
    settings/     — TabDados, TabAutomacao, TabPersonalizacao
    ui/           — componentes base (shadcn/ui)
  hooks/          — useData, useMonthNavigation, use-mobile
  lib/            — utils, store, financeUtils, categories, csvParser
  pages/          — Dashboard, Transactions, Reports, Settings, etc.
```

---

## ⚠️ Regras Críticas (aprendidas com bugs reais)

### 1. Rules of Hooks — NUNCA violar

Hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`) **só podem ser chamados no nível superior** do componente. NÃO colocar hooks dentro de:

- ❌ Funções aninhadas (`renderSection`, `renderItem`, etc.)
- ❌ Condicionais (`if (x) { useMemo(...) }`)
- ❌ Loops (`array.map(() => useMemo(...))`)
- ❌ Callbacks de evento

**Exemplo errado (causou bug corrigido pelo base44):**
```jsx
function Dashboard() {
  const renderSection = (id) => {
    switch (id) {
      case 'graficos':
        // ❌ useMemo DENTRO de função aninhada!
        const barData = React.useMemo(() => { ... }, [deps]);
        return <ChartsSection barData={barData} />;
    }
  };
}
```

**Exemplo correto:**
```jsx
function Dashboard() {
  // ✅ useMemo no nível do componente
  const barData = React.useMemo(() => { ... }, [deps]);

  const renderSection = (id) => {
    switch (id) {
      case 'graficos':
        return <ChartsSection barData={barData} />;
    }
  };
}
```

### 2. Importar de `@/` (path alias)

Todos os imports usam `@/` como alias para `src/`:
```jsx
import { cn } from '@/lib/utils';
import { KpiCard } from '@/components/dashboard/KpiCard';
```

### 3. Não usar `Card`/`CardContent` do shadcn em componentes novos

O projeto está migrando de componentes shadcn `Card` para `div` com tokens do design system:
```jsx
// ❌ Antigo
<Card className="border-0 shadow-card">
  <CardContent className="p-4">...</CardContent>
</Card>

// ✅ Novo (tokens do design_lumen.md)
<div className="bg-surface border border-surface-border p-card-padding relative overflow-hidden">
  <div className="absolute top-0 left-0 right-0 h-[3px] bg-kpi-income" />
  ...
</div>
```

### 4. Usar Material Symbols, não lucide-react

Para ícones visuais na UI, usar `<span className="material-symbols-outlined">nome</span>`. Lucide-react ainda é usado apenas para ícones de ação (Pencil, Trash2, Copy) em componentes que já os tinham.

### 5. Tokens do design system

Sempre usar os tokens semânticos do tailwind em vez de cores hardcoded:

| Token | Uso |
|---|---|
| `bg-surface` | Fundo de cards/containers |
| `border-surface-border` | Bordas |
| `text-on-surface` | Texto principal |
| `text-muted-foreground` | Texto secundário |
| `bg-kpi-income` | Verde (receitas) |
| `bg-kpi-expense` | Vermelho (despesas) |
| `bg-primary-container` | Botões CTA |
| `font-label-caps` | Labels em caixa alta (11px, 600, 0.08em) |
| `font-headline` | Títulos de seção (18px, 600) |
| `font-display-hero` | Número hero (60px, 700) |
| `font-mono-number` | Valores numéricos (JetBrains Mono) |

### 6. Formatação de moeda

Sempre usar `formatCurrency()` de `@/lib/financeUtils` — nunca formatar manualmente.

---

## Design System

Consulte `design_lumen.md` na raiz do repositório para a referência completa. Resumo:

- **Paleta**: Concrete & Ink — superfícies sólidas, sem gradientes
- **Tipografia**: Inter (display/body), Fira Code (kbd), JetBrains Mono (números)
- **Espaçamento**: Múltiplos de 8px (4/8/12/16/20/24/40)
- **Border radius**: 2px (editorial), 0.5rem (cards), 9999px (pills)
- **Ícones**: Material Symbols Outlined, weight 400

## Base44 Sync

Alterações feitas localmente são sincronizadas com o Base44 Builder. O `base44-builder[bot]` pode fazer commits de correção automática — sempre revisar e aprender com eles.

---

## Checklist antes de commitar

- [ ] Nenhum hook dentro de função aninhada
- [ ] Todos os imports resolvem (`@/` path)
- [ ] Tokens do design system usados (não cores hardcoded)
- [ ] Material Symbols para ícones visuais
- [ ] `formatCurrency()` para valores monetários
- [ ] Build passa: `npm run build`

### 7. Validar dados de localStorage/getLocal

`getLocal()` retorna `JSON.parse(localStorage.getItem(...))`. Se o localStorage tiver dados corrompidos, o valor retornado pode não ser o tipo esperado.

**Regra**: Sempre validar o tipo ao usar dados de localStorage:

```jsx
// ❌ Perigoso — assume que é array
const [sections, setSections] = useState(getDashSections());

// ✅ Seguro — valida antes de usar
const [sections, setSections] = useState(() => {
  const raw = getDashSections();
  return Array.isArray(raw) ? raw : [];
});
```

**Na fonte (funções de store)**:
```js
export function getDashSections() {
  const raw = getLocal('dashSections', DEFAULT_DASH_SECTIONS);
  return Array.isArray(raw) ? raw : DEFAULT_DASH_SECTIONS;
}
```

**Em componentes que recebem dados de store**:
```jsx
const saved = getDashSections();
const safe = Array.isArray(saved) ? saved : [];
const merged = DEFAULT_SECTIONS.map(def => safe.find(s => s.id === def.id) || { ...def });
```
