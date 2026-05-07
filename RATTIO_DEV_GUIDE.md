# LÚMEN — Guia de Desenvolvimento (Base44)

> **Documento autocontido.** Qualquer sessão OpenClaw deve conseguir continuar o desenvolvimento apenas lendo este arquivo.
> **Projeto:** Lúmen (ex-Rattio) — Gestão Financeira Pessoal
> **Rebrand:** Rattio → Lúmen em 01/05/2026

---

## Estado Atual

**Branch:** `main`
**Stack:** React + Vite + Tailwind CSS + Radix UI (shadcn/ui) + Base44 (backend + auth + storage + real-time)
**Status:** ✅ Todas as fases (0–10) concluídas. Produção.

### Entidades Base44

| Entidade | Uso | Sync |
|----------|-----|------|
| Transaction | Transações financeiras (`source`: `cron_salary`, `cron_recurring`, ou vazio) | subscribe real-time |
| Budget | Orçamentos por categoria (`isRecurring` para auto-replicação) | subscribe real-time |
| Goal | Metas de economia/investimento (`progressMode`: manual/linked) | subscribe real-time |
| Card | Cartões de crédito | subscribe real-time |
| Rule | Regras de auto-categorização | cloud-first fetch |
| Template | Templates de transação | cloud-first fetch |
| FixedTemplate | Templates fixos para geração recorrente via cron | syncTemplatesToCloud |
| Setting | Configurações key-value (tema, salário, etc.) | getSettingFromCloud |
| UserConfig | Legacy — mantido para compatibilidade | — |

### Arquitetura de Dados

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Componente  │────▶│  React Query  │────▶│  Base44 SDK  │
│  (useData)   │     │  (cache 30s)  │     │  (API cloud) │
└─────────────┘     └──────────────┘     └─────────────┘
       │                                         │
       ▼                                         ▼
┌─────────────┐                          ┌─────────────┐
│ localStorage │◀───── fallback ──────────│  MongoDB    │
│  (rattio_*)  │      (offline)          │  (Base44)   │
└─────────────┘                          └─────────────┘
```

- **Leitura:** Componente → React Query (cache 30s) → Base44 SDK → MongoDB
- **Escrita:** Componente → Base44 SDK → MongoDB + atualiza localStorage
- **Fallback:** Se cloud falha, usa localStorage
- **First-time sync:** Se cloud vazia + localStorage tem dados → migra automaticamente
- **Deduplicação:** Automática 1x por sessão via `_autoDeduplicate()` no `initStore()`

---

## Capacidades do Base44 (Documentação Oficial)

### Entidades

Banco NoSQL (MongoDB-compatible). Schema flexível, sem migrações. Cada entidade tem CRUD automático.

```javascript
// CRUD
base44.entities.Transaction.list('-date', 500)
base44.entities.Transaction.list('-date', 50, 20)        // paginação: limit, skip
base44.entities.Transaction.list('-date', 50, 0, ['id', 'value']) // field selection
base44.entities.Transaction.filter({ category: 'Alimentação' })
base44.entities.Transaction.filter({ status: 'pending' }, '-created_date', 10, 0) // filter + sort + page
base44.entities.Transaction.create({ ... })
base44.entities.Transaction.update(id, { ... })
base44.entities.Transaction.delete(id)
base44.entities.Transaction.deleteMany({ status: 'completed' }) // batch delete
base44.entities.Transaction.bulkCreate([...])                   // batch create
base44.entities.Transaction.subscribe((event) => { ... })       // real-time

// Service role (admin access)
base44.asServiceRole.entities.Transaction.list()
```

### Backend Functions

Deno serverless. Máximo **50 functions** por projeto. Pasta `base44/functions/`.

```typescript
// base44/functions/minhaFunction/entry.ts
import { createClientFromRequest } from "npm:@base44/sdk";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  // ... lógica ...
  return Response.json({ ok: true });
});
```

**Functions atuais:**
| Function | Trigger | O que faz |
|----------|---------|-----------|
| `generateRecurring` | Cron dia 1, 00:00 | Gera transações de FixedTemplates (`source: 'cron_recurring'`) |
| `generateSalary` | Cron dia 5 (configurável) | Gera salário mensal (`source: 'cron_salary'`) |
| `generateRecurringBudgets` | Cron dia 1, 00:00 | Replica budgets com `isRecurring: true` |
| `sendInvoiceReminder` | Cron diário | Email: lembrete de fatura 3 dias antes |
| `sendBudgetAlert` | Cron diário | Email: alerta de orçamento ultrapassado |

### Automations

Configuradas em `function.jsonc`. 4 tipos:

1. **Cron** — Expressão cron de 5 campos (`0 0 * * ?`)
2. **Simple schedule** — Intervalo (`repeat_unit: "days"`, `repeat_interval: 1`)
3. **Entity events** — Trigger em `create`/`update`/`delete` de uma entidade
4. **Connector** — Webhook de integrações externas (Gmail, Google Drive, etc.)

### SDK — Features Disponíveis

| Feature | Método | Status no projeto |
|---------|--------|-------------------|
| CRUD completo | `create/get/list/filter/update/delete` | ✅ Usado |
| Batch delete | `deleteMany({})` | ✅ Usado (clearAllData + dedup) |
| Batch create | `bulkCreate([...])` | ✅ Usado (CSV import) |
| Paginação | `list(sort, limit, skip)` | ✅ Usado |
| Field selection | `list(sort, limit, skip, [fields])` | ❌ Não usado |
| Filter + sort + page | `filter({}, sort, limit, skip)` | ⚠️ Parcialmente |
| Real-time subscribe | `subscribe(callback)` | ✅ Usado (useData.js) |
| Service role | `asServiceRole.entities.*` | ❌ Não usado |
| Import CSV | `importEntities(file)` | ❌ Não usado (bulkCreate manual) |
| MongoDB operators | `{ field: { $in: [...] } }` | ✅ Usado (dedup) |

### Limites Reais

| Recurso | Limite |
|---------|--------|
| Backend functions | 50 por projeto (usa 5) |
| Entidades | Ilimitadas |
| Automations por function | Ilimitadas |
| Staging/production | Não nativo — criar segundo app |
| Full-text search | Não nativo — paginação + filtros |
| Cache server-side | Não existe — cada `list()` vai ao banco |
| CDN | Só para assets estáticos, não para dados |

---

## Estrutura do Projeto

```
src/
├── App.jsx                           # Rotas + init store + migração cards
├── main.jsx                          # Entry point
├── index.css                         # Tailwind + dark mode + sombras + gradientes + grain texture
│
├── api/
│   └── base44Client.js              # SDK Base44 (NÃO editar)
│
├── lib/
│   ├── utils.js                     # cn() helper (NÃO editar)
│   ├── financeUtils.js              # Funções financeiras (re-exports de categories.js)
│   ├── store.js                     # localStorage helpers + CRUD entidades + dedup automático
│   ├── categories.js                # Fonte única: categorias, ícones, cores, meses
│   ├── autoCorrelations.js          # Auto-categorização (string + RegExp word boundaries)
│   ├── constants.js                 # Constantes do app
│   ├── notifications.js             # Browser Notification API para vencimentos
│   ├── notificationStore.js         # Centro de notificações persistente (localStorage)
│   ├── transactionDetectors.js      # Auto-detect parcelamento + estorno
│   ├── query-client.js              # React Query config (staleTime: 30s)
│   └── entitySetup.js               # Setup + migração + dedup manual (lumenSetup)
│
├── hooks/
│   ├── useData.js                   # Hooks: useTransactions, useBudgets, useGoals, useCards
│   └── use-mobile.jsx              # Detect mobile
│
├── components/
│   ├── Layout.jsx                   # Sidebar + nav + NotificationCenter + FAB
│   ├── GlobalSearch.jsx             # Busca global ⌘K
│   ├── finance/
│   │   ├── TransactionModal.jsx     # Modal de transação (zod + react-hook-form)
│   │   ├── CSVImport.jsx            # Import CSV (bulkCreate em lotes)
│   │   ├── QuickEntry.jsx           # Lançamento rápido
│   │   ├── InstallmentConfirm.jsx   # Confirmar exclusão de parcelas
│   │   ├── DashCustomizeModal.jsx   # Personalizar seções do Dashboard
│   │   └── FinancialHealthScore.jsx # Score de saúde financeira 0-100
│   └── ui/                          # shadcn/ui + customizados
│
├── pages/
│   ├── Dashboard.jsx                # 10 seções customizáveis + KPIs + Health Score
│   ├── Transactions.jsx             # Lista + paginação + swipe + filtros + export Excel
│   ├── Budgets.jsx                  # Orçamentos real-time + isRecurring
│   ├── Goals.jsx                    # Metas com progressMode
│   ├── CalendarPage.jsx             # Calendário com transações
│   ├── Reports.jsx                  # Relatórios + forecast + PDF + Real vs Planejado
│   └── Settings.jsx                 # 3 abas: Personalização | Automação | Backup
│
└── base44/functions/                # Backend Deno (5 functions)
    ├── generateRecurring/entry.ts
    ├── generateSalary/entry.ts
    ├── generateRecurringBudgets/entry.ts
    ├── sendInvoiceReminder/entry.ts
    └── sendBudgetAlert/entry.ts
```

---

## Padrões de Código

### Fetch cloud-first (store.js)

```javascript
export async function fetchCards() {
  if (!(await ensureEntity('Card'))) return getCards();
  try {
    const cards = await base44.entities.Card.list('', 1000);
    setLocal('cards', cards || []);           // nuvem é fonte de verdade
    setLocal('cards_syncedAt', Date.now());
    if (!cards?.length) {
      const local = getCards();
      if (local.length) { /* first-time sync: migrate local → cloud */ }
    }
    return cards || [];
  } catch (err) {
    return getCards();                         // fallback localStorage
  }
}
```

**Regras:**
1. Sucesso (mesmo `[]`) → nuvem é fonte de verdade → atualiza localStorage
2. Falha → usa localStorage como fallback
3. Nuvem vazia + localStorage tem dados → migra (first-time sync)

### Validação de formulário (zod + react-hook-form)

```jsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  value: z.number().positive(),
  description: z.string().min(2).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const { control, register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
});
```

### Real-time subscribe (useData.js)

```javascript
export function useTransactions(limit = 2000, pauseSubscribeRef = null) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', limit),
  });
  useEffect(() => {
    const unsub = base44.entities.Transaction.subscribe(() => {
      if (pauseSubscribeRef?.current) return; // pausa durante import
      qc.invalidateQueries({ queryKey: ['transactions'] });
    });
    return unsub;
  }, [qc, pauseSubscribeRef]);
  return query;
}
```

### Setting key-value (store.js)

```javascript
async function getSettingFromCloud(key) {
  const results = await base44.entities.Setting.filter({ key });
  if (results?.length) return JSON.parse(results[0].value);
  return null;
}

async function setSettingToCloud(key, value) {
  const existing = await base44.entities.Setting.filter({ key });
  if (existing?.length) {
    await base44.entities.Setting.update(existing[0].id, { value: JSON.stringify(value) });
  } else {
    await base44.entities.Setting.create({ key, value: JSON.stringify(value) });
  }
}
```

---

## Design System — Cores Lúmen

| Token | Light | Dark | Uso |
|-------|-------|------|-----|
| `--lumen-purple` | `#7C3AED` | `hsl(263 75% 62%)` | Cor principal |
| `--lumen-purple-deep` | `#5B21B6` | `hsl(263 35% 10%)` | Sidebar |
| `--lumen-purple-light` | `#A78BFA` | — | Acentos claros |
| `--lumen-lavender` | `#C4B5FD` | — | Tags, badges |
| `--bg-page` | `#F5F3FF` | — | Fundo |
| `--sidebar-bg` | `#2D1B69` | — | Sidebar |

**Gradientes:** `.gradient-primary` (roxo→lavanda), `.gradient-emerald` (receitas), `.gradient-red` (despesas), `.gradient-violet` (investimentos)

---

## Git e Deploy

### Configuração (uma vez)

```bash
git config user.email "lumen@openclaw.ai"
git config user.name "Lúmen AI"
git remote set-url origin https://ghp_TOKEN@github.com/Samfred-hld/Rattio.git
```

### Fluxo obrigatório

> ⚠️ Após cada `git commit`, fazer `git push origin main` imediatamente.
> O Base44 detecta mudanças no repo e sincroniza o deploy automaticamente.

```bash
git add <arquivos>
git commit -m "tipo: descrição"
git push origin main
```

### Regras de commit

1. **Um commit por arquivo/tarefa** — não juntar mudanças diferentes
2. **Mensagem descritiva** — `feat:`, `fix:`, `refactor:`, `docs:` + descrição clara
3. **Push imediato** — nunca deixar commits locais sem push
4. **Verificar antes de commitar** — `git diff --staged` para revisar

---

## Erros Conhecidos e Fixes

| Erro | Causa | Fix |
|------|-------|-----|
| `EyeSlash` não existe | lucide-react | Usar `EyeOff` |
| `SelectItem value=""` | shadcn não aceita string vazia | Usar `value="none"` |
| `hasEntity()` retorna true mas entidade não existe | SDK pré-popula stubs | Usar `ensureEntity()` que testa conectividade real |
| `html2canvas` crash no PDF | Vite error overlay no DOM | `ignoreElements` para pular `#vite-error-overlay` |
| `import('xlsx')` não resolve | Import dinâmico falha no Vite | `import * as XLSX from 'xlsx'` (estático no topo) |
| Cartões duplicados | `fetchCards` sem dedup na migração | Deduplicação automática via `_autoDeduplicate()` |
| `clearAllData` não limpava tudo | localStorage iteration bug + React Query cache | Coleta chaves antes de remover + `queryClient.clear()` |
| `405 app-logs/*` | Logging do Base44 | Ignorar — não afeta o app |

---

## Como Continuar

1. Clone o repo: `git clone https://ghp_TOKEN@github.com/Samfred-hld/Rattio.git`
2. `npm install` + criar `.env.local` com `VITE_BASE44_APP_ID` e `VITE_BASE44_APP_BASE_URL`
3. `npm run dev`
4. Para novas features: criar backlog items na Fase 11+
5. Para entidades: criar `.jsonc` em `base44/entities/` + `base44 entities push`
6. Para functions: criar em `base44/functions/` + `base44 functions deploy`
7. Para automations: configurar em `function.jsonc` da function
8. Para bugs: corrigir, commit, push

### Console útil

```javascript
// No browser console:
lumenSetup.deduplicateAll()    // limpar duplicatas manualmente
lumenSetup.run()               // verificar status das entidades
```

---

## Referência do HTML Original

O arquivo `rattio_gestao_v5.html` (487KB) está no repo para referência visual. Linhas úteis:

| Feature | Linhas |
|---------|--------|
| Sidebar + Nav | 1650–1670 |
| Dashboard | 3158–3520 |
| Transaction Modal | 2640–2700 |
| Calendar | 5600–5840 |
| Goals | 5400–5600 |
| Budgets | 4900–5100 |
| Reports/Charts | 5600–5900 |
| Settings/Config | 6600–6830 |
| Global Search | 6300–6400 |
| CSV Import | 6000–6200 |
