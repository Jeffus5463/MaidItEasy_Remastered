// MaidItEasy admin console design tokens — extracted from
// design-handoff/project/AdminPage.dc.html. Single source of truth: import
// from here, never hardcode a hex value in a page/component.

export const colors = {
  // Surfaces
  pageBg: '#f2ede3',
  sidebarBg: '#0b2b28',
  card: '#ffffff',
  cardBorder: '#ece4d4',
  inputBg: '#faf7ef',

  // Brand
  primary: '#0e6e63',
  primaryDark: '#0a554d',
  primaryTint: '#eaf3f0',
  primaryTintText: '#0a6f5f',

  // Text
  ink: '#17211f',
  inkSoft: '#4a544f',
  muted: '#8a8578',
  mutedSoft: '#b3ac9c',
  faint: '#a49e8e',

  // Borders / neutrals
  border: '#e3dccb',
  borderSoft: '#e5ddcd',
  disabled: '#c9ccc7',
  dashedBorder: '#d4cbb9',

  // Gold (warning / unassigned / pending)
  gold: '#f6a840',
  goldTint: '#fff2df',
  goldTintAlt: '#fff6ea',
  goldText: '#b06f10',
  goldTextDeep: '#8a5a12',
  goldBorder: '#f0d9b3',

  // Blue (GCash / en route)
  blue: '#1e6fa8',
  blueDeep: '#2465a8',
  blueTint: '#e7f0f7',
  blueBg: '#eef4f7',
  blueBorder: '#cfe0ea',
  blueText: '#1e5c92',
  gcashBrand: '#0a7cff',

  // Olive (in progress)
  olive: '#9caf2a',
  oliveText: '#7a8a1e',
  oliveTint: '#eef1e0',

  // Danger
  danger: '#c0503e',
  dangerTint: '#fbecea',
  dangerBorder: '#e6c9c2',
} as const;

export const fonts = {
  display: 'var(--font-display), system-ui, sans-serif',
  body: 'var(--font-body), system-ui, sans-serif',
} as const;

export const radius = {
  sm: 9,
  md: 12,
  lg: 16,
  xl: 18,
  xxl: 22,
  pill: 999,
} as const;

export function chip(bg: string, color: string) {
  return {
    background: bg,
    color,
    fontWeight: 800,
    fontSize: '10.5px',
    padding: '3px 9px',
    borderRadius: radius.pill,
    whiteSpace: 'nowrap' as const,
  };
}
