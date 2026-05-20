// ══════════════════════════════════════════
// LÚMEN — Centralized Icon Mapping
// ══════════════════════════════════════════
// Single source of truth for Lucide → Material Symbols icon replacements.
// Used by all custom components via MsIcon wrapper (src/components/ui/ms-icon.jsx).

/**
 * LUCIDE_TO_MATERIAL — Maps every Lucide icon name used in custom code
 * to its Material Symbols equivalent. All Material Symbols names use snake_case.
 */
export const LUCIDE_TO_MATERIAL = {
  // Navigation / Actions
  Plus: 'add',
  Trash2: 'delete',
  Pencil: 'edit',
  Edit3: 'edit_note',
  X: 'close',
  Check: 'check',
  Search: 'search',
  ArrowRight: 'arrow_forward',
  ArrowUp: 'arrow_upward',
  ArrowDown: 'arrow_downward',
  ArrowRightLeft: 'swap_horiz',
  ChevronLeft: 'chevron_left',
  ChevronRight: 'chevron_right',
  ChevronDown: 'expand_more',

  // Finance / Data
  TrendingUp: 'trending_up',
  TrendingDown: 'trending_down',
  DollarSign: 'attach_money',
  CreditCard: 'credit_card',
  Banknote: 'payments',
  Receipt: 'receipt',
  Repeat: 'repeat',
  History: 'history',
  Clock: 'schedule',

  // Files / Import
  Download: 'download',
  Upload: 'upload',
  FileText: 'description',
  FileSpreadsheet: 'table_chart',

  // Status / Alerts
  AlertTriangle: 'warning',
  AlertCircle: 'error',
  CheckCircle2: 'check_circle',
  Target: 'flag',

  // UI / Visual
  Copy: 'content_copy',
  Eye: 'visibility',
  EyeOff: 'visibility_off',
  GripVertical: 'drag_indicator',
  Layers: 'layers',
  Loader2: 'progress_activity',
  RotateCcw: 'undo',
  Sparkles: 'auto_awesome',
  Gem: 'diamond',
  Tag: 'label',
  Lightbulb: 'lightbulb',
  Calendar: 'calendar_month',
  CalendarClock: 'calendar_month',
  Columns3: 'view_column',
  QrCode: 'qr_code',

  // Theme
  Moon: 'dark_mode',
  Sun: 'light_mode',

  // Settings / Tools
  Settings: 'settings',
  Wand2: 'auto_fix_high',
  Wallet: 'account_balance_wallet',
};

/**
 * iconMap — Alias for LUCIDE_TO_MATERIAL (convenience export)
 */
export const iconMap = LUCIDE_TO_MATERIAL;

/**
 * CAT_MATERIAL_ICONS — Maps Brazilian Portuguese category names to Material Symbols icons.
 * Extracted from Planejamento.jsx for reuse by BudgetCard, GoalCard, TransactionRow.
 */
export const CAT_MATERIAL_ICONS = {
  'Alimentação': 'restaurant',
  'Transporte': 'directions_car',
  'Combustível': 'local_gas_station',
  'Moradia': 'home',
  'Saúde': 'local_hospital',
  'Academia': 'fitness_center',
  'Lazer': 'sports_esports',
  'Streaming': 'subscriptions',
  'Entretenimiento': 'movie',
  'Telecomunicações': 'phone_android',
  'Serviços': 'build',
  'Educação': 'school',
  'Educação Online': 'computer',
  'Compras online': 'shopping_cart',
  'Vestuário': 'checkroom',
  'Pet': 'pets',
  'Casa': 'home',
  'Seguro': 'shield',
  'Impostos': 'receipt',
  'Contas': 'receipt_long',
  'Viagens': 'flight',
  'Presentes': 'card_giftcard',
  'Doações': 'volunteer_activism',
  'Beleza': 'spa',
  'Bem-estar': 'self_improvement',
  'Papelaria': 'edit',
  'Salário': 'payments',
  'Investimentos': 'account_balance',
  'Financeiro': 'account_balance_wallet',
  'Outros': 'more_horiz',
  'Tarifas bancárias': 'credit_card',
  'Encargos': 'gavel',
  'Aluguel de Veículos': 'directions_car',
};

/**
 * getCategoryMsIcon — Returns the Material Symbols icon name for a given category/type.
 * Extracted from TransactionRow.jsx for reuse.
 */
export const getCategoryMsIcon = (category, type) => {
  if (type === 'income') return 'payments';
  if (type === 'investment') return 'trending_up';
  const c = (category || '').toLowerCase();
  if (c.includes('alimentação') || c.includes('restaurante')) return 'restaurant';
  if (c.includes('transporte') || c.includes('carro')) return 'electric_car';
  if (c.includes('saúde') || c.includes('farmácia')) return 'stethoscope';
  if (c.includes('compras')) return 'shopping_cart';
  if (c.includes('tecnologia')) return 'devices';
  if (c.includes('lazer')) return 'sports_esports';
  return 'shopping_bag';
};
