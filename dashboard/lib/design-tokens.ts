/**
 * StakePilot Design Tokens
 * 
 * Use these consistently throughout the app.
 * Import: import { colors, spacing, typography } from '@/lib/design-tokens'
 */

export const colors = {
  // Backgrounds
  bg: {
    primary: '#0a0a0a',      // Page background
    secondary: '#111111',    // Cards, elevated surfaces
    tertiary: '#171717',     // Hover states, inputs
    accent: '#1a1a1a',       // Subtle highlights
  },
  
  // Text
  text: {
    primary: '#ffffff',      // Headlines, important
    secondary: '#a3a3a3',    // Body text (neutral-400)
    muted: '#737373',        // Captions, labels (neutral-500)
    disabled: '#525252',     // Disabled state (neutral-600)
  },
  
  // Brand / Accent (Solana Green)
  brand: {
    primary: '#14f195',      // Primary CTAs, highlights
    hover: '#00dc82',        // Hover state
    muted: 'rgba(20, 241, 149, 0.1)',  // Subtle backgrounds
    glow: 'rgba(20, 241, 149, 0.2)',   // Glow effects
  },
  
  // Semantic
  success: {
    DEFAULT: '#22c55e',      // green-500
    muted: 'rgba(34, 197, 94, 0.1)',
  },
  warning: {
    DEFAULT: '#f59e0b',      // amber-500
    muted: 'rgba(245, 158, 11, 0.1)',
  },
  error: {
    DEFAULT: '#ef4444',      // red-500
    muted: 'rgba(239, 68, 68, 0.1)',
  },
  
  // Borders
  border: {
    DEFAULT: '#262626',      // neutral-800
    hover: '#404040',        // neutral-700
    focus: '#14f195',        // Brand color for focus
  },
};

export const spacing = {
  page: {
    x: 'px-4 md:px-6 lg:px-8',
    y: 'py-16 md:py-24',
  },
  section: 'py-16 md:py-24',
  card: 'p-6 md:p-8',
  gap: {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
    xl: 'gap-12',
  },
};

export const typography = {
  // Display (hero)
  display: 'text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight',
  
  // Headings
  h1: 'text-3xl sm:text-4xl font-bold tracking-tight',
  h2: 'text-2xl sm:text-3xl font-semibold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-medium',
  
  // Body
  body: 'text-base text-neutral-400 leading-relaxed',
  bodyLg: 'text-lg text-neutral-400 leading-relaxed',
  small: 'text-sm text-neutral-500',
  
  // Special
  stat: 'text-3xl sm:text-4xl font-bold font-mono',
  statLabel: 'text-sm text-neutral-500 uppercase tracking-wide',
};

export const radius = {
  sm: 'rounded-lg',      // 8px - buttons, inputs
  md: 'rounded-xl',      // 12px - small cards
  lg: 'rounded-2xl',     // 16px - cards
  xl: 'rounded-3xl',     // 24px - large cards, hero elements
  full: 'rounded-full',  // pills, avatars
};

export const shadows = {
  card: 'shadow-xl shadow-black/20',
  glow: 'shadow-lg shadow-[#14f195]/20',
  hover: 'hover:shadow-xl hover:shadow-black/30',
};

// Tailwind CSS custom classes to add to globals.css
export const cssVariables = `
:root {
  --color-bg-primary: #0a0a0a;
  --color-bg-secondary: #111111;
  --color-bg-tertiary: #171717;
  --color-text-primary: #ffffff;
  --color-text-secondary: #a3a3a3;
  --color-text-muted: #737373;
  --color-brand: #14f195;
  --color-brand-hover: #00dc82;
  --color-border: #262626;
}
`;

// Component-specific styles
export const components = {
  button: {
    primary: 'px-6 py-3 bg-[#14f195] hover:bg-[#00dc82] text-black font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-[#14f195]/20',
    secondary: 'px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-medium rounded-xl border border-neutral-700 transition-all duration-200',
    ghost: 'px-6 py-3 hover:bg-white/5 text-neutral-300 hover:text-white font-medium rounded-xl transition-all duration-200',
  },
  card: {
    base: 'p-6 md:p-8 bg-[#111111] border border-neutral-800 rounded-2xl',
    hover: 'p-6 md:p-8 bg-[#111111] border border-neutral-800 rounded-2xl hover:border-neutral-700 hover:bg-[#171717] transition-all duration-200',
    glow: 'p-6 md:p-8 bg-[#111111] border border-[#14f195]/20 rounded-2xl shadow-lg shadow-[#14f195]/10',
  },
  input: 'w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-500 focus:border-[#14f195] focus:ring-2 focus:ring-[#14f195]/20 outline-none transition-all',
};
