// ─── App Color Palette ────────────────────────────────────────────────────────

export const Colors = {
  // Primary brand
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4A42E8',

  // Accent
  accent: '#48BEFF',
  accentLight: '#7DD6FF',

  // Kid theme
  kidYellow: '#FFD60A',
  kidOrange: '#FF6B35',
  kidGreen: '#06D6A0',
  kidPink: '#FF6B9D',

  // XP / Gamification
  xpGold: '#FFB800',
  xpGoldLight: '#FFD556',
  streakOrange: '#FF6B35',
  levelPurple: '#9B5DE5',

  // Status
  success: '#06D6A0',
  warning: '#FFB800',
  danger: '#EF4444',
  info: '#3B82F6',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Dark mode surfaces
  dark: '#0F172A',
  darkCard: '#1E293B',
  darkBorder: '#334155',

  // Backgrounds
  bgLight: '#F8F9FE',
  bgParent: '#F0F4FF',
  bgKid: '#FFFBEB',
} as const;

export type ColorKey = keyof typeof Colors;
