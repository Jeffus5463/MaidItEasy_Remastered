// MaidItEasy design tokens — extracted from the HTML/CSS design prototype.
// Palette, spacing and typography are the single source of truth for the app.

export const colors = {
  // Brand
  primary: '#0e6e63',
  primaryDark: '#0a554d',
  primaryTintBg: '#eaf3f0',
  mint: '#8fe3d6',

  // Aircon accent (blue)
  blue: '#1e6fa8',
  blueTint: '#e7f0f7',

  // Warm/cream surfaces
  cream: '#efe9df',
  creamAlt: '#fbf6ee',
  creamDeep: '#efe7d9',
  sand: '#f0e9dc',
  border: '#e3dccb',
  borderSoft: '#ece3d2',

  // Accents
  gold: '#f6a840',
  goldTint: '#fff2df',
  goldText: '#b06f10',
  danger: '#c0503e',

  // Text
  ink: '#17211f',
  inkSoft: '#4a544f',
  muted: '#8a938f',
  mutedSoft: '#b3ac9c',

  // Neutrals
  white: '#ffffff',
  disabled: '#c9ccc7',
} as const;

export const fonts = {
  // Display / headings
  display: 'Bricolage_700Bold',
  displaySemi: 'Bricolage_600SemiBold',
  // Body
  regular: 'Jakarta_400Regular',
  medium: 'Jakarta_500Medium',
  semibold: 'Jakarta_600SemiBold',
  bold: 'Jakarta_700Bold',
  extrabold: 'Jakarta_800ExtraBold',
} as const;

export const radius = {
  sm: 10,
  md: 13,
  lg: 15,
  xl: 22,
  pill: 999,
} as const;

export const spacing = (n: number) => n * 4;

export const shadow = {
  cta: {
    shadowColor: colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;
