---
name: Lúmen Dark Theme
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bdc9c6'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#889391'
  outline-variant: '#3e4947'
  surface-tint: '#80d5cb'
  primary: '#80d5cb'
  on-primary: '#003733'
  primary-container: '#0f766e'
  on-primary-container: '#a3faef'
  inverse-primary: '#006a63'
  secondary: '#ffb59d'
  on-secondary: '#5d1800'
  secondary-container: '#b43700'
  on-secondary-container: '#ffd8cc'
  tertiary: '#b9c7e0'
  on-tertiary: '#233144'
  tertiary-container: '#5c6a80'
  on-tertiary-container: '#dfeaff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#9cf2e8'
  primary-fixed-dim: '#80d5cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#00504a'
  secondary-fixed: '#ffdbd0'
  secondary-fixed-dim: '#ffb59d'
  on-secondary-fixed: '#390c00'
  on-secondary-fixed-variant: '#832600'
  tertiary-fixed: '#d5e3fd'
  tertiary-fixed-dim: '#b9c7e0'
  on-tertiary-fixed: '#0d1c2f'
  on-tertiary-fixed-variant: '#3a485c'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-lg:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Work Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Work Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Work Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-caps:
    fontFamily: Work Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
spacing:
  unit: 4px
  container-max: 1280px
  gutter: 24px
  margin-desktop: 40px
  margin-mobile: 16px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system establishes a sophisticated, editorial atmosphere tailored for high-stakes financial journalism. The aesthetic balances the intellectual weight of a traditional broadsheet with the high-velocity precision of modern fintech. By utilizing a "Financial Newspaper" style, the interface prioritizes information density, legibility, and structural authority.

The personality is serious, analytical, and premium. It avoids the playful softness of consumer tech in favor of a rigorous, structured environment that feels like a professional terminal. The emotional response should be one of confidence and focus, providing users with the clarity needed to digest complex market data under a refined dark-mode palette.

## Colors

The color strategy for this design system is rooted in a "Deep Slate" foundation, providing a high-contrast environment that reduces eye strain while maintaining a premium feel.

- **Foundations:** The base surface uses a deep Slate 900 to provide maximum depth, while Slate 800 defines interactive surfaces and card containers.
- **Action & Accent:** Teal 700 serves as the primary action color, chosen for its professional association with stability and growth.
- **Editorial Rule:** A Burnt Orange accent is reserved strictly for decorative hero dividers and high-level editorial categorizations, applied at 25% opacity to create a subtle "ink-on-paper" highlight effect without overwhelming the dark theme.
- **Contrast:** Text colors are strictly tiered between Slate 50 for primary content to ensure maximum readability, and Slate 400 for metadata and supporting captions.

## Typography

The typographic system utilizes a triple-font approach to distinguish between narrative content, functional UI, and financial data.

1. **Editorial Expression:** `Newsreader` is used for headlines and display text, evoking the authoritative voice of traditional journalism. It features slight serifs that thrive in high-contrast dark mode.
2. **Functional Interface:** `Work Sans` provides a clean, neutral sans-serif foundation for body copy and general UI elements. It is chosen for its exceptional legibility at smaller scales.
3. **Financial Precision:** `JetBrains Mono` is used for all numerical data, stock tickers, and currency values. The use of tabular figures ensures that columns of numbers align perfectly for easy scanning and comparison.

On mobile devices, display headings scale down to a maximum of 32px to maintain screen real estate while preserving the editorial hierarchy.

## Layout & Spacing

This design system employs a rigid 12-column grid for desktop layouts, transitioning to a 4-column grid for mobile. The layout philosophy is inspired by newspaper columns, prioritizing vertical rhythm and clear content segmentation.

- **The Rule of the Grid:** Elements should align strictly to a 4px baseline grid.
- **Margins & Gutters:** High-density data views use 16px gutters, while long-form editorial content increases gutters to 24px to improve breathing room.
- **Dividers:** Horizontal rules are used more frequently than whitespace to separate sections, mimicking the structural "rules" of print newspapers. Use the Burnt Orange accent at 25% opacity for top-tier section breaks.

## Elevation & Depth

In this design system, depth is communicated through **Tonal Layering** and **Structural Outlines** rather than soft shadows. This maintains the "flat" aesthetic of a printed page while providing necessary digital affordances.

- **Stacking:** The base layer is the Slate 900 floor. Secondary content, such as news cards or sidebars, sits on Slate 800 surfaces.
- **Borders:** Every surface container is defined by a crisp 1px border in Slate 700. This "box-model" approach reinforces the feeling of a structured financial ledger.
- **Zero Shadows:** Drop shadows are avoided entirely. Depth is achieved solely through the contrast between the background and the surface color, ensuring the UI feels grounded and permanent.

## Shapes

The shape language is defined by precision and rigidity. To align with the newspaper aesthetic, this design system uses a **Sharp** 2px border radius for all interactive elements, cards, and input fields.

This near-zero radius creates a distinctive "clipped" look that feels more technical and mature than standard rounded UI kits. It reinforces the professional, institutional nature of the brand. Circular shapes are permitted only for user avatars or specific status indicators to provide a clear visual contrast against the otherwise rectangular environment.

## Components

- **Buttons:** Primary actions use a solid Teal 700 background with Slate 50 text. Secondary buttons use a Slate 700 border with no fill. All buttons must have the mandatory 2px corner radius.
- **Cards:** Financial cards use the Slate 800 surface with a 1px Slate 700 border. Content inside cards should be padded at 16px or 24px, following the strict 4px spacing unit.
- **Data Tables:** Tables are the core of this design system. They must use `JetBrains Mono` for all numeric values. Headers should be `Work Sans` in All Caps with increased letter spacing. Row dividers should use the Slate 700 border color at 0.5px or 1px thickness.
- **Editorial Dividers:** A specific "Hero Rule" component is used to separate top-level sections. This is a 2px horizontal line using the Burnt Orange (#C2410C) at 25% opacity.
- **Input Fields:** Fields use a Slate 900 background (inset) with a Slate 700 border. Upon focus, the border shifts to Teal 700.
- **Chips/Tags:** Used for stock tickers or categories, tags should have a subtle Slate 800 fill and a Slate 700 border, using the monospaced font for a ticker-tape appearance.
