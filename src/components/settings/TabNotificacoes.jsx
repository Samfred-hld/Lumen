import React, { useState, useEffect } from 'react';
import MsIcon from '@/components/ui/ms-icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/financeUtils';
import { getLocal, setLocal } from '@/lib/store/helpers';

// ═══ LocalStorage Helpers ═══
const NOTIF_PREFS_KEY = 'notif_prefs';
const BILL_REMINDERS_KEY = 'notif_bill_reminders';

function getNotifPrefs() {
  return getLocal(NOTIF_PREFS_KEY, { budgetAlerts: true, budgetThreshold: 80, browserNotif: false });
}

function saveNotifPrefs(prefs) {
  setLocal(NOTIF_PREFS_KEY, prefs);
}

function getBillReminders() {
  return getLocal(BILL_REMINDERS_KEY, []);
}

function saveBillReminders(reminders) {
  setLocal(BILL_REMINDERS_KEY, reminders);
}

// ═══ Section wrapper ═══
function Section({ icon, title, children, actions }) {
  return (
    <div className="rounded border border-border/60 bg-card shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded bg-primary/10"><MsIcon name={icon} size={16} className="text-primary" /></div>
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        {actions}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

// ═══ Bill Reminder Modal ═══
function BillReminderModal({ open, onClose, onSave, reminder }) {
  const [form, setForm] = useState({ name: '', dueDay: '', amount: '' });
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }));

  useEffect(() => {
    if (reminder) {
      setForm({
        name: reminder.name || '',
        dueDay: reminder.dueDay?.toString() || '',
        amount: reminder.amount?.toString() || '',
      });
    } else {
      setForm({ name: '', dueDay: '', amount: '' });
    }
  }, [reminder, open]);

  const handleSave = () => {
    if (!form.name.trim() || !form.dueDay) return;
    onSave({
      id: reminder?.id || Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      name: form.name.trim(),
      dueDay: parseInt(form.dueDay) || 1,
      amount: parseFloat(form.amount) || 0,
      active: reminder?.active ?? true,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{reminder ? 'Editar Lembrete' : 'Novo Lembrete'}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nome</Label>
            <Input value={form.name} onChange={e => set('name', e.target.value)} className="mt-1" placeholder="Ex: Aluguel, Internet..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dia do Vencimento</Label>
              <Input type="number" min="1" max="31" value={form.dueDay} onChange={e => set('dueDay', e.target.value)} className="mt-1" placeholder="1-31" />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" min="0" step="0.01" value={form.amount} onChange={e => set('amount', e.target.value)} className="mt-1" placeholder="Opcional" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave}>{reminder ? 'Salvar' : 'Adicionar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══ Main Tab Component ═══
export default function TabNotificacoes() {
  const [prefs, setPrefs] = useState(() => getNotifPrefs());
  const [reminders, setReminders] = useState(() => getBillReminders());
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [browserNotifDenied, setBrowserNotifDenied] = useState(false);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'denied') {
      setBrowserNotifDenied(true);
    }
  }, []);

  const updatePrefs = (updates) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    saveNotifPrefs(next);
  };

  const handleToggleBrowserNotif = async (checked) => {
    if (checked && 'Notification' in window) {
      const result = await Notification.requestPermission();
      if (result === 'denied') {
        setBrowserNotifDenied(true);
        return;
      }
      if (result === 'granted') {
        setBrowserNotifDenied(false);
      }
    }
    updatePrefs({ browserNotif: checked });
  };

  const handleSaveReminder = (data) => {
    let updated;
    if (editingReminder) {
      updated = reminders.map(r => r.id === editingReminder.id ? { ...r, ...data } : r);
    } else {
      updated = [...reminders, data];
    }
    setReminders(updated);
    saveBillReminders(updated);
    setShowReminderModal(false);
    setEditingReminder(null);
  };

  const handleToggleReminder = (id) => {
    const updated = reminders.map(r => r.id === id ? { ...r, active: !r.active } : r);
    setReminders(updated);
    saveBillReminders(updated);
  };

  const handleDeleteReminder = (id) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    saveBillReminders(updated);
  };

  return (
    <>
      {/* ── Budget Alert Preferences ── */}
      <Section icon="notifications_active" title="Alertas de Orçamento">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Alertas de orçamento</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Receber alertas quando o orçamento se aproximar do limite</p>
            </div>
            <Switch
              checked={prefs.budgetAlerts}
              onCheckedChange={(checked) => updatePrefs({ budgetAlerts: checked })}
            />
          </div>

          {prefs.budgetAlerts && (
            <div className="space-y-2 pl-0">
              <Label className="text-xs text-muted-foreground">Alertar quando atingir</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={50}
                  max={100}
                  step={5}
                  value={prefs.budgetThreshold}
                  onChange={(e) => {
                    const val = Math.min(100, Math.max(50, parseInt(e.target.value) || 80));
                    updatePrefs({ budgetThreshold: val });
                  }}
                  className="w-20 h-8 text-sm text-center"
                />
                <span className="text-sm text-muted-foreground">% do orçamento</span>
              </div>
              <div className="flex gap-1 mt-1">
                {[50, 60, 70, 80, 90, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => updatePrefs({ budgetThreshold: v })}
                    className={cn(
                      "px-2 py-1 text-xs rounded transition-colors",
                      prefs.budgetThreshold === v
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── Bill Reminders ── */}
      <Section
        icon="calendar_month"
        title="Lembretes de Contas"
        actions={
          <Button size="sm" variant="outline" onClick={() => { setEditingReminder(null); setShowReminderModal(true); }}>
            <MsIcon name="add" size={12} className="mr-1" />Adicionar
          </Button>
        }
      >
        <p className="text-xs text-muted-foreground mb-3">Configure lembretes para contas com vencimento fixo.</p>
        {reminders.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-3">Nenhum lembrete cadastrado</p>
        ) : (
          <div className="space-y-1.5">
            {reminders.map(r => (
              <div key={r.id} className={cn(
                "flex items-center gap-3 p-2.5 rounded border transition-colors",
                r.active ? "border-border/60 hover:bg-muted/40" : "border-border/30 opacity-60"
              )}>
                <div className={cn(
                  "w-8 h-8 rounded flex items-center justify-center text-xs font-bold shrink-0",
                  r.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  {r.dueDay}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", !r.active && "line-through text-muted-foreground")}>{r.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Vence dia {r.dueDay}{r.amount > 0 && ` - ${formatCurrency(r.amount)}`}
                  </p>
                </div>
                <Switch
                  checked={r.active}
                  onCheckedChange={() => handleToggleReminder(r.id)}
                  className="shrink-0"
                />
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => { setEditingReminder(r); setShowReminderModal(true); }}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                    aria-label="Editar lembrete"
                  >
                    <MsIcon name="edit" size={12} />
                  </button>
                  <button
                    onClick={() => handleDeleteReminder(r.id)}
                    className="p-1.5 hover:bg-red-50 rounded text-red-400"
                    aria-label="Excluir lembrete"
                  >
                    <MsIcon name="delete" size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* ── Browser Notifications ── */}
      <Section icon="notifications" title="Notificações no Navegador">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Notificações no navegador</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Receber notificações push no navegador</p>
            </div>
            <Switch
              checked={prefs.browserNotif}
              onCheckedChange={handleToggleBrowserNotif}
              disabled={browserNotifDenied}
            />
          </div>
          {browserNotifDenied && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-700 text-xs">
              <MsIcon name="info" size={14} />
              <span>Notificações bloqueadas pelo navegador. Altere as permissões nas configurações do navegador.</span>
            </div>
          )}
        </div>
      </Section>

      {/* ── Reminder Modal ── */}
      <BillReminderModal
        open={showReminderModal}
        onClose={() => { setShowReminderModal(false); setEditingReminder(null); }}
        onSave={handleSaveReminder}
        reminder={editingReminder}
      />
    </>
  );
}
