export const colors = {
  // Brand Primary & Secondary
  maroonPrimary: '#6B1D2F',
  maroonDark: '#4A101E',
  maroonLight: '#8C2942',
  maroonBg: '#520C25',
  
  goldPrimary: '#FACC15',
  goldLight: '#FDE047',
  goldDark: '#CA8A04',
  goldSoft: '#FEF08A',

  // Neutrals
  creamBackground: '#FAF7F2',
  cardWhite: '#FFFFFF',
  textDark: '#1E293B',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  
  // Borders & Input Backgrounds
  borderSubtle: '#F1E6EA',
  borderInput: '#E2E8F0',
  inputBackground: '#F8FAFC',
  
  // Status Colors
  successGreen: '#16A34A',
  successBg: '#DCFCE7',
  errorRed: '#DC2626',
  errorBg: '#FEF2F2',
  errorBorder: '#FCA5A5',

  // Accents
  whatsappGreen: '#16A34A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  hero: 32,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const shadows = {
  soft: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
};

export const theme = {
  colors,
  spacing,
  radius,
  shadows,
};

export default theme;
