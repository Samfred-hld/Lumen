# Lúmen — Modelagem de Dados

> Banco gerenciado pelo Base44 (BaaS). Cada entidade é acessada via
> `base44.entities.NomeDaEntidade`. Dados do usuário são isolados por autenticação.
> Vide: `src/lib/entitySetup.js` e `src/lib/store.js`

## Entidades Base44

### Transaction
Entidade principal. Toda movimentação financeira do usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (auto) | Identificador único |
| description | string | Descrição da transação |
| date | string (YYYY-MM-DD) | Data de competência |
| value | number | Valor absoluto (sempre positivo) |
| type | enum | `income` \| `expense` \| `investment` |
| category | string | Categoria (ver CATEGORIES em financeUtils.js) |
| paymentMethod | string | Meio de pagamento |
| isFixed | boolean | Transação fixa/recorrente mensal |
| cardId | string? | ID do cartão (FK → Card.id) |
| goalId | string? | ID da meta vinculada (FK → Goal.id) |
| notes | string? | Observações livres |
| isInstallment | boolean | É uma parcela de compra parcelada |
| installmentIndex | number? | Número da parcela atual (1-based) |
| installmentTotal | number? | Total de parcelas |
| installmentSeriesId | string? | ID único que agrupa todas as parcelas |
| installmentCount | number? | Total de parcelas (redundante com installmentTotal) |
| installmentCurrent | number? | Parcela atual |
| installmentTotalValue | number? | Valor total da compra parcelada |
| invoiceMonth | string? | Mês de competência da fatura (YYYY-MM) — usado em cartões |
| source | string? | Origem da transação (manual, csv, auto) |

**Índices/ordenação padrão:** `-date` (mais recentes primeiro)

---

### Budget
Orçamento mensal por categoria.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (auto) | Identificador único |
| category | string | Categoria do orçamento |
| limit | number | Valor limite para o mês |
| month | string (YYYY-MM) | Mês de competência |
| isRecurring | boolean | Repetir automaticamente nos meses seguintes |

**Regra:** `getBudgetUsed(budget, transactions)` em `financeUtils.js` calcula o gasto real.

---

### Goal
Meta financeira do usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (auto) | Identificador único |
| name | string | Nome da meta |
| targetValue | number | Valor alvo total |
| currentValue | number | Valor acumulado (usado no modo manual) |
| progressMode | enum | `manual` \| `linked` |
| deadline | string? (YYYY-MM-DD) | Prazo da meta |
| color | string | Cor hex para exibição |
| description | string? | Descrição / ícone textual |
| investmentType | string? | Tipo de investimento associado |

**Regra:** No modo `linked`, o progresso é calculado somando transações com `goalId === goal.id`.

---

### Card
Cartão de crédito/débito do usuário.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (auto) | Identificador único |
| name | string | Nome do cartão |
| color | string | Cor hex |
| limit | number | Limite de crédito |
| closingDay | number | Dia de fechamento da fatura (1-31) |
| dueDay | number | Dia de vencimento da fatura (1-31) |
| brand | string | Bandeira (visa, mastercard, elo, other) |

---

### Rule
Regra de categorização automática por palavra-chave.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (auto) | Identificador único |
| keyword | string | Palavra-chave a buscar na descrição |
| category | string | Categoria a aplicar automaticamente |

---

### Template
Template de transação frequente para entrada rápida.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string (auto) | Identificador único |
| description | string | Descrição padrão |
| value | number | Valor padrão |
| category | string | Categoria padrão |
| paymentMethod | string | Meio de pagamento padrão |
| type | enum | `income` \| `expense` \| `investment` |

---

### Setting / UserConfig
Configurações do usuário persistidas na nuvem.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| key | string | Chave da configuração |
| value | string (JSON) | Valor serializado em JSON |

**Chaves conhecidas:** `salaryConfig`, `theme`, `dashSections`, `onboarded`,
`lastRecurringGen`, `suggestionsLog`, `financings`, `extraCats`, `paymentMethods`

## Armazenamento local (localStorage)
Prefixo obrigatório: `rattio_` (NÃO alterar — compatibilidade com dados existentes)

| Chave localStorage | Conteúdo |
|-------------------|----------|
| rattio_cards | Array de Card[] — espelho local do Base44 |
| rattio_rules | Array de Rule[] — espelho local |
| rattio_templates | Array de Template[] — espelho local |
| rattio_salaryConfig | { value, day, autoGenerate } |
| rattio_theme | 'light' \| 'dark' |
| rattio_onboarded | boolean |
| rattio_dashSections | Array de seções visíveis do Dashboard |
| rattio_extraCats | Array de categorias customizadas |
| rattio_paymentMethods | Array de meios de pagamento customizados |
| lumen_notifications | Array de AppNotification (notif. persistentes) |
