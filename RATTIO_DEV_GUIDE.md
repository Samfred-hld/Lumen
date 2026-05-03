# LÚMEN — Guia de Desenvolvimento (Base44)

> **Documento autocontido.** Qualquer sessão OpenClaw deve conseguir continuar o desenvolvimento apenas lendo este arquivo.
> **Anteriormente chamado "Rattio"** — rebrand para Lúmen em 01/05/2026.

---

## 🔄 Estado Atual (Handoff)

**Último commit:** `e7c5ac1` — fix: performance CSV import — subscribe pausado + staleTime + cache otimístico
**Branch:** `main`
**Stack:** React + Vite + Tailwind CSS + Radix UI + Base44 (backend + auth + storage + real-time)
**Status:** ✅ Todas as fases concluídas (0–10). Entidades dedicadas para sync na nuvem.

### Entidades Base44

| Entidade | Status | Uso |
|----------|--------|-----|
| Transaction | ✅ | Transações financeiras (com campo `source` para rastrear origem) |
| Budget | ✅ | Orçamentos por categoria (com `isRecurring` para auto-replicação) |
| Goal | ✅ | Metas de economia/investimento (com `progressMode` manual/linked) |
| Card | ✅ | Cartões de crédito (sync cross-device) |
| Rule | ✅ | Regras de auto-categorização |
| Template | ✅ | Templates de transação |
| FixedTemplate | ✅ | Templates fixos para geração recorrente via cron |
| Setting | ✅ | Configurações key-value (tema, salário, etc.) |
| UserConfig | ✅ | Legacy — mantido para compatibilidade |

### Fases concluídas

- ✅ **Fase 0** — Refatoração Base (REFACT-01 a 04)
- ✅ **Fase 1** — Alta Prioridade (BACKLOG-01 a 07)
- ✅ **Fase 2** — Média Prioridade (BACKLOG-08 a 16)
- ✅ **Fase 3** — Baixa Prioridade (BACKLOG-17 a 27)
- ✅ **Fase 4** — Backend Functions (FUNC-01 a 04)
- ✅ **Fase 5** — Real-time Sync (SYNC-01 a 02)
- ✅ **Fase 6** — Pós-Deploy: Paridade com HTML (FIX-01 a 09)
- ✅ **Fase 7** — UI/UX: Adoção completa da estética HTML
- ✅ **Fase 8** — Infraestrutura: Entidades, schemas, sync e rebrand
- ✅ **Fase 9** — Qualidade: Acessibilidade, dependências, date-fns, rebranding completo
- ✅ **Fase 10** — Features: Export PDF/Excel, notificações, saúde financeira, Real vs Planejado

---

## 📋 Resumo da Fase 8 (01/05/2026)

### Entidades e Schemas

| Commit | Mudança |
|--------|---------|
| `3f7a6ca` | Criado `FixedTemplate.jsonc` + reescrito `generateRecurring/entry.ts` com log detalhado |
| `a90432e` | `Transaction.jsonc` sincronizado — adicionados `cardId`, `isInstallment`, `installmentCount`, `installmentCurrent`, `installmentTotalValue`, `invoiceMonth` |
| `1923c69` | Removido enum de `paymentMethod` — aceita string livre (métodos customizados) |
| `d916b2f` | Adicionado campo `source` em Transaction (`cron_salary`, `cron_recurring`) |
| `d28c941` | Criados `Rule.jsonc`, `Setting.jsonc`, `Template.jsonc` + `hasEntity()` com teste real de conectividade |
| `6cd84d8` | Adicionado `isRecurring` em Budget + cron `generateRecurringBudgets` |
| `23e45b6` | Adicionado `progressMode` em Goal (manual/linked) com toggle na UI |

### Store e Sync

| Commit | Mudança |
|--------|---------|
| `3f7a6ca` | `syncTemplatesToCloud()` em store.js — upsert de templates localStorage → FixedTemplate |
| `64b2ba8` | Removido `cloudStore.js` — `lsGet/lsSet` agora são wrappers diretos de localStorage |
| `433cdf9` | `useCards()` hook + `migrateCardsToCloud()` — cartões migrados para entidade Card |

### Cron Jobs

| Função | Trigger | O que faz |
|--------|---------|-----------|
| `generateRecurring` | Dia 1, 00:00 | Gera transações de FixedTemplates (com `source: 'cron_recurring'`) |
| `generateSalary` | Dia 5 (configurável) | Gera salário mensal (com `source: 'cron_salary'`) |
| `generateRecurringBudgets` | Dia 1, 00:00 | Replica budgets com `isRecurring: true` para o mês corrente |
| `sendInvoiceReminder` | Diário | Email: lembrete de fatura 3 dias antes |
| `sendBudgetAlert` | Diário | Email: alerta de orçamento ultrapassado |

### Correções de Matching

| Commit | Mudança |
|--------|---------|
| `f962b77` | `autoCorrelations.js` — suporte a RegExp, 11 entries convertidos para word boundaries (`\b99\b`, `\bPOSTO\b`, `\bTIM\b`, etc.) |

### Limpeza e Segurança

| Commit | Mudança |
|--------|---------|
| `0acc1d0` | `clearAllData()` refeito — cloud-first, lotes de 10, progresso, confirmação em 2 etapas |
| `97606a6` | `categories.js` como fonte única — removidas duplicatas de `financeUtils.js` |

### Rebrand

| Commit | Mudança |
|--------|---------|
| `8cea0fb` | Rattio → Lúmen — logo, cores (roxo/violeta), textos, exports, eventos |

---

## 📋 Resumo da Fase 9 (02/05/2026)

### Store — Cloud-first fetch com syncedAt

| Commit | Mudança |
|--------|---------|
| `55eb829` | `fetchCards`, `fetchRules`, `fetchTemplates` — adicionado `syncedAt` timestamp para rastrear última sync bem-sucedida. Comentários explicativos em português. Chaves adicionadas ao `ALL_LS_KEYS` para limpeza correta. |

### Acessibilidade — aria-label em botões icon-only

| Commit | Mudança |
|--------|---------|
| `73e4307` | Adicionado `aria-label` em 22 botões icon-only across 6 arquivos: Dashboard (2), Goals (3), Transactions (6), Budgets (2), Settings (8), QuickEntry (1). Labels em português: "Mês anterior", "Próximo mês", "Editar", "Excluir", "Limpar filtro", etc. |

### Componentes — shadcn Checkbox

| Commit | Mudança |
|--------|---------|
| `2c5f9a8` | Substituídos `<input type="checkbox">` nativos por `<Checkbox>` do Radix UI em Budgets.jsx (`isRecurring`) e TransactionModal.jsx (`isInstallment`, `isFixed`). |

### Dependências — Limpeza

| Commit | Mudança |
|--------|---------|
| `8a766ec` | Removidas dependências não utilizadas: `three` (~600KB), `react-leaflet`, `react-quill`, `moment`. `date-fns` preservada. |

### date-fns — Migração de formatação

| Commit | Mudança |
|--------|---------|
| `30330d3` | `financeUtils.js`: `getCurrentMonthKey()` → `format(new Date(), 'yyyy-MM')`, `getDaysInMonth()` → `dfGetDaysInMonth()`, `getLast6Months()` → `subMonths()`. `notifications.js`: `toISOString().split('T')[0]` → `format()`, `getDate()` do date-fns. |

### Rebranding — Rattio → Lúmen completo

| Commit | Mudança |
|--------|---------|
| `d9f038b` | Cabeçalhos atualizados em 8 arquivos (store, financeUtils, notifications, categories, transactionDetectors, entitySetup, fab, pagination, swipe-to-delete). `package.json` name → `lumen-gestao-financeira`. `LS_PREFIX` e chaves localStorage mantidos como `'rattio_'` para compatibilidade. |

---

## 📋 Resumo da Fase 10 (02/05/2026)

### Exportação PDF — Reports.jsx

| Commit | Mudança |
|--------|---------|
| `2e1dced` | Exportação do relatório mensal em PDF com `html2canvas` + `jsPDF`. Captura visual do DOM, cabeçalho "Lúmen — Relatório Financeiro", multi-página A4, nome `lumen-relatorio-{YYYY-MM}.pdf`. Botão com `<Download>`, loading state `isExporting`. |
| `e9a7b6b` | Correção Base44: `ignoreElements` no html2canvas para pular `#vite-error-overlay` (evita crash). |

### Exportação Excel — Transactions.jsx

| Commit | Mudança |
|--------|---------|
| `3206ed7` | Exportação de transações filtradas para `.xlsx` com SheetJS. Botão "Excel" com `<FileSpreadsheet>`. Colunas: Data, Descrição, Categoria, Tipo, Valor, Cartão. Arquivo: `lumen-transacoes-{YYYY-MM}.xlsx`. |
| `e9a7b6b` | Correção Base44: `import('xlsx')` dinâmico → `import * as XLSX from 'xlsx'` estático (Vite não resolvia dinâmico). Dependência `xlsx` instalada. |

### Notificações de Orçamento — Layout.jsx

| Commit | Mudança |
|--------|---------|
| `a12ef7b` | Sino `<Bell>` no Layout (mobile header + desktop top bar). Popover com alertas de orçamento ≥80% (⚠️) e ≥100% (🔴). Usa `useBudgets()` + `useTransactions()` do useData.js. Badge vermelho com contagem. Link "Ver orçamentos" → `/budgets`. |

### Score de Saúde Financeira — FinancialHealthScore.jsx

| Commit | Mudança |
|--------|---------|
| `b6d04b6` | Novo componente `src/components/finance/FinancialHealthScore.jsx`. Score 0–100 com 4 critérios (25 pts cada): taxa de poupança, orçamentos respeitados, metas com progresso ≥10%, saldo positivo. UI: círculo colorido, `<Progress>` shadcn, label (Excelente/Bom/Atenção/Crítico), lista ✅/❌. Integrado ao Dashboard abaixo dos KPIs. |

### Real vs Planejado — Reports.jsx

| Commit | Mudança |
|--------|---------|
| `ce0a6a6` | Nova seção "Real vs Planejado" em Reports. Cruza orçamentos com gastos reais do mês. Tabela: Categoria, Orçado, Realizado, Desvio, %. Desvio verde (sobrou) / vermelho (estourou). Inclui categorias sem orçamento ("Sem orçamento"). Gráfico de barras agrupadas (Orçado azul / Realizado laranja). Linha de totais. Budget query com real-time subscribe. |

### Centro de Notificações Persistente

| Commit | Mudança |
|--------|---------|
| `47c189d` | Novo `src/lib/notificationStore.js` — localStorage-based. Funções: `createNotification()`, `markAsRead()`, `markAllAsRead()`, `getUnreadCount()`, `getNotifications()`, `hasExistingBudgetAlert()` (anti-duplicata), `generateBudgetNotifications()`. Layout: `BudgetAlerts` → `NotificationCenter` completo. Popover com histórico, data relativa ("há 2h"), botão ✓ individual, "Marcar todas como lidas". Geração automática de `budget_alert` ao detectar ≥80%.

---

## 📋 Resumo — Fixes de Performance e Correções (03/05/2026)

### clearAllData — localStorage SEMPRE limpo

| Commit | Mudança |
|--------|---------|
| `adaf5d4` | `clearAllData` em `store.js`: localStorage agora é limpo **independente** de erros na nuvem. Antes só limpava se `result.success === true`, o que deixava cache fantasma após falhas parciais. `result.success` agora é determinado por erros críticos (ignora `list falhou`). Adicionado placeholder `EXTRA_KEYS` para chaves futuras fora do prefixo `rattio_`. |

| Commit | Mudança |
|--------|---------|
| `adaf5d4` | `Settings.jsx`: mensagem de conclusão diferencia cache limpo de erros na nuvem. Se houver erros parciais: `⚠️ X item(s) pode(m) não ter sido removido(s) da nuvem`. |

### Filtros de sub-tipo de despesa — 3 bugs

| Commit | Bug | Fix |
|--------|-----|-----|
| `f1c266d` | **2A:** `t.isInstallment` undefined (transações antigas) → filtro "Parceladas" não as encontra | `t.isInstallment === true` — comparação explícita |
| `f1c266d` | **2B:** Sub-filtro "Parceladas" forçava `t.type === 'expense'` mesmo com `filterType='all'` | Sub-filtros só aplicam a expenses; outros tipos passam livremente |
| `f1c266d` | **2C:** `filterExpType='installment'` persistia ao trocar para "Receitas" (sub-abas ocultas) | `useEffect` reseta `filterExpType='all'` quando `filterType` muda para tipo incompatível |

### Performance — CSV Import

| Commit | Causa | Fix |
|--------|-------|-----|
| `e7c5ac1` | **3A:** Subscribe + refetch manual gerava 6+ fetches para 100 tx (5 lotes × 2) | `importingRef` pausa subscribe durante import; 1 fetch + 1 background sync |
| `e7c5ac1` | **3B:** `staleTime: 0` (padrão) → qualquer invalidation força refetch imediato | `staleTime: 30_000` no `query-client.js` — dados frescos por 30s |
| `e7c5ac1` | **3C:** Refetch completo após import buscava todas as transações novamente | `qc.setQueryData` insere no cache instantaneamente; `refetch()` sem await em background |

**Arquivos alterados:**
- `src/lib/store.js` — `clearAllData`
- `src/pages/Settings.jsx` — mensagem de conclusão
- `src/pages/Transactions.jsx` — filtros + import com subscribe pausado + cache otimístico
- `src/hooks/useData.js` — `useTransactions` aceita `pauseSubscribeRef`
- `src/lib/query-client.js` — `staleTime: 30_000`

---

## Capacidades Reais do Base44

> **Importante:** o Base44 é muito mais capaz do que um build system simples. Ele oferece backend completo, storage, real-time e automações.

### Entidades (banco de dados)

Pode criar **quantas entidades quiser** via chat com o Base44. Cada entidade vira uma tabela no banco com CRUD automático via SDK.

```javascript
import { base44 } from '@/api/base44Client';

// CRUD completo
base44.entities.Transaction.list('-date', 500)
base44.entities.Transaction.filter({ category: 'Alimentação' })
base44.entities.Transaction.create({ ... })
base44.entities.Transaction.update(id, { ... })
base44.entities.Transaction.delete(id)

// Paginação server-side
base44.entities.Transaction.list('-date', 50, 0)   // página 1
base44.entities.Transaction.list('-date', 50, 50)  // página 2

// Real-time subscription
base44.entities.Transaction.subscribe((event) => {
  // event.type: 'create' | 'update' | 'delete'
  // event.data: dados atualizados
  refetch(); // atualiza UI automaticamente
});
```

### Módulos customizados

Pode criar **qualquer arquivo** em `lib/`, `utils/`, `hooks/`, `services/`:

```javascript
// src/lib/store.js — PODE criar e importar normalmente
export function getCards() { ... }
export function saveCards(cards) { ... }

// No componente:
import { getCards, saveCards } from '@/lib/store';
```

### Pacotes npm

Já instalados:
- `react`, `react-dom`, `react-router-dom`
- `@tanstack/react-query`
- `recharts`, `jspdf`, `html2canvas`
- `lucide-react`
- `date-fns`, `zod`, `framer-motion`, `lodash`
- `xlsx` (SheetJS — exportação Excel)
- Radix UI (shadcn/ui — 50+ componentes)

### Backend Functions (Deno)

O Base44 tem **backend serverless** na pasta `base44/functions/`:

```javascript
// base44/functions/generateRecurring/entry.ts
export default async function handler({ entities }) {
  // ...
}
```

**Funções atuais:**
- `generateRecurring` — Cron: gerar transações fixas todo dia 1
- `generateSalary` — Cron: gerar salário mensal
- `generateRecurringBudgets` — Cron: replicar budgets recorrentes todo dia 1
- `sendInvoiceReminder` — Email: lembrete de fatura 3 dias antes
- `sendBudgetAlert` — Email: alerta de orçamento ultrapassado

### Autenticação Multi-tenant

Já funciona automaticamente. Cada usuário vê apenas seus próprios dados (isolamento por `created_by`).

### O que NÃO pode (limitações reais)

| Limitação | Impacto | Workaround |
|-----------|---------|------------|
| Sem staging/production | Deploy direto | Criar segundo app Base44 para staging |
| Sem full-text search nativo | Busca em muitos registros | Paginação + filtros server-side |
| Sem WebSocket customizado | Apenas subscribe do SDK | Usar `.subscribe()` que já existe |
| Builder reescreve ao pedir mudanças | Perder código manual | Commit antes de pedir mudanças grandes |
| Não cria entidades via API | Só via chat do Base44 | Pedir ao Base44 para criar |

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
│   ├── store.js                     # localStorage helpers + CRUD entidades
│   ├── categories.js                # Fonte única: categorias, ícones, cores, meses
│   ├── autoCorrelations.js          # Auto-categorização (string + RegExp)
│   ├── constants.js                 # Constantes do app
│   ├── notifications.js             # Browser Notification API para vencimentos
│   ├── notificationStore.js         # Centro de notificações persistente (localStorage)
│   ├── transactionDetectors.js      # Auto-detect parcelamento + estorno
│   └── entitySetup.js               # Setup de entidades + migração (lumenSetup)
│
├── hooks/
│   ├── useData.js                   # Hooks com query + subscribe (useTransactions, useBudgets, useGoals, useCards)
│   └── use-mobile.jsx              # Detect mobile
│
├── components/
│   ├── Layout.jsx                   # Sidebar + nav + atalhos + NotificationCenter + FAB
│   ├── GlobalSearch.jsx             # Busca global ⌘K
│   ├── finance/
│   │   ├── TransactionModal.jsx     # Modal de transação com autocomplete + detecção automática
│   │   ├── CSVImport.jsx            # Import CSV com dia de fechamento do cartão
│   │   ├── QuickEntry.jsx           # Lançamento rápido
│   │   ├── InstallmentConfirm.jsx   # Confirmar exclusão de parcelas
│   │   ├── DashCustomizeModal.jsx   # Personalizar seções do Dashboard
│   │   └── FinancialHealthScore.jsx # Score de saúde financeira 0-100
│   └── ui/                          # shadcn/ui + customizados
│       ├── pagination.jsx           # Paginação reutilizável
│       ├── swipe-to-delete.jsx      # Swipe gesture mobile
│       └── fab.jsx                  # Floating Action Button mobile
│
├── pages/
│   ├── Dashboard.jsx                # 10 seções customizáveis + KPIs com delta + Health Score
│   ├── Transactions.jsx             # Lista com paginação + swipe + filtros + export Excel
│   ├── Budgets.jsx                  # Orçamentos com real-time + isRecurring
│   ├── Goals.jsx                    # Metas com progressMode (manual/linked)
│   ├── CalendarPage.jsx             # Calendário com transações
│   ├── Reports.jsx                  # Relatórios + forecast + export PDF + Real vs Planejado
│   └── Settings.jsx                 # 3 abas: Personalização | Automação | Backup
│
└── base44/functions/                # Backend Deno
    ├── generateRecurring/entry.ts   # Cron: gerar transações fixas (source: cron_recurring)
    ├── generateSalary/entry.ts      # Cron: gerar salário (source: cron_salary)
    ├── generateRecurringBudgets/entry.ts  # Cron: replicar budgets recorrentes
    ├── sendInvoiceReminder/entry.ts # Email: lembrete de fatura
    └── sendBudgetAlert/entry.ts     # Email: alerta de orçamento
```

---

## Checklist de Implementação

### Fase 0 — Refatoração Base
- [x] REFACT-01: Criar `src/lib/store.js`
- [x] REFACT-02: Criar `src/lib/categories.js`
- [x] REFACT-03: Refatorar componentes para usar módulos
- [x] REFACT-04: Migrar configs para entidades nuvem

### Fase 1 — Alta Prioridade
- [x] BACKLOG-01: Duplicar Transação
- [x] BACKLOG-02: Toast com Undo
- [x] BACKLOG-03: Busca Global ⌘K
- [x] BACKLOG-04: Quick Entry
- [x] BACKLOG-05: Autocomplete de Descrições
- [x] BACKLOG-06: Confirmar Exclusão de Parcelas
- [x] BACKLOG-07: Validação de Formulário

### Fase 2 — Média Prioridade
- [x] BACKLOG-08: Dashboard Customizável
- [x] BACKLOG-09: Seções Extras do Dashboard
- [x] BACKLOG-10: Meios de Pagamento Customizáveis
- [x] BACKLOG-11: Templates de Transação
- [x] BACKLOG-12: Extrato do Cartão
- [x] BACKLOG-13: Histórico de Investimento
- [x] BACKLOG-14: Ícones de Categoria
- [x] BACKLOG-15: Notificações de Vencimento
- [x] BACKLOG-16: Planejado vs Real

### Fase 3 — Baixa Prioridade
- [x] BACKLOG-17: Relatórios Avançados
- [x] BACKLOG-18: Paginação de Listas
- [x] BACKLOG-19: Swipe to Delete
- [x] BACKLOG-20: Backup com Histórico
- [x] BACKLOG-21: Importação CSV Avançada
- [x] BACKLOG-22: Config Tabs
- [x] BACKLOG-23: FAB
- [x] BACKLOG-24: Focus Trap
- [x] BACKLOG-25: Detecção de Parcelamento
- [x] BACKLOG-26: Detecção de Estorno
- [x] BACKLOG-27: Grain Texture

### Fase 4 — Backend Functions
- [x] FUNC-01: Gerar Recorrentes
- [x] FUNC-02: Gerar Salário
- [x] FUNC-03: Lembrete de Fatura
- [x] FUNC-04: Lembrete de Orçamento

### Fase 5 — Real-time Sync
- [x] SYNC-01: Subscriptions em entidades
- [x] SYNC-02: Migrar localStorage → entidades dedicadas

### Fase 6 — Pós-Deploy (HTML → React)
- [x] FIX-01 a FIX-09: Filtros, lógica pagamento/cartão, CalendarPage completo

### Fase 7 — UI/UX: Estética HTML
- [x] UI-01 a UI-09: CSS variables, border radius, shadows, sidebar

### Fase 8 — Infraestrutura
- [x] Criar entidades: Card, Rule, Setting, Template, FixedTemplate
- [x] Sincronizar schemas: Transaction (source, cardId, isInstallment, etc.), Budget (isRecurring), Goal (progressMode)
- [x] Remover cloudStore.js — lsGet/lsSet direto no localStorage
- [x] Migrar cards para entidade Card com useCards() hook
- [x] clearAllData() refeito — cloud-first, progresso, confirmação 2 etapas
- [x] categories.js como fonte única (removidas duplicatas de financeUtils.js)
- [x] autoCorrelations.js com suporte a RegExp (word boundaries)
- [x] Cron generateRecurringBudgets para budgets recorrentes
- [x] Rebrand: Rattio → Lúmen (cores roxo/violeta, logo, textos)

### Fase 9 — Qualidade e Consistência
- [x] QUAL-01: Cloud-first fetch com syncedAt (Cards, Rules, Templates)
- [x] QUAL-02: aria-label em todos os botões icon-only (22 botões, 6 arquivos)
- [x] QUAL-03: Substituir checkboxes nativos por shadcn Checkbox (Budgets, TransactionModal)
- [x] QUAL-04: Remover dependências não usadas (three, react-leaflet, react-quill, moment)
- [x] QUAL-05: Migrar formatação de Date para date-fns (financeUtils, notifications)
- [x] QUAL-06: Rebranding completo de comentários e metadados (8 arquivos + package.json)

### Fase 10 — Features e Exportação
- [x] FEAT-01: Exportação de relatório mensal em PDF (html2canvas + jsPDF)
- [x] FEAT-02: Exportação de transações filtradas para Excel (SheetJS/xlsx)
- [x] FEAT-03: Notificações de orçamento com sino no Layout (Popover + badge)
- [x] FEAT-04: Score de saúde financeira no Dashboard (0-100, 4 critérios)
- [x] FEAT-05: Seção Real vs Planejado em Reports (tabela + gráfico barras agrupadas)
- [x] FEAT-06: Centro de notificações persistente (localStorage, auto-geração budget_alert)

---

## Design System — Cores Lúmen

### Light Mode
| Token | Valor | Uso |
|-------|-------|-----|
| `--lumen-purple` | `#7C3AED` | Cor principal |
| `--lumen-purple-deep` | `#5B21B6` | Sidebar, escuro |
| `--lumen-purple-light` | `#A78BFA` | Acentos claros |
| `--lumen-lavender` | `#C4B5FD` | Tags, badges |
| `--bg-page` | `#F5F3FF` | Fundo (lavanda claro) |
| `--sidebar-bg` | `#2D1B69` | Sidebar roxa escura |

### Dark Mode
| Token | Valor |
|-------|-------|
| Primary | `263 75% 62%` |
| Sidebar | `263 35% 10%` |
| Ring | `263 75% 62%` |

### Gradientes
- `.gradient-primary` — roxo → lavanda
- `.gradient-navy` — roxo escuro → mais escuro
- `.gradient-emerald` — verde (receitas)
- `.gradient-red` — vermelho (despesas)
- `.gradient-violet` — violeta (investimentos)

---

## Como Continuar

1. Clone o repo: `git clone https://ghp_TOKEN@github.com/Samfred-hld/Rattio.git`
2. Leia este guia
3. Para novas features, crie novos backlog items na Fase 10+
4. Para criar entidades: peça ao Base44 via chat
5. Para backend functions: crie em `base44/functions/` e peça ao Base44 para configurar cron
6. Para bugs: corrija, commit, push

---

## Referência do HTML Original

O arquivo `rattio_gestao_v5.html` (487KB) está no repo. Linhas úteis:

| Feature | Linhas |
|---------|--------|
| Sidebar + Nav | 1650–1670 |
| Dashboard | 3158–3520 |
| Transaction Modal | 2640–2700 |
| Transaction CRUD | 2900–3050 |
| Quick Entry | 3600–3800, 4600–4950 |
| Autocomplete | 2707–2720 |
| Calendar | 5600–5840 |
| Goals | 5400–5600 |
| Budgets | 4900–5100 |
| Reports/Charts | 5600–5900 |
| Settings/Config | 6600–6830 |
| Global Search | 6300–6400 |
| Onboarding | 6400–6500 |
| Forecast | 2412–2430, 3376–3430 |
| CSV Import | 6000–6200 |
| Notifications | 5900+ |

---

## Git e Deploy

### Configuração (uma vez)

```bash
git config user.email "lumen@openclaw.ai"
git config user.name "Lúmen AI"
git remote set-url origin https://ghp_TOKEN@github.com/Samfred-hld/Rattio.git
```

### Fluxo obrigatório por commit

> **⚠️ IMPORTANTE:** Após cada `git commit`, fazer `git push origin main` imediatamente.
> Isso garante que o Base44 detecte as mudanças e sincronize o deploy.

```bash
git add src/pages/Transactions.jsx
git commit -m "feat: descrição da mudança"
git push origin main
```

### Regras de commit

1. **Um commit por arquivo/tarefa** — não juntar mudanças diferentes
2. **Mensagem descritiva** — `feat:`, `fix:`, `refactor:`, `docs:` + descrição clara
3. **Push imediato** — nunca deixar commits locais sem push
4. **Verificar antes de commitar** — `git diff --staged` para revisar

---

## Regras Reais do Base44

| Regra | Status | Nota |
|-------|--------|------|
| Módulos em `lib/` | ✅ Pode | Criar arquivo e importar normalmente |
| Pacotes npm | ✅ Pode | Pedir instalação ao Base44 |
| Entidades | ✅ Pode | Criar quantas quiser via chat |
| Backend functions | ✅ Pode | Pasta `base44/functions/`, Deno runtime |
| File storage | ✅ Pode | `Core.UploadFile` / `UploadPrivateFile` |
| Real-time | ✅ Pode | `.subscribe()` nativo |
| Multi-tenant | ✅ Já funciona | Isolamento automático por usuário |
| Paginação | ✅ Pode | `.list(sort, limit, skip)` |
| Staging | ⚠️ Limitado | Criar segundo app |
| Full-text search | ⚠️ Não nativo | Paginação + filtros |

---

## Erros Conhecidos e Fixes

| Erro | Causa | Fix |
|------|-------|-----|
| `EyeSlash` não existe | lucide-react | Usar `EyeOff` |
| `useEffect is not defined` | Import faltando | Adicionar `useEffect` ao import do React |
| `SelectItem value=""` | shadcn não aceita string vazia | Usar `value="none"` |
| `UserConfig 404` | Entidade não existe | Pedir ao Base44 para criar |
| `405 app-logs/*` | Logging do Base44 | Ignorar — não afeta o app |
| `hasEntity()` retorna true mas entidade não existe | SDK pré-popula stubs | Usar `ensureEntity()` que testa conectividade real |
| `html2canvas` crash no PDF | Vite error overlay no DOM | `ignoreElements` para pular `#vite-error-overlay` e iframes |
| `import('xlsx')` não resolve | Import dinâmico falha no Vite | Usar `import * as XLSX from 'xlsx'` (estático no topo) |

---

## Implementações Recentes (01–03/05/2026)

### 1. Zod + react-hook-form nos modais

Todos os modais de formulário agora usam `zod` + `react-hook-form` + `@hookform/resolvers` para validação declarativa e gerenciamento de estado.

**Modais migrados:**

| Modal | Arquivo | Schema Zod |
|-------|---------|------------|
| TransactionModal | `src/components/finance/TransactionModal.jsx` | `value` (number, positive), `description` (string, min 2, max 100), `date` (regex YYYY-MM-DD), `type` (enum income/expense/investment), `category`, `cardId`, `isFixed`, `isInstallment`, `installmentCount` (int, positive) |
| BudgetModal | `src/pages/Budgets.jsx` | `category` (string, obrigatório), `limit` (number, positive), `month` (regex YYYY-MM), `isRecurring` (boolean, opcional) |
| GoalModal | `src/pages/Goals.jsx` | `name` (string, min 2, max 60), `targetValue` (number, positive), `currentValue` (number, >= 0, opcional), `deadline` (regex YYYY-MM-DD, opcional), `icon` (string, opcional) |

**Padrão aplicado:**
```jsx
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({ /* ... */ });

const { control, register, handleSubmit, reset, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
  defaultValues: { /* ... */ },
});
```

- Inputs nativos (`<Input>`) → `register('campo')`
- Componentes controlled (`<Select>`, `<Checkbox>`, `<Tabs>`) → `<Controller name="campo" control={control} render={...} />`
- Erros inline: `<p className="text-sm text-destructive mt-1">{errors.campo?.message}</p>`
- Layout/visual dos campos não foi alterado

### 2. Correção de filtros por mês (Reports.jsx)

O cálculo de `cardExpenses` no componente `CashFlowForecast` somava todas as transações históricas do cartão sem filtrar pelo mês da fatura.

**Correção:** Adicionado filtro por `invoicePrefix` (mês/ano da fatura baseado no dia de fechamento):
```jsx
const invoicePrefix = `${invoiceYear}-${String(invoiceMonth + 1).padStart(2, '0')}`;
const cardExpenses = transactions.filter(t =>
  t.cardId === card.id && t.type === 'expense' && t.date?.startsWith(invoicePrefix)
).reduce((s, t) => s + t.value, 0);
```

### 3. Confirmação em duas etapas (Settings.jsx)

O dialog de `clearAllData` agora exige que o usuário digite `EXCLUIR TUDO` (case-sensitive) para habilitar o botão destrutivo.

- Campo `<Input>` dentro do modal
- Botão `disabled={confirmText !== 'EXCLUIR TUDO'}`
- Texto explicativo: "Esta ação é irreversível e apagará todos os seus dados permanentemente."
- Estado do input é limpo ao fechar o modal

### 4. Onboarding com sync na nuvem (Dashboard.jsx)

A conclusão do onboarding agora usa `await setOnboarded()` (de `@/lib/store`) em vez de `lsSet('onboarded', 'true')`. A função `setOnboarded()` grava no localStorage E sincroniza com o Base44 via `setSettingToCloud`.

### 5. Tratamento de erros no store.js

Todos os `catch {}` silenciosos foram substituídos por logging + toast:

```jsx
// Antes
} catch {}

// Depois (funções internas)
} catch (err) {
  console.error('[Store] Erro em função:', err);
}

// Depois (funções user-facing)
} catch (err) {
  console.error('[Store] Erro em função:', err);
  toast({ title: 'Erro ao salvar', description: 'Tente novamente.', variant: 'destructive' });
}
```

**Funções com toast de erro:** `addCard`, `updateCard`, `deleteCard`, `addRule`, `deleteRule`, `addTemplate`, `deleteTemplate`

**Arquivo `notifications.js`:** `alreadyNotifiedToday` — adicionado `console.error` no catch silencioso.

### 6. Fluxo Git

Toda alteração no repositório deve ser commitada e pushed imediatamente após a aplicação:

```bash
git add <arquivos>
git commit -m "tipo: descrição"
git push origin main
```

### 7. Correção: fetch com cloud como fonte de verdade (store.js)

As funções `fetchCards`, `fetchRules` e `fetchTemplates` tinham um bug: quando a nuvem retornava `[]` (array vazio), o código interpretava como "sem dados" e tentava migrar do localStorage para a nuvem. Isso podia causar re-upload indesejado de dados que o usuário havia limpado intencionalmente.

**Problema anterior:**
```js
// ❌ Antes: array vazio da nuvem → tentava migrar do localStorage
const cards = await base44.entities.Card.list('', 1000);
if (cards?.length) { setLocal('cards', cards); return cards; }
// cloud vazia → tentava migrar local → nuvem (errado se usuário limpou de propósito)
```

**Lógica corrigida:**
```js
// ✅ Depois: nuvem é fonte de verdade quando acessível (mesmo com [])
const cards = await base44.entities.Card.list('', 1000);
setLocal('cards', cards || []);  // atualiza cache local sempre
if (!cards?.length) {
  // Só migra se localStorage tem dados E nuvem está vazia
  const local = getCards();
  if (local.length) { /* migrate local → cloud */ }
}
return cards || [];
```

**Regras:**
1. Se a requisição **suceder** (mesmo `[]`): nuvem é fonte de verdade → atualiza localStorage
2. Se a requisição **falhar** (catch): usa localStorage como fallback
3. Se nuvem está vazia mas localStorage tem dados: migra local → nuvem (first-time sync)

**Funções corrigidas:** `fetchCards()`, `fetchRules()`, `fetchTemplates()`

**Funções NÃO alteradas** (padrão `getSettingFromCloud` — já correto): `fetchFinancings()`, `fetchSalaryConfig()`, `fetchTheme()`, etc.
