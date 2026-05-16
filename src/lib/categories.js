// ══════════════════════════════════════════
// LÚMEN — Categories (ícones, cores, listas)
// ══════════════════════════════════════════

import { lsGet } from './store';

export const DEFAULT_CATEGORIES = [
  // Renda
  'Salário',
  // Despesas do dia a dia
  'Alimentação', 'Compras online', 'Transporte', 'Combustível', 'Moradia', 'Saúde', 'Academia', 'Beleza', 'Bem-estar',
  // Educação & Trabalho
  'Educação', 'Educação Online', 'Papelaria',
  // Entretenimento & Streaming
  'Lazer', 'Streaming', 'Entretenimento',
  // Serviços & Assinaturas
  'Telecomunicações', 'Serviços', 'Tarifas bancárias', 'Impostos', 'Encargos', 'Seguro',
  // Pets & Vestuário
  'Pet', 'Vestuário',
  // Casa & Veículos
  'Casa', 'Aluguel de Veículos',
  // Financeiro & Investimentos
  'Investimentos', 'Financeiro',
  // Viagens
  'Viagens',
  // Presentes & Doações
  'Presentes', 'Doações',
  // Contas & Outros
  'Contas', 'Outros',
];

export const CATEGORY_ICONS = {
  'Salário': 'payments',
  'Alimentação': 'restaurant',
  'Compras online': 'shopping_cart',
  'Transporte': 'directions_car',
  'Combustível': 'local_gas_station',
  'Moradia': 'home',
  'Saúde': 'local_hospital',
  'Academia': 'fitness_center',
  'Beleza': 'spa',
  'Bem-estar': 'self_improvement',
  'Educação': 'school',
  'Educação Online': 'laptop',
  'Papelaria': 'edit',
  'Lazer': 'sports_esports',
  'Streaming': 'live_tv',
  'Entretenimento': 'movie',
  'Telecomunicações': 'smartphone',
  'Serviços': 'build',
  'Tarifas bancárias': 'account_balance',
  'Impostos': 'description',
  'Encargos': 'credit_card',
  'Seguro': 'shield',
  'Pet': 'pets',
  'Vestuário': 'checkroom',
  'Casa': 'construction',
  'Aluguel de Veículos': 'car_rental',
  'Investimentos': 'trending_up',
  'Financeiro': 'attach_money',
  'Viagens': 'flight',
  'Presentes': 'card_giftcard',
  'Doações': 'volunteer_activism',
  'Contas': 'receipt_long',
  'Outros': 'more_horiz',
};

export const CAT_COLORS = {
  'Salário': '#10b981',
  'Alimentação': '#f59e0b',
  'Compras online': '#8b5cf6',
  'Transporte': '#3b82f6',
  'Combustível': '#f97316',
  'Moradia': '#8b5cf6',
  'Saúde': '#ef4444',
  'Academia': '#14b8a6',
  'Beleza': '#ec4899',
  'Bem-estar': '#a78bfa',
  'Educação': '#06b6d4',
  'Educação Online': '#0ea5e9',
  'Papelaria': '#64748b',
  'Lazer': '#f97316',
  'Streaming': '#e11d48',
  'Entretenimento': '#d946ef',
  'Telecomunicações': '#6366f1',
  'Serviços': '#78716c',
  'Tarifas bancárias': '#94a3b8',
  'Impostos': '#dc2626',
  'Encargos': '#b91c1c',
  'Seguro': '#0d9488',
  'Pet': '#a3e635',
  'Vestuário': '#f472b6',
  'Casa': '#78716c',
  'Aluguel de Veículos': '#2563eb',
  'Investimentos': '#6366f1',
  'Financeiro': '#10b981',
  'Viagens': '#0ea5e9',
  'Presentes': '#f472b6',
  'Doações': '#fb7185',
  'Contas': '#ec4899',
  'Outros': '#94a3b8',
};

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MONTH_SHORT = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
];

export const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// Get all categories (default + custom from cloud sync or localStorage)
export function getCategories() {
  try {
    const extra = lsGet('extraCats', []);
    return [...DEFAULT_CATEGORIES, ...extra];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

// Get Material Symbol icon name for a category
export function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || 'more_horiz';
}

// Get Material Symbol name for category (alias — same mapping)
export function getCategoryMsIcon(cat) {
  return CATEGORY_ICONS[cat] || 'more_horiz';
}

// Get color for a category
export function getCategoryColor(cat) {
  return CAT_COLORS[cat] || '#94a3b8';
}

// Brand labels for credit cards
export const CARD_BRANDS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'elo', label: 'Elo' },
  { value: 'amex', label: 'Amex' },
  { value: 'other', label: 'Outro' },
];

export function getCardBrandLabel(brand) {
  const found = CARD_BRANDS.find(b => b.value === brand);
  return found ? found.label : 'CC';
}
