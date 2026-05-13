# Prompt para Claude Code — Auditoria & Correção do Lúmen (Rattio)

> **Contexto:** App de gestão financeira pessoal em React + Vite + TailwindCSS + shadcn/ui + Recharts + React Query, backend via Base44 SDK.  
> Este prompt lista **bugs confirmados no código-fonte**, validados contra o feedback de usuário real. Execute na ordem de prioridade indicada.

---

## 🔴 PRIORIDADE 1 — Crash confirmado: `MONTH_SHORT is not defined`

**Arquivo:** `src/lib/financeUtils.js`

**Causa raiz identificada:** A função `formatSmartDate()` na linha ~141 usa `MONTH_SHORT` diretamente, mas o arquivo apenas **re-exporta** a constante (linha 6: `export { ..., MONTH_SHORT, ... } from './categories'`) sem importá-la localmente. Re-export não cria binding no escopo do módulo.

**Correção:**

Altere a linha existente:
```js
// ANTES
import { DEFAULT_CATEGORIES as _DC } from './categories';

// DEPOIS
import { DEFAULT_CATEGORIES as _DC, MONTH_SHORT } from './categories';
```

Isso resolve o crash `MONTH_SHORT is not defined` que quebra a página de Transações (e qualquer componente que chame `formatSmartDate`).

---

## 🔴 PRIORIDADE 2 — Onboarding aparece em todo início de sessão

**Arquivo:** `src/pages/Dashboard.jsx` — linha ~141

**Causa raiz identificada:** O check é puramente síncrono via `lsGet('onboarded', null)` (localStorage). Em navegador/dispositivo novo, o localStorage está vazio, então o onboarding sempre aparece — mesmo que o usuário já tenha completado em outro dispositivo. A função `fetchOnboarded()` que sincroniza com a nuvem existe mas **não é chamada** no Dashboard.

**Correção:**

```jsx
// src/pages/Dashboard.jsx — adicionar fetchOnboarded e isOnboarded ao import existente do store
import { lsGet, lsSet, getDashSections, getSalaryConfig, setOnboarded, fetchOnboarded, isOnboarded } from '@/lib/store';

// Substituir o useEffect de onboarding existente por:
useEffect(() => {
  let cancelled = false;

  async function checkOnboarding() {
    // 1. Verifica localStorage imediatamente
    if (isOnboarded()) {
      checkDueDateNotifications();
      return;
    }
    // 2. Não está no localStorage — busca na nuvem (pode ter completado em outro dispositivo)
    const cloudResult = await fetchOnboarded();
    if (cancelled) return;
    if (cloudResult && cloudResult !== 'false') {
      checkDueDateNotifications();
      return;
    }
    // 3. Realmente não onboardou — exibe após delay
    const timer = setTimeout(() => {
      if (!cancelled) setShowOnboarding(true);
    }, 800);
    return () => clearTimeout(timer);
  }

  checkOnboarding();
  return () => { cancelled = true; };
}, []);
```

---

## 🔴 PRIORIDADE 3 — Multi-tenancy: localStorage não é isolado por usuário

**Arquivo:** `src/lib/store/helpers.js` — linha 7

**Causa raiz identificada:** `LS_PREFIX = 'rattio_'` é estático e compartilhado por todos os usuários no mesmo navegador. Configurações como `onboarded`, `salaryConfig`, `paymentMethods`, `dashSections`, `extraCats` são gravadas no mesmo espaço de localStorage, independente de quem está logado.

**Correção:**

```js
// src/lib/store/helpers.js — substituir a lógica de prefix estático por prefix dinâmico por usuário

import { base44 } from '@/api/base44Client';

function getCurrentUserId() {
  try {
    const user = base44.auth?.currentUser;
    return user?.id || user?.uid || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

// Prefix dinâmico — isola dados por usuário no mesmo browser
function getPrefix() {
  return `rattio_${getCurrentUserId()}_`;
}

// Atualizar getLocal, setLocal e removeLocal para usar getPrefix() no lugar de LS_PREFIX

export function getLocal(key, fallback = null) {
  try {
    const r = localStorage.getItem(getPrefix() + key);
    return r ? JSON.parse(r) : fallback;
  } catch (err) {
    console.error('[Store] Erro em getLocal:', err);
    return fallback;
  }
}

export function setLocal(key, val) {
  try {
    localStorage.setItem(getPrefix() + key, JSON.stringify(val));
  } catch (err) {
    console.error('[Store] Erro em setLocal:', err);
  }
}

export function removeLocal(key) {
  try {
    localStorage.removeItem(getPrefix() + key);
  } catch (err) {
    console.error('[Store] Erro em removeLocal:', err);
  }
}
```

> **Atenção:** Usuários existentes terão configurações resetadas (chave antiga não tem userId). Criar função de migração que, na primeira sessão pós-update, copia dados do prefix antigo `rattio_X` para o novo `rattio_{userId}_X` caso o prefix novo esteja vazio.

---

## 🔴 PRIORIDADE 4 — Máscara de data: ano sem limite

**Problema confirmado:** Inputs `type="date"` permitem digitar anos indefinidamente (ex: `11/05/20266666`).

**Correção — adicionar utilitário e aplicar em todos os inputs de data:**

```js
// Adicionar em src/lib/financeUtils.js
export function clampDateInput(value) {
  if (!value) return value;
  const parts = value.split('-');
  if (parts[0] && parts[0].length > 4) {
    parts[0] = parts[0].slice(0, 4);
  }
  if (parts[0]) {
    const year = parseInt(parts[0]);
    if (!isNaN(year) && year > 2099) parts[0] = '2099';
    if (!isNaN(year) && year < 1900) parts[0] = '1900';
  }
  return parts.join('-');
}
```

```jsx
// Em TODOS os inputs de data (TransactionModal, Goals, Budgets, etc):
<Input
  type="date"
  max="2099-12-31"
  min="1900-01-01"
  value={date}
  onChange={(e) => setDate(clampDateInput(e.target.value))}
  onBlur={(e) => {
    const clamped = clampDateInput(e.target.value);
    if (clamped !== e.target.value) setDate(clamped);
  }}
/>
```

**Buscar todos os inputs de data nos arquivos:** `TransactionModal.jsx`, `Goals.jsx`, `Budgets.jsx`, `CalendarPage.jsx`.

---

## 🟠 PRIORIDADE 5 — Dashboard: Tooltip do gráfico de barras (hover estranho)

**Arquivo:** `src/pages/Dashboard.jsx` — função `renderGraficos()`

**Correção — aplicar contentStyle consistente no Tooltip do BarChart:**

```jsx
<Tooltip
  formatter={(v, name) => [formatCurrency(v), name]}
  contentStyle={{
    borderRadius: '10px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
    padding: '8px 12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    fontFamily: 'inherit',
  }}
  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
  wrapperStyle={{ outline: 'none' }}
/>
```

Aplicar o mesmo `contentStyle` no `<Tooltip>` do PieChart.

---

## 🟠 PRIORIDADE 6 — Dashboard: Pie Chart ilegível com muitas categorias

**Arquivo:** `src/pages/Dashboard.jsx` — função `renderGraficos()`

**Correção — agrupar categorias pequenas em "Outros" acima de 6 itens:**

```jsx
// Adicionar logo onde pieData é computado no Dashboard:
const MAX_PIE_SLICES = 6;

const processedPieData = React.useMemo(() => {
  if (!pieData || pieData.length === 0) return [];
  if (pieData.length <= MAX_PIE_SLICES) return pieData;
  const sorted = [...pieData].sort((a, b) => b.value - a.value);
  const top = sorted.slice(0, MAX_PIE_SLICES);
  const rest = sorted.slice(MAX_PIE_SLICES);
  const othersValue = rest.reduce((sum, d) => sum + d.value, 0);
  return [...top, { name: 'Outros', value: othersValue, color: '#94a3b8' }];
}, [pieData]);

// Substituir `pieData` por `processedPieData` no JSX do PieChart e na legenda ao lado
```

---

## 🟠 PRIORIDADE 7 — Relatórios: paginação real + subtotal no Detalhamento

**Arquivo:** `src/pages/Reports.jsx` — linhas ~530–590

**Problema confirmado no código:** Existe um texto estático `"Exibindo 20 de {periodTx.length} transações"` mas o slice de 20 itens é hardcoded — não há controles de página.

**Correção:**

```jsx
// Adicionar no início do componente Reports:
const [detailPage, setDetailPage] = useState(1);
const DETAIL_PAGE_SIZE = 20;

const detailTotalPages = Math.ceil(periodTx.length / DETAIL_PAGE_SIZE);
const pagedDetailTx = periodTx.slice(
  (detailPage - 1) * DETAIL_PAGE_SIZE,
  detailPage * DETAIL_PAGE_SIZE
);

// Resetar página ao mudar filtros:
useEffect(() => { setDetailPage(1); }, [period, filterType]);
```

```jsx
// Adicionar import:
import Pagination from '@/components/ui/pagination';

// Substituir o <p> estático por controles reais:
{detailTotalPages > 1 && (
  <div className="px-4 py-3 border-t">
    <Pagination page={detailPage} totalPages={detailTotalPages} onPageChange={setDetailPage} />
  </div>
)}
<p className="text-center text-xs text-muted-foreground py-2">
  Exibindo {Math.min(detailPage * DETAIL_PAGE_SIZE, periodTx.length)} de {periodTx.length} transações
</p>
```

**Adicionar subtotal no rodapé da tabela desktop:**

```jsx
// Calcular subtotais da página:
const pageIncome  = pagedDetailTx.filter(t => t.type === 'income').reduce((s, t) => s + t.value, 0);
const pageExpense = pagedDetailTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.value, 0);
const pageBalance = pageIncome - pageExpense;

// Adicionar <tfoot> após </tbody>:
<tfoot className="border-t-2 bg-muted/30">
  <tr>
    <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-muted-foreground">
      Subtotal ({pagedDetailTx.length} itens)
    </td>
    <td className="px-4 py-2 text-right text-xs font-bold text-emerald-600 tabular-nums hidden md:table-cell" />
    <td className={cn(
      "px-4 py-2 text-right text-xs font-bold tabular-nums",
      pageBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
    )}>
      Saldo página: {formatCurrency(pageBalance)}
    </td>
  </tr>
</tfoot>
```

---

## 🟠 PRIORIDADE 8 — Configurações: suporte a autônomos / renda variável

**Arquivo:** `src/pages/Settings.jsx` + `src/lib/store/settings.js`

**Correção — expandir o schema de salário:**

```js
// src/lib/store/settings.js — alterar getSalaryConfig:
export function getSalaryConfig() {
  return getLocal('salaryConfig', {
    incomeType: 'clt',    // 'clt' | 'freelancer' | 'entrepreneur' | 'investor' | 'multiple'
    value: 0,
    day: 5,
    autoGenerate: false,
  });
}
```

```jsx
// src/pages/Settings.jsx — adicionar selector de tipo de renda antes do campo de valor:
<div className="space-y-3">
  <div>
    <Label>Tipo de Renda</Label>
    <Select
      value={salaryConfig.incomeType || 'clt'}
      onValueChange={(v) => setSalaryConfig({ ...salaryConfig, incomeType: v })}
    >
      <SelectTrigger className="mt-1">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="clt">CLT — Salário fixo mensal</SelectItem>
        <SelectItem value="freelancer">Autônomo / Freelancer</SelectItem>
        <SelectItem value="entrepreneur">Empresário / Sócio</SelectItem>
        <SelectItem value="investor">Investidor</SelectItem>
        <SelectItem value="multiple">Múltiplas fontes de renda</SelectItem>
      </SelectContent>
    </Select>
  </div>

  <div>
    <Label>
      {salaryConfig.incomeType === 'clt' || !salaryConfig.incomeType
        ? 'Salário Bruto Mensal (R$)'
        : 'Referência de Renda Mensal (R$)'}
    </Label>
    <Input
      type="number"
      className="mt-1"
      value={salaryConfig.value}
      onChange={(e) => setSalaryConfig({ ...salaryConfig, value: parseFloat(e.target.value) || 0 })}
      min={0}
      step={100}
    />
    {salaryConfig.incomeType && salaryConfig.incomeType !== 'clt' && (
      <p className="text-xs text-muted-foreground mt-1">
        Para renda variável, este valor serve de referência para calcular sua taxa de poupança.
      </p>
    )}
  </div>
</div>
```

---

## 🟡 PRIORIDADE 9 — Metas: clareza no botão de depósito

**Arquivo:** `src/pages/Goals.jsx`

**Correção — renomear e explicar o botão:**

```jsx
// Renomear "+ Depositar" para algo mais claro:
<Button
  size="sm"
  variant="outline"
  onClick={() => handleOpenDeposit(goal)}
  title="Registra manualmente o valor alocado para esta meta. Não movimenta sua conta automaticamente."
  className="w-full text-xs gap-1.5"
>
  <Plus size={12} /> Registrar progresso
</Button>
```

**Adicionar projeção de conclusão no card:**

```jsx
// Função auxiliar no topo do arquivo:
function calcMonthsToGoal(goal) {
  const remaining = (goal.targetValue || 0) - (goal.currentValue || 0);
  if (remaining <= 0) return null;
  // Estima depósito mensal com base no histórico (simplificado):
  // Se não houver histórico, usa target/12 como fallback
  const avgMonthly = goal.targetValue / 12;
  return Math.ceil(remaining / avgMonthly);
}

// No JSX, abaixo da barra de progresso:
{(() => {
  const months = calcMonthsToGoal(goal);
  if (!months) return null;
  return (
    <p className="text-[10px] text-muted-foreground text-center">
      📈 Projeção: ~{months} mês(es) para concluir
    </p>
  );
})()}
```

---

## 🟡 PRIORIDADE 10 — Responsividade mobile

**Problema:** Elementos "comendo a tela" em viewports < 430px.

**Correções globais a aplicar:**

```css
/* src/index.css — adicionar se ausente */
*, *::before, *::after {
  box-sizing: border-box;
}
body {
  overflow-x: hidden;
}
```

```jsx
// Em TODAS as páginas — header com botões:
<div className="flex items-start justify-between flex-wrap gap-3">

// Tabs e pills de filtro:
<div className="flex flex-wrap gap-2">

// Tabelas — sempre com wrapper de scroll:
<div className="overflow-x-auto">
  <table className="w-full min-w-[480px] text-sm">...</table>
</div>

// Grid de cards (Goals, Budgets):
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
```

Verificar em `src/components/Layout.jsx`:
- Sidebar deve iniciar fechada em mobile (< 768px)
- Não deve sobrepor o conteúdo principal sem overlay clicável

---

## 🟡 PRIORIDADE 11 — Qualidade visual dos gráficos

**Criar tema de gráfico compartilhado e aplicar em Dashboard e Reports:**

```jsx
// src/lib/chartTheme.js — criar arquivo novo
export const CHART_COLORS = {
  income: '#10b981',
  expense: '#ef4444',
  investment: '#8b5cf6',
  neutral: '#6366f1',
};

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '10px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    fontFamily: 'inherit',
  },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.35 },
  wrapperStyle: { outline: 'none' },
};

export const AXIS_STYLE = {
  tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' },
  axisLine: false,
  tickLine: false,
};

export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border))',
  strokeOpacity: 0.5,
};
```

```jsx
// Importar e aplicar em Dashboard.jsx e Reports.jsx:
import { CHART_TOOLTIP_STYLE, AXIS_STYLE, GRID_STYLE } from '@/lib/chartTheme';

<CartesianGrid {...GRID_STYLE} />
<XAxis {...AXIS_STYLE} dataKey="name" />
<YAxis {...AXIS_STYLE} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
<Tooltip {...CHART_TOOLTIP_STYLE} formatter={(v) => formatCurrency(v)} />
<Bar radius={[6, 6, 0, 0]} maxBarSize={40} />
```

---

## 🔵 EXTRAS — Identificados na análise do código (não relatados pelo usuário)

### A. ErrorBoundary por Route (isolamento de erros)

**Arquivo:** `src/App.jsx`

O ErrorBoundary existe mas provavelmente está apenas no nível raiz. Erros em páginas específicas derrubam o app inteiro.

```jsx
// Envolver cada Route individualmente:
import ErrorBoundary from '@/components/ErrorBoundary';

<Route path="/transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
<Route path="/goals" element={<ErrorBoundary><Goals /></ErrorBoundary>} />
// ... repetir para todas as rotas
```

### B. React Query: adicionar staleTime

**Arquivo:** `src/hooks/useData.js`

Sem `staleTime`, toda mudança de aba/página dispara refetch desnecessário.

```js
const query = useQuery({
  queryKey: ['transactions'],
  queryFn: () => base44.entities.Transaction.list('-date', limit),
  staleTime: 30_000,       // 30 segundos
  gcTime: 5 * 60_000,     // 5 minutos
});
```

### C. Orçamentos: edição inline na tabela

**Arquivo:** `src/pages/Budgets.jsx`

Implementar célula editável com double-click ou botão de lápis inline, salvando com Enter/blur, eliminando a necessidade de modal para edições simples de valor.

### D. Verificar consistência de `formatCurrency`

Buscar no projeto inteiro por formatações manuais como `` `R$ ${value.toFixed(2)}` `` e substituir pela função `formatCurrency()` centralizada para garantir consistência de locale pt-BR.

---

## 📋 Checklist de execução

```
[ ] 1. MONTH_SHORT import em financeUtils.js              → CRASH de Transações
[ ] 2. Onboarding async com fetchOnboarded() no Dashboard → repetição a cada sessão
[ ] 3. localStorage prefix por userId em helpers.js       → multi-tenancy
[ ] 4. clampDateInput + max/min em inputs de data         → ano infinito
[ ] 5. Tooltip contentStyle no BarChart e PieChart        → hover estranho
[ ] 6. processedPieData com agrupamento "Outros"          → pie ilegível
[ ] 7. Paginação real + subtotal em Reports               → UX detalhamento
[ ] 8. incomeType selector em Settings                    → suporte autônomos
[ ] 9. Renomear depósito + projeção em Goals              → clareza de UX
[ ] 10. flex-wrap + overflow-x + grid responsivo          → mobile
[ ] 11. chartTheme.js compartilhado                       → visual profissional
[ ] A. ErrorBoundary por Route em App.jsx                 → isolamento de erros
[ ] B. staleTime no React Query                           → performance
[ ] C. Edição inline em Budgets                           → UX orçamentos
[ ] D. Auditoria de formatCurrency                        → consistência
```

---

## 🗂️ Arquivos modificados

| Arquivo | Mudanças |
|---|---|
| `src/lib/financeUtils.js` | Import MONTH_SHORT + utilitário clampDateInput |
| `src/lib/store/helpers.js` | Prefix de localStorage isolado por userId |
| `src/lib/chartTheme.js` | Criar — tema compartilhado de gráficos |
| `src/pages/Dashboard.jsx` | Onboarding async, Tooltip, PieChart grouping |
| `src/pages/Reports.jsx` | Paginação real, subtotal, import Pagination |
| `src/pages/Goals.jsx` | Tooltip de depósito, projeção, clamped dates |
| `src/pages/Settings.jsx` | Selector incomeType + label adaptativo |
| `src/pages/Budgets.jsx` | Edição inline (melhoria), clamped dates |
| `src/App.jsx` | ErrorBoundary por Route |
| `src/hooks/useData.js` | staleTime + gcTime no React Query |
| `src/index.css` | box-sizing global, overflow-x: hidden |
