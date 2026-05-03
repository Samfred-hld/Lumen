# Feature: Metas

> Referências: [BANCO_DE_DADOS.md](../BANCO_DE_DADOS.md) · [API_CONTRATO.md](../API_CONTRATO.md)

## Escopo
Criação e acompanhamento de metas financeiras com dois modos de progresso.

## Arquivos envolvidos
- `src/pages/Goals.jsx` — listagem, GoalModal, DepositModal, HistoryModal
- `src/lib/financeUtils.js` — `getGoalProgress(goal, transactions)`

## Modos de progresso
- `manual` — usuário informa o valor atual via DepositModal
- `linked` — progresso calculado somando transações com `goalId === goal.id`

## Cálculo
```js
function getGoalProgress(goal, transactions) {
  if (goal.progressMode === 'linked') {
    const current = transactions
      .filter(t => t.goalId === goal.id && t.type === 'investment')
      .reduce((s, t) => s + t.value, 0);
    return { current, percent: Math.min(100, (current / goal.targetValue) * 100) };
  }
  return {
    current: goal.currentValue || 0,
    percent: Math.min(100, ((goal.currentValue || 0) / goal.targetValue) * 100)
  };
}
```
