# Feature: Cartões

> Referências: [BANCO_DE_DADOS.md](../BANCO_DE_DADOS.md) · [API_CONTRATO.md](../API_CONTRATO.md)

## Escopo
Gestão de cartões de crédito/débito e acompanhamento de faturas.

## Arquivos envolvidos
- `src/pages/Settings.jsx` — CRUD de cartões (aba Cartões)
- `src/lib/store.js` — fetchCards, addCard, updateCard, deleteCard
- `src/hooks/useData.js` — useCards()
- `src/pages/Reports.jsx` — forecast de fatura por cartão

## Ciclo de fatura
closingDay (dia de fechamento) → dueDay (dia de vencimento)
Transações com cardId + invoiceMonth = mês do ciclo

## Sync cloud/local
Cartões são armazenados tanto no Base44 (entidade Card) quanto em localStorage
(`rattio_cards`) como cache. A função `fetchCards()` em store.js sincroniza os dois,
usando Base44 como fonte de verdade quando disponível.
