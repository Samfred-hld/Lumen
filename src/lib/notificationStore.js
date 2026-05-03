// ══════════════════════════════════════════
// LÚMEN — Notification Store (compatibility layer)
// ══════════════════════════════════════════
// Re-exports from notifications.js for backward compatibility.
// New code should import from '@/lib/notifications' directly.

export {
  createNotification,
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  generateBudgetAlerts,
} from './notifications';

// Legacy alias: generateBudgetNotifications used in Layout.jsx
import { createNotification, getNotifications as _getNotifications } from './notifications';

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
}

/**
 * Legacy: Gera notificações de orçamento (usado por Layout.jsx).
 * Preferir generateBudgetAlerts() para novos usos.
 */
export function generateBudgetNotifications(budgets, transactions) {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthTx = transactions.filter((t) => t.date?.startsWith(monthKey));
  const monthBudgets = budgets.filter((b) => b.month === monthKey);

  for (const b of monthBudgets) {
    const spent = monthTx
      .filter((t) => t.type === 'expense' && t.category === b.category)
      .reduce((s, t) => s + t.value, 0);
    const pct = b.limit > 0 ? Math.round((spent / b.limit) * 100) : 0;

    if (pct >= 80) {
      const isOver = pct >= 100;
      createNotification({
        title: b.category,
        message: `${monthKey}|${isOver ? `Orçamento estourado! ${pct}% — ${formatCurrency(spent)} de ${formatCurrency(b.limit)}` : `Atenção: ${pct}% do orçamento usado — ${formatCurrency(spent)} de ${formatCurrency(b.limit)}`}`,
        type: 'budget_alert',
        link: '/budgets',
      });
    }
  }
}
