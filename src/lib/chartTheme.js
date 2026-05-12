// ══════════════════════════════════════════
// LÚMEN — Chart Theme (shared Recharts styles)
// ══════════════════════════════════════════

export const CHART_COLORS = {
  income: '#1A5C3A',
  expense: '#991B1B',
  investment: '#C2410C',
  neutral: '#78716C',
};

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '10px',
    border: '1px solid hsl(var(--border))',
    background: 'hsl(var(--card))',
    color: 'hsl(var(--foreground))',
    fontSize: '12px',
    padding: '8px 12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
    fontFamily: 'inherit',
  },
  cursor: { fill: 'hsl(var(--muted))', opacity: 0.35 },
  wrapperStyle: { outline: 'none' },
};

export const AXIS_STYLE = {
  tick: { fontSize: 11, fill: 'hsl(var(--muted-foreground))', fontFamily: 'inherit' },
  axisLine: false,
  tickLine: false,
};

export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: 'hsl(var(--border))',
  strokeOpacity: 0.5,
};
