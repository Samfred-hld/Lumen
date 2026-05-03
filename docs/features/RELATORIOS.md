# Feature: Relatórios

> Referências: [BANCO_DE_DADOS.md](../BANCO_DE_DADOS.md) · [API_CONTRATO.md](../API_CONTRATO.md)

## Escopo
Relatórios históricos, forecast de cartões, comparativo real vs planejado e exportação.

## Arquivos envolvidos
- `src/pages/Reports.jsx` — componente principal
- `jspdf` + `html2canvas` — exportação PDF
- `xlsx` (SheetJS) — exportação Excel

## Seções da página
1. **KPIs do mês** — receita, despesa, saldo, taxa de poupança
2. **Histórico 6 meses** — AreaChart de receitas e despesas
3. **Forecast de cartões** — projeção por ciclo de fatura (usa `invoiceMonth`)
4. **Gastos por categoria** — BarChart horizontal
5. **Real vs Planejado** — cruza orçamentos com gasto real; BarChart agrupado
6. **Extrato do mês** — tabela de transações do mês selecionado

## Regra crítica do forecast
O cálculo de `cardExpenses` DEVE filtrar por `invoiceMonth`, nunca por `date` bruta:
```js
const cardExpenses = transactions.filter(t =>
  t.cardId === card.id &&
  t.type === 'expense' &&
  t.date?.startsWith(invoicePrefix) // invoicePrefix = YYYY-MM do ciclo atual
).reduce((s, t) => s + t.value, 0);
```

## Exportações
- PDF: captura `ref={reportRef}` via html2canvas → jsPDF → download `lumen-relatorio-YYYY-MM.pdf`
- Excel: mapeia transações filtradas → SheetJS → download `lumen-transacoes-YYYY-MM.xlsx`
