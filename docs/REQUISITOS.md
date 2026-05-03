# Lúmen — Requisitos do Sistema

## Visão geral
Aplicação web de gestão financeira pessoal (B2C). Cada usuário gerencia suas próprias
finanças de forma isolada. Autenticação e armazenamento gerenciados pelo Base44 (BaaS).

## Stack técnica
- Frontend: React 18 + Vite + TailwindCSS + shadcn/ui (Radix UI)
- Estado assíncrono: TanStack React Query v5 com subscribe real-time
- BaaS: Base44 SDK (@base44/sdk) — autenticação, entidades e real-time
- Formulários: react-hook-form + zod
- Roteamento: react-router-dom v6
- Gráficos: recharts
- Utilitários: date-fns, lucide-react, lodash

## Páginas e responsabilidades
| Rota | Componente | Responsabilidade |
|------|-----------|-----------------|
| / | Dashboard | Visão consolidada do mês: KPIs, gráficos, metas, orçamentos, transações recentes |
| /transactions | Transactions | Listagem, busca, filtros, criação e edição de transações |
| /budgets | Budgets | Orçamentos mensais por categoria com acompanhamento de uso |
| /goals | Goals | Metas financeiras com progresso manual ou vinculado a transações |
| /calendar | CalendarPage | Calendário mensal com transações por dia |
| /reports | Reports | Relatórios históricos, forecast, comparativo real vs planejado, exportação |
| /settings | Settings | Cartões, categorias, regras, templates, configurações gerais |

## Funcionalidades core — não podem quebrar
1. Criação, edição e exclusão de transações (tipo: income / expense / investment)
2. Validação de formulários via Zod em todos os modais
3. Atualização em real-time via subscribe do Base44 (useData.js)
4. Cálculo correto de totais mensais (receita, despesa, saldo) — vide financeUtils.js
5. Orçamentos: cálculo de % usado por categoria no mês correto
6. Metas: cálculo de progresso (manual ou via transações vinculadas por goalId)
7. Exportação PDF (jsPDF + html2canvas) e Excel (SheetJS/xlsx)
8. Navegação de mês em todas as páginas via useMonthNavigation hook

## Regras de negócio críticas
- Transações de tipo `investment` NÃO entram no cálculo de despesas do orçamento
- O campo `LS_PREFIX = 'rattio_'` no localStorage NÃO deve ser alterado (compatibilidade)
- Parcelas (`isInstallment: true`) compartilham o mesmo `installmentSeriesId`
- Transações fixas (`isFixed: true`) são geradas automaticamente todo mês
- O forecast de cartão filtra por `invoiceMonth` (mês de competência), não por data da transação
- `clearAllData` exige confirmação textual "EXCLUIR TUDO" antes de executar

## Padrões obrigatórios
- Toda busca de entidade deve usar os hooks de `src/hooks/useData.js` (não useQuery direto)
- Erros em blocos catch SEMPRE logam com `console.error('[Módulo] msg', err)`
- Modais usam `<AdaptiveModal>` (Sheet em mobile, Dialog em desktop)
- Ícone-only buttons sempre têm `aria-label`
- Navegação de mês sempre via `useMonthNavigation` hook
