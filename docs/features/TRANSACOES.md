# Feature: Transações

> Referências: [BANCO_DE_DADOS.md](../BANCO_DE_DADOS.md) · [API_CONTRATO.md](../API_CONTRATO.md)

## Escopo
Criação, edição, listagem e exclusão de transações financeiras.

## Arquivos envolvidos
- `src/pages/Transactions.jsx` — listagem com filtros
- `src/components/finance/TransactionModal.jsx` — criação e edição
- `src/components/finance/QuickEntry.jsx` — entrada rápida
- `src/components/finance/InstallmentConfirm.jsx` — confirmação de edição de parcelas
- `src/lib/financeUtils.js` — cálculos (calcTotals, filterByMonth)
- `src/lib/autoCorrelations.js` — categorização automática

## Fluxo principal
1. Usuário abre TransactionModal (via FAB, botão +, ou edição)
2. Formulário validado por Zod (`transactionSchema`)
3. Se `isInstallment`, gera N registros com mesmo `installmentSeriesId`
4. Se `isFixed`, flag usada pelo gerador de recorrentes
5. Salvo via `base44.entities.Transaction.create/update`
6. Real-time via subscribe em `useTransactions()` reflete imediatamente

## Tipos válidos
- `income` — receita (soma ao saldo, verde)
- `expense` — despesa (subtrai do saldo, vermelho)
- `investment` — investimento (não entra no cálculo de orçamentos)

## Filtros disponíveis em Transactions.jsx
- Por mês/ano (useMonthNavigation)
- Por tipo (income / expense / investment)
- Por categoria
- Por subtipo de despesa (fixa / variável / parcelada)
- Busca textual na descrição

## Regras de exclusão
- Parcela individual: oferece excluir só aquela ou toda a série
- Transação fixa: exclui apenas o registro, não afeta geração futura
