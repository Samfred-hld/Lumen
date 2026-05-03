// ══════════════════════════════════════════
// LÚMEN — Notifications (Client-side)
// ══════════════════════════════════════════
// Due date notifications + persistent notification center (localStorage).

import { getCards, getSalaryConfig } from './store';
import { format, getDate } from 'date-fns';

// ── Browser Notification (due dates) ──
const NOTIFICATION_KEY = 'rattio_lastNotificationCheck';

function canNotify() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
  return false;
}

function alreadyNotifiedToday(key) {
  try {
    const last = localStorage.getItem(NOTIFICATION_KEY);
    const today = format(new Date(), 'yyyy-MM-dd');
    if (last === `${key}_${today}`) return true;
    localStorage.setItem(NOTIFICATION_KEY, `${key}_${today}`);
    return false;
  } catch (err) {
    console.error('[Notifications] Erro em alreadyNotifiedToday:', err);
    return false;
  }
}

export function checkDueDateNotifications() {
  if (!canNotify()) return;

  const today = new Date();
  const currentDay = getDate(today);
  const cards = getCards();
  const salaryConfig = getSalaryConfig();

  // Check card due dates
  for (const card of cards) {
    const dueDay = parseInt(card.dueDay) || 10;
    const daysUntil = dueDay - currentDay;

    if ((daysUntil === 3 || daysUntil === 1) && !alreadyNotifiedToday(`card_${card.id}_${daysUntil}`)) {
      new Notification(`🔔 Fatura ${card.name}`, {
        body: `Vence em ${daysUntil} dia(s) (dia ${dueDay})`,
        icon: '/favicon.ico',
        tag: `card-${card.id}`,
      });
    }
  }

  // Check salary
  if (salaryConfig.autoGenerate || salaryConfig.value > 0) {
    const salaryDay = parseInt(salaryConfig.day) || 5;
    const daysUntil = salaryDay - currentDay;

    if ((daysUntil === 1 || daysUntil === 0) && !alreadyNotifiedToday(`salary_${daysUntil}`)) {
      new Notification(`💰 Salário`, {
        body: daysUntil === 0 ? 'Cai hoje!' : `Cai amanhã (dia ${salaryDay})`,
        icon: '/favicon.ico',
        tag: 'salary',
      });
    }
  }
}

// ══════════════════════════════════════════
// Notification Center (localStorage persist)
// ══════════════════════════════════════════

const NOTIF_KEY = 'rattio_notifications';

function loadNotifications() {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveNotifications(list) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
  } catch {}
}

export function createNotification({ title, message, type = 'system', link = null }) {
  const list = loadNotifications();
  // Evita duplicatas: não cria se já existe não-lida com mesmo título nas últimas 24h
  const recent = Date.now() - 24 * 60 * 60 * 1000;
  const duplicate = list.find(
    (n) => !n.isRead && n.title === title && new Date(n.createdAt).getTime() > recent
  );
  if (duplicate) return;
  list.unshift({
    id: crypto.randomUUID(),
    title,
    message,
    type,
    link,
    isRead: false,
    createdAt: new Date().toISOString(),
  });
  // Mantém no máximo 50 notificações
  saveNotifications(list.slice(0, 50));
}

export function getNotifications() {
  return loadNotifications();
}

export function getUnreadCount() {
  return loadNotifications().filter((n) => !n.isRead).length;
}

export function markAsRead(id) {
  const list = loadNotifications().map((n) =>
    n.id === id ? { ...n, isRead: true } : n
  );
  saveNotifications(list);
}

export function markAllAsRead() {
  saveNotifications(loadNotifications().map((n) => ({ ...n, isRead: true })));
}

export function clearNotifications() {
  localStorage.removeItem(NOTIF_KEY);
}

// ══════════════════════════════════════════
// Auto-generated alerts
// ══════════════════════════════════════════

export function generateBudgetAlerts(budgets, transactions, month, year) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  budgets.forEach((b) => {
    const gasto = transactions
      .filter(
        (t) =>
          t.category === b.category &&
          t.type === 'expense' &&
          t.date?.startsWith(prefix)
      )
      .reduce((s, t) => s + (t.value || 0), 0);
    const pct = b.limit > 0 ? Math.round((gasto / b.limit) * 100) : 0;
    if (pct >= 100) {
      createNotification({
        title: `Orçamento estourado: ${b.category}`,
        message: `Você gastou ${pct}% do limite de ${b.category} este mês.`,
        type: 'budget_alert',
        link: '/budgets',
      });
    } else if (pct >= 80) {
      createNotification({
        title: `Orçamento quase no limite: ${b.category}`,
        message: `${pct}% do orçamento de ${b.category} já foi utilizado.`,
        type: 'budget_alert',
        link: '/budgets',
      });
    }
  });
}
