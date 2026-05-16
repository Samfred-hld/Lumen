/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Semantic tokens (CSS var-driven for theme switching) ──
        "on-secondary-container": "var(--on-secondary-container, #586378)",
        "on-secondary-fixed-variant": "var(--on-secondary-fixed-variant, #3c475b)",
        "on-tertiary-container": "var(--on-tertiary-container, #ffe5db)",
        "warning": "#D97706",
        "tertiary": "var(--tertiary, #7f4025)",
        "danger": "var(--danger, #DC2626)",
        "outline": "var(--outline, #6e7977)",
        "error": "var(--error, #ba1a1a)",
        "on-error": "var(--on-error, #ffffff)",
        "tertiary-fixed-dim": "var(--tertiary-fixed-dim, #ffb598)",
        "surface-low": "var(--surface-low, #F1F5F9)",
        "on-background": "var(--on-background, #181c1c)",
        "primary-fixed": "var(--primary-fixed, #9cf2e8)",
        "chart-expense": "#991B1B",
        "on-surface": "var(--on-surface, #181c1c)",
        "secondary-fixed": "var(--secondary-fixed, #d7e3fc)",
        "inverse-primary": "var(--inverse-primary, #80d5cb)",
        "surface-container-highest": "var(--surface-container-highest, #e0e3e1)",
        "on-tertiary-fixed": "var(--on-tertiary-fixed, #370e00)",
        "on-secondary": "var(--on-secondary, #ffffff)",
        "secondary-container": "var(--secondary-container, #d4e0f9)",
        "error-container": "var(--error-container, #ffdad6)",
        "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant, #72361b)",
        "inverse-on-surface": "var(--inverse-on-surface, #eef1f0)",
        "foreground": "var(--foreground-hex, #0F172A)",
        "primary-light": "var(--primary-light, #14B8A6)",
        "surface-container-lowest": "var(--surface-container-lowest, #ffffff)",
        "on-tertiary": "var(--on-tertiary, #ffffff)",
        "secondary-fixed-dim": "var(--secondary-fixed-dim, #bbc7df)",
        "editorial-rule": "var(--editorial-rule, rgba(194, 65, 12, 0.3))",
        "kpi-income": "#10B981",
        "primary-container": "var(--primary-container, #0f766e)",
        "on-error-container": "var(--on-error-container, #93000a)",
        "surface": "var(--surface, #FFFFFF)",
        "primary-fixed-dim": "var(--primary-fixed-dim, #80d5cb)",
        "background": "var(--bg-hex, #F8FAFC)",
        "chart-income": "#1A5C3A",
        "info": "var(--info, #0284C7)",
        "on-primary-fixed": "var(--on-primary-fixed, #00201d)",
        "tertiary-fixed": "var(--tertiary-fixed, #ffdbce)",
        "surface-variant": "var(--surface-variant, #e0e3e1)",
        "muted-foreground": "var(--muted-foreground, #64748B)",
        "primary": "var(--primary-hex, #005c55)",
        "on-surface-variant": "var(--on-surface-variant, #3e4947)",
        "on-primary-container": "var(--on-primary-container, #a3faef)",
        "navy-light": "var(--navy-light, #1E293B)",
        "surface-tint": "var(--surface-tint, #006a63)",
        "inverse-surface": "var(--inverse-surface, #2d3130)",
        "surface-dim": "var(--surface-dim, #d7dbd9)",
        "on-secondary-fixed": "var(--on-secondary-fixed, #101c2e)",
        "surface-border": "var(--surface-border, #E2E8F0)",
        "success": "#059669",
        "surface-bright": "var(--surface-bright, #f7faf8)",
        "on-primary-fixed-variant": "var(--on-primary-fixed-variant, #00504a)",
        "kpi-expense": "#EF4444",
        "surface-container": "var(--surface-container, #ebefed)",
        "surface-container-low": "var(--surface-container-low, #f1f4f3)",
        "surface-container-high": "var(--surface-container-high, #e5e9e7)",
        "on-primary": "var(--on-primary, #ffffff)",
        "tertiary-container": "var(--tertiary-container, #9c573a)",
        "outline-variant": "var(--outline-variant, #bdc9c6)",
        "chart-investment": "#C2410C",

        // ── shadcn/ui compat (HSL) ──
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        // primary already defined above as hex
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        navy: 'hsl(var(--navy))',
        'navy-deep': 'hsl(var(--navy-deep))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
          'header': 'var(--sidebar-header-bg)',
          'header-border': 'var(--sidebar-header-border)',
          'header-text': 'var(--sidebar-header-text)',
          'body': 'var(--sidebar-body-bg)',
          'body-text': 'var(--sidebar-body-text)',
          'body-active': 'var(--sidebar-body-active)',
          'body-hover': 'var(--sidebar-body-hover)',
        }
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px'
      },
      spacing: {
        'mobile-nav-height': '64px',
        'section-padding': '24px',
        'xs': '4px',
        'md': '16px',
        'base': '8px',
        'section-inner': '24px',
        'card-padding': '20px',
        'mobile-header-height': '56px',
        'sm': '12px',
        'xl': '40px',
        'unit': '8px',
        'lg': '24px',
        'header-h': '40px',
        'card-inner': '20px',
        'sidebar-w': '264px',
        'sidebar-width': '264px',
        'sidebar-collapsed': '76px',
        'header-height': '40px'
      },
      fontFamily: {
        'display-hero': ['Inter', 'system-ui', 'sans-serif'],
        'label-caps': ['Inter', 'system-ui', 'sans-serif'],
        'headline': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Inter', 'system-ui', 'sans-serif'],
        'body-lg': ['Inter', 'system-ui', 'sans-serif'],
        'title': ['Inter', 'system-ui', 'sans-serif'],
        'mono-kbd': ["'Fira Code'", 'monospace'],
        'body-sm': ['Inter', 'system-ui', 'sans-serif'],
        'title-caps': ['Inter', 'system-ui', 'sans-serif'],
        'mono-number': ["'JetBrains Mono'", "'Fira Code'", 'monospace'],
        'display-sm': ['Inter', 'system-ui', 'sans-serif'],
        'label': ['Inter', 'system-ui', 'sans-serif'],
        'data-lg': ["'JetBrains Mono'", 'monospace'],
        'data-md': ["'JetBrains Mono'", 'monospace'],
        'headline-lg': ['Inter', 'system-ui', 'sans-serif'],
        'headline-md': ['Inter', 'system-ui', 'sans-serif'],
        'display-lg': ['Inter', 'system-ui', 'sans-serif'],
        'body-md': ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-hero': ['60px', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '700' }],
        'label-caps': ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }],
        'headline': ['18px', { lineHeight: '28px', fontWeight: '600' }],
        'display': ['60px', { lineHeight: '1.0', letterSpacing: '-0.03em', fontWeight: '700' }],
        'body-lg': ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'title': ['14px', { lineHeight: '20px', letterSpacing: '0.3px', fontWeight: '700' }],
        'mono-kbd': ['10px', { lineHeight: '16px', fontWeight: '600' }],
        'body-sm': ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'title-caps': ['14px', { lineHeight: '20px', letterSpacing: '0.3px', fontWeight: '700' }],
        'mono-number': ['14px', { lineHeight: '20px', letterSpacing: '-0.02em', fontWeight: '400' }],
        'display-sm': ['22px', { lineHeight: '1.2', letterSpacing: '-0.02em', fontWeight: '700' }],
        'label': ['11px', { lineHeight: '16px', letterSpacing: '0.08em', fontWeight: '600' }]
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' }
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(8px)' },
          to: { opacity: '1', transform: 'translateX(0)' }
        },
        'count-up': {
          from: { opacity: '0', transform: 'translateY(3px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
        'ticker': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' }
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.35s ease-out',
        'fade-in-up': 'fade-in-up 0.45s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.3s ease-out',
        'count-up': 'count-up 0.3s ease-out',
        'ticker': 'ticker 0.4s ease-out',
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
