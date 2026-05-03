# Feature: Orçamentos

> Referências: [BANCO_DE_DADOS.md](../BANCO_DE_DADOS.md) · [API_CONTRATO.md](../API_CONTRATO.md)

## Escopo
Definição e acompanhamento de limites de gastos por categoria por mês.

## Arquivos envolvidos
- `src/pages/Budgets.jsx` — listagem e BudgetModal inline
- `src/lib/financeUtils.js` — `getBudgetUsed(budget, transactions)`
- `src/lib/notificationStore.js` — `generateBudgetNotifications`
- `src/components/Layout.jsx` — NotificationCenter com alertas de orçamento

## Cálculo de uso
```js
// getBudgetUsed filtra transações do mesmo mês e categoria, tipo expense
const gasto = transactions.filter(t =>
  t.category === budget.category &&
  t.type === 'expense' &&
  t.date?.startsWith(monthPrefix)
).reduce((s, t) => s + t.value, 0);
```

**Atenção:** tipo `investment` NÃO entra no cálculo.

## Alertas automáticos
- ≥ 80% do limite → notificação de aviso
- ≥ 100% → notificação de estouro
- Gerados em `generateBudgetNotifications` ao carregar dados no Layout
