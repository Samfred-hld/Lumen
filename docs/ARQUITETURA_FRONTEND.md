# Lúmen — Arquitetura Frontend

## Estrutura de pastas
```
src/
├── api/
│   └── base44Client.js              # Cliente Base44 (BaaS) — não alterar
├── components/
│   ├── finance/                     # Componentes de domínio financeiro
│   │   ├── TransactionModal         # Modal/Sheet de criação e edição de transação
│   │   ├── FinancialHealthScore     # Score de saúde financeira (Dashboard)
│   │   ├── QuickEntry               # Entrada rápida de transação
│   │   ├── CSVImport                # Importação de transações via CSV
│   │   ├── SuggestionBanner         # Banner de sugestão de categorização
│   │   ├── DashCustomizeModal       # Customização das seções do Dashboard
│   │   └── InstallmentConfirm       # Confirmação de edição de parcelas
│   ├── ui/                          # Componentes shadcn/ui (não alterar diretamente)
│   │   ├── adaptive-modal.jsx       # Modal adaptativo: Sheet (mobile) / Dialog (desktop)
│   │   ├── fab.jsx                  # Floating Action Button (mobile only)
│   │   ├── swipe-to-delete          # Swipe para deletar (mobile)
│   │   └── [shadcn components]
│   ├── Layout.jsx                   # Layout raiz: sidebar, bottom nav, header, FAB, notificações
│   └── GlobalSearch.jsx             # Busca global (Cmd+K)
├── hooks/
│   ├── useData.js                   # Hooks centralizados com real-time: useTransactions, useBudgets, useGoals, useCards
│   ├── useMonthNavigation.js        # Hook de navegação de mês reutilizável
│   └── use-mobile.jsx              # useIsMobile() — breakpoint 768px
├── lib/
│   ├── store.js                     # CRUD local + sync Base44: cards, rules, templates, settings
│   ├── financeUtils.js              # Utilitários de cálculo financeiro (puro, sem side effects)
│   ├── autoCorrelations.js          # Categorização automática por descrição
│   ├── notifications.js             # Sistema de notificações de vencimento
│   ├── notificationStore.js         # Centro de notificações persistente (localStorage)
│   ├── entitySetup.js               # Setup e migração de entidades Base44
│   ├── categories.js                # Lista de categorias padrão
│   ├── AuthContext.jsx              # Contexto de autenticação Base44
│   ├── query-client.js              # Configuração do TanStack Query
│   └── utils.js                     # cn() e utilitários gerais
├── pages/
│   ├── Dashboard.jsx                # / — visão consolidada do mês
│   ├── Transactions.jsx             # /transactions
│   ├── Budgets.jsx                  # /budgets
│   ├── Goals.jsx                    # /goals
│   ├── CalendarPage.jsx             # /calendar
│   ├── Reports.jsx                  # /reports
│   └── Settings.jsx                 # /settings
└── App.jsx                          # Rotas + providers (Auth, QueryClient, Router)
```

## Padrões de componente

### Página padrão
```jsx
export default function NomeDaPagina() {
  // 1. Hooks de dados — sempre de useData.js
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: budgets = [] } = useBudgets();

  // 2. Navegação de mês — sempre via hook
  const { month, year, navigate } = useMonthNavigation();

  // 3. Estado local de UI
  const [showModal, setShowModal] = useState(false);

  // 4. Dados derivados (useMemo quando custoso)
  const filtered = useMemo(() =>
    filterByMonth(transactions, year, month), [transactions, year, month]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {/* conteúdo */}
    </div>
  );
}
```

### Modal padrão (AdaptiveModal)
```jsx
import { AdaptiveModal } from '@/components/ui/adaptive-modal';
// Sheet em mobile, Dialog em desktop — automaticamente

function MeuModal({ open, onClose }) {
  return (
    <AdaptiveModal open={open} onOpenChange={onClose} title="Título">
      {/* conteúdo do form */}
    </AdaptiveModal>
  );
}
```

### Tratamento de erro obrigatório
```js
try {
  await base44.entities.Entidade.create(data);
} catch (err) {
  console.error('[NomeDoModulo] Erro em nomeDaFuncao:', err);
  toast({ variant: 'destructive', title: 'Erro ao salvar', description: err.message });
}
```

## Responsividade — convenções mobile

| Breakpoint | Uso |
|------------|-----|
| `lg:hidden` | Visível apenas em mobile |
| `hidden lg:flex` | Visível apenas em desktop |
| `p-4 lg:p-6` | Padding menor em mobile |
| `grid-cols-1 lg:grid-cols-2` | Layout em coluna em mobile |

**Mobile-first obrigatório:**
- Navegação: bottom nav bar (mobile) / sidebar (desktop)
- Modais: `<AdaptiveModal>` (Sheet bottom / Dialog center)
- FAB: `fixed bottom-20 right-4 lg:bottom-6 lg:right-6`
- Listagens longas: swipe-to-delete habilitado com `<SwipeToDelete>`
