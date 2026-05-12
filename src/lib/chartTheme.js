// ══════════════════════════════════════════
// LÚMEN — Chart Theme (shared Recharts styles)
// Premium fintech palette
// ══════════════════════════════════════════

export const CHART_COLORS = {
  income: '#10B981',
  expense: '#F43F5E',
  investment: '#8B5CF6',
  neutral: '#94A3B8',
  primary: '#4F46E5',
};

export const CHART_PALETTE = [
  '#4F46E5', // indigo
  '#10B981', // emerald
  '#8B5CF6', // violet
  '#F43F5E', // rose
  '#F59E0B', // amber
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#EC4899', // pink
];

export const CHART_TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '10px',
    border: '1px solid #E5E7EB',
    background: '#FFFFFF',
    fontSize: '12px',
    fontFamily: 'DM Sans, sans-serif',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    padding: '10px 14px',
  },
  cursor: { fill: '#F1F5F9', opacity: 0.6 },
  wrapperStyle: { outline: 'none' },
};

export const AXIS_STYLE = {
  tick: {
    fontSize: 11,
    fill: '#94A3B8',
    fontFamily: 'DM Sans, sans-serif',
  },
  axisLine: false,
  tickLine: false,
};

export const GRID_STYLE = {
  strokeDasharray: '3 3',
  stroke: '#E5E7EB',
  strokeOpacity: 0.6,
};

export const BAR_RADIUS = [6, 6, 0, 0];
