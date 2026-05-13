import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { getTheme, setTheme } from '@/lib/store';
import { useBudgets, useTransactions } from '@/hooks/useData';
import { useIsMobile } from '@/hooks/use-mobile';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount, generateBudgetNotifications } from '@/lib/notificationStore';
import GlobalSearch from '@/components/GlobalSearch';
import FAB from '@/components/ui/fab';
import { useTransactionModal } from '@/lib/transactionModalStore';

// Material Symbols icon component
function MsIcon({ name, className, size = 24, filled = false }) {
  return (
    <span
      className={cn('material-symbols-outlined', className)}
      style={{ fontSize: size, fontVariationSettings: `'FILL' ${filled ? 1 : 0}` }}
    >
      {name}
    </span>
  );
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'grid_view', shortcut: '1' },
  { path: '/transactions', label: 'Transações', icon: 'receipt_long', shortcut: '2' },
  { path: '/planejamento', label: 'Planejamento', icon: 'account_balance', shortcut: '3' },
  { path: '/calendar', label: 'Calendário', icon: 'calendar_today', shortcut: '4' },
  { path: '/reports', label: 'Relatórios', icon: 'bar_chart', shortcut: '5' },
  { path: '/settings', label: 'Configurações', icon: 'settings', shortcut: '6' },
];

const BOTTOM_NAV = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/transactions', label: 'Ledger', icon: 'list_alt' },
  { path: '/planejamento', label: 'Stats', icon: 'insights' },
  { path: '/settings', label: 'Config', icon: 'settings' },
];

// ═══ ARIA Live Announcer ═══
function AriaAnnouncer() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const handler = (e) => { if (e.detail) setMessage(e.detail); };
    window.addEventListener('lumen-announce', handler);
    return () => window.removeEventListener('lumen-announce', handler);
  }, []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
      {message}
    </div>
  );
}

export function announce(text) {
  window.dispatchEvent(new CustomEvent('lumen-announce', { detail: text }));
}

// ═══ Keyboard Shortcuts Help Modal ═══
function ShortcutsModal({ open, onClose }) {
  if (!open) return null;
  const shortcuts = [
    { keys: 'N', desc: 'Nova transação' },
    { keys: '/', desc: 'Buscar transações' },
    { keys: '←', desc: 'Mês anterior' },
    { keys: '→', desc: 'Próximo mês' },
    { keys: '1-7', desc: 'Navegar para página' },
    { keys: '?', desc: 'Mostrar atalhos' },
    { keys: 'Esc', desc: 'Fechar modal' },
  ];
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose} role="dialog" aria-modal="true" aria-label="Atalhos de teclado">
      <div className="bg-surface rounded-lg p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <MsIcon name="keyboard" size={18} /> Atalhos de Teclado
        </h2>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-surface-container text-xs font-mono-kbd font-semibold border border-surface-border">{s.keys}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 rounded bg-primary-container text-on-primary-container font-label-caps tracking-widest hover:brightness-110 transition-all uppercase">
          Fechar
        </button>
      </div>
    </div>
  );
}

// ═══ Relative Time Helper ═══
function relativeTime(isoDate) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `há ${diffD}d`;
  return `há ${Math.floor(diffD / 7)}sem`;
}

// ═══ Notification Center ═══
function NotificationCenter() {
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());
  const [notifs, setNotifs] = useState(getNotifications(30));

  useEffect(() => {
    if (budgets.length > 0 && transactions.length > 0) {
      generateBudgetNotifications(budgets, transactions);
      setNotifs(getNotifications(30));
      setUnreadCount(getUnreadCount());
    }
  }, [budgets, transactions]);

  useEffect(() => {
    if (open) {
      setNotifs(getNotifications(30));
      setUnreadCount(getUnreadCount());
    }
  }, [open]);

  const NotifContent = () => (
    <>
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-surface-border">
        <p className="text-sm font-semibold">Notificações</p>
        {unreadCount > 0 && (
          <button onClick={() => { markAllAsRead(); setNotifs(getNotifications(30)); setUnreadCount(getUnreadCount()); }}
            className="text-[11px] text-primary-light hover:underline font-medium">
            Marcar todas como lidas
          </button>
        )}
      </div>
      {notifs.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">✅ Nenhuma notificação</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-surface-border/60">
          {notifs.map(n => (
            <div key={n.id}
              className={cn("px-3 py-2.5 flex items-start gap-2.5 transition-colors", !n.isRead && "bg-primary/5", n.link && "cursor-pointer hover:bg-surface-container-low")}
              onClick={() => { if (n.link) { setOpen(false); navigate(n.link); } }}>
              <span className="text-base mt-0.5 shrink-0">{n.type === 'budget_alert' ? '💰' : n.type === 'goal_reminder' ? '🎯' : '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn("text-sm truncate", !n.isRead && "font-semibold")}>{n.title}</p>
                  {!n.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.message?.includes('|') ? n.message.split('|').slice(1).join('|') : n.message}</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{relativeTime(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <button onClick={(e) => { e.stopPropagation(); markAsRead(n.id); setNotifs(getNotifications(30)); setUnreadCount(getUnreadCount()); }}
                  className="p-1 rounded hover:bg-surface-container text-muted-foreground hover:text-on-surface shrink-0" aria-label="Marcar como lida">
                  <span className="text-xs">✓</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <button
      onClick={() => setOpen(!open)}
      className="relative material-symbols-outlined text-on-surface-variant hover:bg-surface-container-low p-xs rounded transition-all"
      aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
    >
      notifications
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-danger text-white text-[10px] font-bold flex items-center justify-center font-body-sm">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const [theme, setThemeState] = useState(() => getTheme());
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
    announce(next === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado');
  };

  // ═══ Global Keyboard Shortcuts ═══
  const handleKeyDown = useCallback((e) => {
    const tag = e.target.tagName;
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    const isInteractive = tag === 'BUTTON' || tag === 'A' || e.target.closest('button') || e.target.closest('a');
    if (isEditable || isInteractive) return;

    if (e.key === '?') { e.preventDefault(); setShowShortcuts(true); return; }
    if (e.key === 'Escape') { setShowShortcuts(false); setShowGlobalSearch(false); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setShowGlobalSearch(true); return; }
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); useTransactionModal.open(); return; }
    if (e.key === '/') {
      e.preventDefault();
      setShowGlobalSearch(true);
      return;
    }
    if (e.key >= '1' && e.key <= '7') {
      const idx = parseInt(e.key) - 1;
      if (NAV_ITEMS[idx]) { e.preventDefault(); navigate(NAV_ITEMS[idx].path); }
      return;
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const currentNavIdx = NAV_ITEMS.findIndex(n => n.path === location.pathname);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <AriaAnnouncer />

      {/* ═══ Desktop SideNav ═══ */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen flex flex-col hidden md:flex transition-all duration-300 z-50",
          collapsed ? "w-sidebar-collapsed" : "w-sidebar-w"
        )}
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Logo Header — light in light theme, dark in dark theme */}
        <div className="bg-sidebar-header border-b border-sidebar-header-border">
          <div className={cn("px-lg py-lg flex items-center justify-center", collapsed && "px-0")}>
            <img
              src={theme === 'dark' ? '/DarkTheme_logo.png' : '/LightTheme_logo.png'}
              alt="Lúmen"
              className="w-14 h-14 object-contain shrink-0"
            />
          </div>
        </div>

        {/* Nav Body — Navy in both themes (DESIGN.md constant) */}
        <div className="flex-1 flex flex-col bg-sidebar-body overflow-hidden">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex absolute -right-3 top-[104px] w-6 h-6 bg-surface border border-surface-border rounded-full items-center justify-center text-muted-foreground hover:text-on-surface shadow-sm z-50 transition-transform"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            <MsIcon name={collapsed ? "chevron_right" : "chevron_left"} size={14} />
          </button>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto pt-md">
            {NAV_ITEMS.map(({ path, label, icon, shortcut }) => {
              const active = location.pathname === path;
              return (
                <Link
                  key={path}
                  to={path}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center w-full px-lg py-sm font-body-lg transition-all",
                    active
                      ? "text-sidebar-body-text border-l-4 border-primary-light bg-sidebar-body-active scale-100"
                      : "text-sidebar-body-text/50 hover:bg-sidebar-body-hover hover:text-sidebar-body-text",
                    collapsed && "justify-center px-0"
                  )}
                  title={collapsed ? `${label} (${shortcut})` : undefined}
                  aria-current={active ? 'page' : undefined}
                >
                  <MsIcon name={icon} size={20} className={cn("mr-md", collapsed && "mr-0")} />
                  {!collapsed && (
                    <>
                      <span className="font-body-lg text-body-lg">{label}</span>
                      <span className="ml-auto font-mono-kbd text-mono-kbd opacity-40">⌘{shortcut}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Bottom links */}
          <div className="px-lg mt-auto pt-lg border-t border-sidebar-body-text/10">
            <button
              onClick={() => setShowShortcuts(true)}
              className={cn("flex items-center w-full py-sm text-sidebar-body-text/50 font-body-lg hover:text-sidebar-body-text transition-colors", collapsed && "justify-center")}
            >
              <MsIcon name="help_outline" size={20} className={cn("mr-md", collapsed && "mr-0")} />
              {!collapsed && <span>Support</span>}
            </button>
            <button
              onClick={toggleTheme}
              className={cn("flex items-center w-full py-sm text-sidebar-body-text/50 font-body-lg hover:text-sidebar-body-text transition-colors", collapsed && "justify-center")}
            >
              <MsIcon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} className={cn("mr-md", collapsed && "mr-0")} />
              {!collapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ═══ Top AppBar ═══ */}
      <header className="fixed top-0 right-0 w-full md:w-[calc(100%-264px)] h-header-height bg-surface flex justify-between items-center px-lg border-b border-surface-border z-40">
        <div className="flex items-center flex-1">
          {/* Mobile menu button */}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 hover:bg-surface-container-low rounded transition-colors md:hidden mr-md">
            <MsIcon name="menu" size={20} className="text-on-surface-variant" />
          </button>
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="flex items-center gap-2 flex-1 max-w-md py-2 px-3 rounded-lg border border-surface-border hover:border-primary/40 hover:bg-surface-container-low transition-all cursor-text group"
          >
            <MsIcon name="search" size={18} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            <span className="font-body-sm text-body-sm text-on-surface-variant group-hover:text-on-surface-variant/80 transition-colors">Buscar transações...</span>
            <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-muted-foreground font-mono-kbd border border-surface-border">⌘K</kbd>
          </button>
        </div>
        <div className="flex items-center gap-md">
          <NotificationCenter />
          <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden border border-surface-border">
            <div className="w-full h-full bg-primary-light flex items-center justify-center">
              <MsIcon name="person" size={16} className="text-on-primary" />
            </div>
          </div>
        </div>
      </header>

      {/* ═══ Main Content ═══ */}
      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300", collapsed ? "md:ml-sidebar-collapsed" : "md:ml-sidebar-w")}>
        <main className="flex-1 overflow-y-auto pt-header-height pb-mobile-nav-height md:pb-xl px-lg md:px-xl max-w-7xl mx-auto" role="main">
          <Outlet />
        </main>
      </div>

      {/* ═══ Mobile Bottom Nav ═══ */}
      <nav
        className="fixed bottom-0 w-full z-50 md:hidden bg-surface border-t border-surface-border shadow-lg flex justify-around items-center h-mobile-nav-height px-md"
        role="navigation"
        aria-label="Navegação principal"
      >
        {BOTTOM_NAV.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col items-center font-bold transition-colors active:scale-95",
                active ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={active ? 'page' : undefined}
            >
              <MsIcon name={icon} size={24} filled={active} />
              <span className="font-label-caps text-[9px] uppercase tracking-tighter">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* FAB (Mobile) */}
      <button
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-2xl flex items-center justify-center z-50 md:hidden scale-100 active:scale-90 transition-transform"
        onClick={() => useTransactionModal.open()}
      >
        <MsIcon name="add" size={28} />
      </button>

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <GlobalSearch open={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
    </div>
  );
}
