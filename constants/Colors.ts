export const BrandColors = {
  deepSkyBlue: '#4CB5FF',
  powderBlush: '#FF9B93',
  berryCrush: '#B84A6E',
  charcoalBrown: '#2A2C29',
};

const primary = BrandColors.powderBlush;

export const Colors = {
  light: {
    primary: primary,
    primaryText: '#111418',
    background: '#FAF8F5',
    surface: '#FFFFFF',
    text: '#111418',
    textSecondary: '#6B7280',
    border: '#E5E7EB',
    input: '#F3F4F6',
    icon: '#6B7280',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.1)',
    danger: BrandColors.berryCrush,
    dangerBg: 'rgba(184, 74, 110, 0.15)',
    contrastCard: BrandColors.charcoalBrown,
    palette: BrandColors,
    cardText: '#FFFFFF', 
  },
  dark: {
    primary: primary,
    primaryText: '#000000',
    background: '#000000',
    surface: '#121212',
    text: '#FFFFFF',
    textSecondary: '#9CA3AF',
    border: '#2C2C2C',
    input: '#1A1A1A',
    icon: '#9CA3AF',
    success: '#10B981',
    successBg: 'rgba(16, 185, 129, 0.15)',
    danger: BrandColors.berryCrush,
    dangerBg: 'rgba(184, 74, 110, 0.2)',
    contrastCard: '#1E1E1E',
    palette: BrandColors,
    cardText: '#111418',
  },
};