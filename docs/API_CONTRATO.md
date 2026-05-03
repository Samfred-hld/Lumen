# Lúmen — Contrato de API e Hooks

> O Lúmen não tem backend próprio. A "API" é o Base44 SDK acessado via
> `src/api/base44Client.js`. Os dados trafegam via hooks React Query.
> Vide: `src/hooks/useData.js`

## Hooks de dados centralizados (useData.js)

Todos os componentes DEVEM usar esses hooks. Nunca usar useQuery direto para essas entidades.

```js
// Retorna { data: Transaction[], isLoading, error }
useTransactions(limit = 500)

// Retorna { data: Budget[], isLoading, error }
useBudgets()

// Retorna { data: Goal[], isLoading, error }
useGoals()

// Retorna { data: Card[], isLoading, error }
useCards()
```

Todos os hooks incluem subscribe real-time do Base44 internamente.

## Operações CRUD por entidade

### Transaction
```js
// Listar (usado internamente pelo hook)
base44.entities.Transaction.list('-date', 500)

// Filtrar por mês — SEMPRE use isso, nunca filtre 500 no cliente
base44.entities.Transaction.filter({
  date: { $gte: `${year}-${mm}-01`, $lte: `${year}-${mm}-31` }
}, '-date', 200)

// Criar
base44.entities.Transaction.create({ description, date, value, type, category, ... })

// Atualizar
base44.entities.Transaction.update(id, partialData)

// Deletar
base44.entities.Transaction.delete(id)
```

### Budget
```js
base44.entities.Budget.list('', 500)
base44.entities.Budget.filter({ month: 'YYYY-MM' })
base44.entities.Budget.create({ category, limit, month, isRecurring })
base44.entities.Budget.update(id, data)
base44.entities.Budget.delete(id)
```

### Goal / Card / Rule / Template
Seguem o mesmo padrão: `.list()`, `.filter()`, `.create()`, `.update()`, `.delete()`

## Funções utilitárias (financeUtils.js)

```js
formatCurrency(value)        // → "R$ 1.234,56"
formatDate(dateStr)          // → "15/01/2025"
getCurrentMonthKey()         // → "2025-01"
getMonthKey(year, month)     // → "2025-01"
filterByMonth(transactions, year, month) // → Transaction[]
calcTotals(transactions)     // → { income, expense, investment, balance }
groupByCategory(transactions) // → { [category]: number }
getGoalProgress(goal, transactions) // → { current, percent }
getBudgetUsed(budget, transactions) // → number
getLast6Months()             // → [{ year, month }]
```

## Eventos globais (CustomEvent via window)

```js
// Abrir modal de nova transação
window.dispatchEvent(new CustomEvent('lumen-new-transaction'))

// Abrir com tipo pré-selecionado
window.dispatchEvent(new CustomEvent('lumen-new-transaction', {
  detail: { defaultType: 'income' | 'expense' | 'investment' }
}))

// Screen reader announcement
window.dispatchEvent(new CustomEvent('lumen-announce', { detail: 'mensagem' }))
```

## Notificações persistentes (notificationStore.js)

```js
createNotification({ title, message, type, link? })
getNotifications(limit?) // → AppNotification[]
getUnreadCount()         // → number
markAsRead(id)
markAllAsRead()
generateBudgetNotifications(budgets, transactions)
```

## Regras de validação (Zod schemas)

Todos os modais usam react-hook-form + zodResolver. Schemas definidos no topo de cada arquivo.
- TransactionModal: `transactionSchema` — value > 0, description 2-100 chars, date YYYY-MM-DD
- BudgetModal: `budgetSchema` — category obrigatória, limit > 0, month YYYY-MM
- GoalModal: `goalSchema` — name 2-60 chars, targetValue > 0
