import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, Target, PiggyBank,
  Calendar, BarChart3, ChevronLeft, ChevronRight, Settings, Moon, Sun, Keyboard, Bell
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getTheme, setTheme } from '@/lib/store';
import { useBudgets, useTransactions } from '@/hooks/useData';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { getNotifications, markAsRead, markAllAsRead, getUnreadCount, generateBudgetNotifications } from '@/lib/notificationStore';
import GlobalSearch from '@/components/GlobalSearch';
import FAB from '@/components/ui/fab';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, shortcut: '1' },
  { path: '/transactions', label: 'Transações', icon: ArrowLeftRight, shortcut: '2' },
  { path: '/budgets', label: 'Orçamentos', icon: PiggyBank, shortcut: '3' },
  { path: '/goals', label: 'Metas', icon: Target, shortcut: '4' },
  { path: '/calendar', label: 'Calendário', icon: Calendar, shortcut: '5' },
  { path: '/reports', label: 'Relatórios', icon: BarChart3, shortcut: '6' },
  { path: '/settings', label: 'Configurações', icon: Settings, shortcut: '7' },
];

const BOTTOM_NAV = [
  { path: '/', label: 'Início', icon: LayoutDashboard },
  { path: '/transactions', label: 'Transações', icon: ArrowLeftRight },
  { path: '/budgets', label: 'Orçamentos', icon: PiggyBank },
  { path: '/goals', label: 'Metas', icon: Target },
  { path: '/settings', label: 'Config', icon: Settings },
];

// ═══ ARIA Live Announcer (screen reader feedback) ═══
function AriaAnnouncer() {
  const [message, setMessage] = useState('');
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) setMessage(e.detail);
    };
    window.addEventListener('lumen-announce', handler);
    return () => window.removeEventListener('lumen-announce', handler);
  }, []);
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
      {message}
    </div>
  );
}

// Helper to announce to screen readers
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
      <div className="bg-card rounded p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Keyboard size={18} /> Atalhos de Teclado</h2>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.keys} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{s.desc}</span>
              <kbd className="px-2 py-0.5 rounded bg-muted text-xs font-mono font-semibold border">{s.keys}</kbd>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2 rounded bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
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
  const diffW = Math.floor(diffD / 7);
  return `há ${diffW}sem`;
}

// ═══ Notification Center Bell ═══
function NotificationCenter() {
  const { data: budgets = [] } = useBudgets();
  const { data: transactions = [] } = useTransactions();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());
  const [notifs, setNotifs] = useState(getNotifications(30));

  // Generate budget alerts when data changes
  useEffect(() => {
    if (budgets.length > 0 && transactions.length > 0) {
      generateBudgetNotifications(budgets, transactions);
      setNotifs(getNotifications(30));
      setUnreadCount(getUnreadCount());
    }
  }, [budgets, transactions]);

  // Refresh when popover/sheet opens
  useEffect(() => {
    if (open) {
      setNotifs(getNotifications(30));
      setUnreadCount(getUnreadCount());
    }
  }, [open]);

  const handleMarkRead = (id) => {
    markAsRead(id);
    setNotifs(getNotifications(30));
    setUnreadCount(getUnreadCount());
  };

  const handleMarkAllRead = () => {
    markAllAsRead();
    setNotifs(getNotifications(30));
    setUnreadCount(getUnreadCount());
  };

  const handleNavigate = (link) => {
    if (link) {
      setOpen(false);
      navigate(link);
    }
  };

  const typeIcon = {
    budget_alert: '💰',
    goal_reminder: '🎯',
    system: '🔔',
  };

  const NotifContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <p className="text-sm font-semibold">Notificações</p>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-[11px] text-primary hover:underline font-medium"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* List */}
      {notifs.length === 0 ? (
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">✅ Nenhuma notificação</p>
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
          {notifs.map(n => (
            <div
              key={n.id}
              className={cn(
                "px-3 py-2.5 flex items-start gap-2.5 transition-colors",
                !n.isRead && "bg-primary/5",
                n.link && "cursor-pointer hover:bg-muted/50"
              )}
              onClick={() => n.link && handleNavigate(n.link)}
            >
              <span className="text-base mt-0.5 shrink-0">{typeIcon[n.type] || '🔔'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className={cn("text-sm truncate", !n.isRead && "font-semibold")}>{n.title}</p>
                  {!n.isRead && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {n.message?.includes('|') ? n.message.split('|').slice(1).join('|') : n.message}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">{relativeTime(n.createdAt)}</p>
              </div>
              {!n.isRead && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                  aria-label="Marcar como lida"
                  title="Marcar como lida"
                >
                  <span className="text-xs">✓</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  // Mobile: render as bottom Sheet
  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="relative p-2 rounded hover:bg-muted text-muted-foreground transition-colors"
          aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="px-0 pb-safe rounded-t-2xl max-h-[80dvh]">
            <SheetHeader className="px-3 pt-2 pb-0">
              <div className="mx-auto w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
            </SheetHeader>
            <NotifContent />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Popover
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative p-2 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`}
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotifContent />
      </PopoverContent>
    </Popover>
  );
}

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // ═══ Theme init from localStorage (data-theme) ═══
  const [theme, setThemeState] = useState(() => getTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    setTheme(next);
    announce(next === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado');
  };

  // ═══ Global Keyboard Shortcuts ═══
  const handleKeyDown = useCallback((e) => {
    // Don't trigger shortcuts when typing in inputs
    const tag = e.target.tagName;
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
    if (isEditable) return;

    // ? — show shortcuts help
    if (e.key === '?') {
      e.preventDefault();
      setShowShortcuts(true);
      return;
    }

    // Escape — close modals
    if (e.key === 'Escape') {
      setShowShortcuts(false);
      setShowGlobalSearch(false);
      return;
    }

    // Cmd+K / Ctrl+K — global search
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setShowGlobalSearch(true);
      return;
    }

    // N — new transaction (dispatch event for current page to handle)
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('lumen-new-transaction'));
      announce('Abrindo nova transação');
      return;
    }

    // / — focus search
    if (e.key === '/') {
      e.preventDefault();
      const searchInput = document.querySelector('[data-shortcut-search]');
      if (searchInput) {
        searchInput.focus();
        announce('Campo de busca focado');
      } else {
        navigate('/transactions');
        setTimeout(() => {
          const input = document.querySelector('[data-shortcut-search]');
          if (input) input.focus();
        }, 100);
      }
      return;
    }

    // 1-7 — navigate to pages
    if (e.key >= '1' && e.key <= '7') {
      const idx = parseInt(e.key) - 1;
      if (NAV_ITEMS[idx]) {
        e.preventDefault();
        navigate(NAV_ITEMS[idx].path);
        announce(`Navegando para ${NAV_ITEMS[idx].label}`);
      }
      return;
    }
  }, [navigate]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-screen bg-background overflow-hidden font-inter">
      {/* ARIA Live Announcer */}
      <AriaAnnouncer />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative z-50 h-full flex flex-col gradient-navy transition-all duration-300",
          collapsed ? "w-[76px]" : "w-[264px]",
          "-translate-x-full lg:translate-x-0"
        )}
        role="navigation"
        aria-label="Navegação principal"
      >
        {/* Logo */}
        <div className={cn(
          "flex items-center h-16 px-5 border-b border-white/[0.08] shrink-0",
          collapsed && "justify-center px-0"
        )}>
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded gradient-primary flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-serif text-white text-xl tracking-tight">Lúmen</span>
            </div>
          )}
          {collapsed && (
            <div className="w-9 h-9 rounded gradient-primary flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <span className="text-white font-bold text-sm">R</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto px-2">
          {NAV_ITEMS.map(({ path, label, icon: Icon, shortcut }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                onClick={() => {}}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded mb-0.5 transition-all duration-200 group relative",
                  active
                    ? "bg-white/15 text-white shadow-inner"
                    : "text-white/50 hover:text-white hover:bg-white/[0.07]",
                  collapsed && "justify-center px-0"
                )}
                title={collapsed ? `${label} (${shortcut})` : undefined}
                aria-current={active ? 'page' : undefined}
              >
                {/* Active indicator bar */}
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary" />
                )}
                <Icon size={18} className={cn("shrink-0 transition-colors", active && "text-primary")} />
                {!collapsed && (
                  <>
                    <span className={cn("text-sm font-medium flex-1", active && "font-semibold")}>{label}</span>
                    <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.08] text-white/30 font-mono opacity-0 group-hover:opacity-100 transition-opacity">{shortcut}</kbd>
                  </>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme toggle + Shortcuts + Collapse toggle */}
        <div className="border-t border-white/[0.08] p-2 shrink-0 space-y-0.5">
          <button
            onClick={toggleTheme}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded text-white/40 hover:text-white hover:bg-white/[0.07] transition-all text-sm",
              collapsed && "justify-center"
            )}
            title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            aria-label={theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            {!collapsed && <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>}
          </button>
          <button
            onClick={() => setShowShortcuts(true)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded text-white/40 hover:text-white hover:bg-white/[0.07] transition-all text-sm",
              collapsed && "justify-center"
            )}
            title="Atalhos de teclado (?)"
            aria-label="Mostrar atalhos de teclado"
          >
            <Keyboard size={16} />
            {!collapsed && <span>Atalhos (?)</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden lg:flex items-center gap-2 w-full px-3 py-2 rounded text-white/40 hover:text-white hover:bg-white/[0.07] transition-all text-sm",
              collapsed && "justify-center"
            )}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Recolher</span></>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-card shrink-0">
          <span className="font-serif text-lg">Lúmen</span>
          <div className="ml-auto">
            <NotificationCenter />
          </div>
        </header>

        {/* Desktop top bar with alerts */}
        <div className="hidden lg:flex items-center justify-end h-10 px-4 border-b border-border/40 bg-card/50 shrink-0">
          <NotificationCenter />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0" role="main">
          <Outlet />
        </main>

        {/* FAB for mobile */}
        <FAB
          onNewTransaction={() => window.dispatchEvent(new CustomEvent('lumen-new-transaction'))}
          onNewIncome={() => window.dispatchEvent(new CustomEvent('lumen-new-transaction', { detail: { defaultType: 'income' } }))}
          onNewExpense={() => window.dispatchEvent(new CustomEvent('lumen-new-transaction', { detail: { defaultType: 'expense' } }))}
        />
      </div>

      {/* Bottom Navigation Bar — mobile only */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-stretch h-16 safe-area-bottom"
        role="navigation"
        aria-label="Navegação principal"
      >
        {BOTTOM_NAV.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium",
                "transition-colors active:scale-95",
                active ? "text-primary" : "text-muted-foreground"
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span>{label}</span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Shortcuts Modal */}
      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <GlobalSearch open={showGlobalSearch} onClose={() => setShowGlobalSearch(false)} />
    </div>
  );
}
