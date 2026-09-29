// Nest Finance design tokens. Bright fintech look: cyan accent, white cards, light grey canvas.

export const colors = {
  primary: '#19B8E5',
  primaryDark: '#0EA5CF',
  primarySoft: '#E6F8FD',
  primaryGlass: 'rgba(255,255,255,0.22)',
  background: '#F5F6F7',
  surface: '#FFFFFF',
  text: '#15161B',
  textSecondary: '#737780',
  textOnPrimary: '#FFFFFF',
  textOnPrimaryMuted: 'rgba(255,255,255,0.78)',
  success: '#12A150',
  successSoft: '#E7F6ED',
  warning: '#F4A62A',
  warningSoft: '#FEF4E4',
  danger: '#EF4444',
  dangerSoft: '#FDECEC',
  border: '#E8EAED',
  dark: '#1B1D22',
} as const

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const

export const fonts = {
  display: 'Unbounded_600SemiBold',
  displayMedium: 'Unbounded_500Medium',
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
} as const

export const shadow = {
  card: {
    shadowColor: '#0B2A36',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  primary: {
    shadowColor: '#19B8E5',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
} as const
