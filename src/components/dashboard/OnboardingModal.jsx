import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import MsIcon from '@/components/ui/ms-icon';
import { cn } from '@/lib/utils';
import { setOnboarded } from '@/lib/store';
import { Link } from 'react-router-dom';

const STEPS = [
  { icon: 'auto_awesome', title: 'Bem-vindo ao Lúmen!', desc: 'Seu assistente de controle financeiro pessoal. Vamos configurar tudo em segundos.', color: 'text-primary' },
  { icon: 'add', title: 'Registre suas transações', desc: 'Adicione receitas e despesas. Use o botão "Novo" ou pressione N a qualquer momento.', color: 'text-emerald-600', tip: 'Dica: ative "Lançamento fixo" para gastos mensais recorrentes.' },
  { icon: 'credit_card', title: 'Cartões de crédito', desc: 'Cadastre seus cartões em Configurações para controlar faturas e limites.', color: 'text-blue-500', link: '/settings', linkLabel: 'Ir para Configurações' },
  { icon: 'flag', title: 'Metas e orçamentos', desc: 'Defina metas de economia e orçamentos por categoria para manter o controle.', color: 'text-amber-600' },
  { icon: 'upload', title: 'Importe seus dados', desc: 'Tem dados em planilha? Importe CSV direto pela página de Transações.', color: 'text-amber-600' },
];

export default function OnboardingModal({ open, onClose }) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-sm" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className={cn("mx-auto mb-3 w-14 h-14 rounded flex items-center justify-center bg-muted", current.color)} aria-hidden="true">
              <MsIcon name={current.icon} size={28} />
            </div>
            {current.title}
          </DialogTitle>
        </DialogHeader>
        <div className="text-center space-y-3">
          <p className="text-sm text-muted-foreground">{current.desc}</p>
          {current.tip && (
            <div className="bg-primary/5 border border-primary/20 rounded p-3 text-xs text-primary"><MsIcon name="lightbulb" size={14} className="align-middle mr-1" />{current.tip}</div>
          )}
          {current.link && (
            <Link to={current.link} onClick={onClose}>
              <Button variant="outline" size="sm" className="text-xs">{current.linkLabel} <MsIcon name="arrow_forward" size={12} className="ml-1" /></Button>
            </Link>
          )}
        </div>
        <div className="flex items-center justify-center gap-1.5 my-2" role="tablist" aria-label="Progresso do onboarding">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-muted")}
              role="tab" aria-selected={i === step} aria-label={`Passo ${i + 1} de ${STEPS.length}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {step > 0 && <Button variant="outline" className="flex-1" onClick={() => setStep(s => s - 1)}>Voltar</Button>}
          <Button className="flex-1" onClick={async () => {
            if (step < STEPS.length - 1) setStep(s => s + 1);
            else { await setOnboarded(); onClose(); }
          }}>
            {step < STEPS.length - 1 ? 'Próximo' : 'Começar!'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
