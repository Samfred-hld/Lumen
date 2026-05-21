import React from 'react';
import { useThemePreference } from '@/hooks/useThemePreference';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import MsIcon from '@/components/ui/ms-icon';

const THEME_OPTIONS = [
  { value: 'light', label: 'Claro', icon: 'light_mode' },
  { value: 'dark', label: 'Escuro', icon: 'dark_mode' },
  { value: 'auto', label: 'Automático (sistema)', icon: 'brightness_auto' },
];

export default function ThemeSelector() {
  const { preference, setPreference } = useThemePreference();

  return (
    <RadioGroup
      value={preference}
      onValueChange={setPreference}
      className="flex gap-3"
    >
      {THEME_OPTIONS.map((opt) => (
        <Label
          key={opt.value}
          htmlFor={`theme-${opt.value}`}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer transition-all ${
            preference === opt.value
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border hover:border-primary/40 text-muted-foreground hover:text-foreground'
          }`}
        >
          <RadioGroupItem value={opt.value} id={`theme-${opt.value}`} className="sr-only" />
          <MsIcon
            name={opt.icon}
            size={18}
            filled={preference === opt.value}
            className={preference === opt.value ? 'text-primary' : ''}
          />
          <span className="text-sm font-medium">{opt.label}</span>
        </Label>
      ))}
    </RadioGroup>
  );
}
