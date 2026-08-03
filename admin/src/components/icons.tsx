// Inline icon set ported 1:1 from design-handoff/project/AdminPage.dc.html.

export function HomeIcon({ color = 'currentColor', size = 19 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1v-8z" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

export function BoardIcon({ color = 'currentColor', size = 19 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="5" height="16" rx="1.5" stroke={color} strokeWidth="1.9" />
      <rect x="10" y="4" width="5" height="10" rx="1.5" stroke={color} strokeWidth="1.9" />
      <rect x="17" y="4" width="4" height="13" rx="1.5" stroke={color} strokeWidth="1.9" />
    </svg>
  );
}

export function RosterIcon({ color = 'currentColor', size = 19 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.2" stroke={color} strokeWidth="1.9" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 0 1 0 5.5M18 19c0-2.2-1-3.8-2.5-4.6" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function CatalogIcon({ color = 'currentColor', size = 19 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" stroke={color} strokeWidth="1.9" />
      <path d="M8 4v16M8 9h12M8 14h12" stroke={color} strokeWidth="1.7" />
    </svg>
  );
}

export function GcashIcon({ color = 'currentColor', size = 19 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="6" width="18" height="12" rx="2.5" stroke={color} strokeWidth="1.9" />
      <circle cx="12" cy="12" r="2.6" stroke={color} strokeWidth="1.9" />
      <path d="M6 9v6M18 9v6" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function PayoutIcon({ color = 'currentColor', size = 19 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3v18M6 7h6.5a2.5 2.5 0 0 1 0 5H6m0 0h8.5a2.5 2.5 0 0 1 0 5H6" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="#0e6e63" strokeWidth="1.9" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" stroke="#0e6e63" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function AlertIcon({ size = 18, color = '#e6913c' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 8v5M12 16h.01" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M10.3 3.9 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

export function PesoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M8 3v18M6 7h6.5a2.5 2.5 0 0 1 0 5H6m0 0h8.5a2.5 2.5 0 0 1 0 5H6" stroke="#0e6e63" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PeopleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="3.2" stroke="#0e6e63" strokeWidth="1.9" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="#0e6e63" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function TickIcon({ size = 16, color = '#0e6e63' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m5 12 4 4 10-10" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PendClockIcon({ size = 16, color = '#c98a2e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke={color} strokeWidth="2" />
      <path d="M12 8v4.3l2.8 1.7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CrossIcon({ size = 16, color = '#c0503e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 7l10 10M17 7 7 17" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function BroomIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 20l2.5-8.5 4.5 1.6 4.5-1.6L19 20" stroke="#0e6e63" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M12 3.2v9" stroke="#0e6e63" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 6l3-2.8L15 6" stroke="#0e6e63" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function AirconIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="9" rx="2.5" stroke="#1e6fa8" strokeWidth="1.9" />
      <path d="M6.5 10.5h11" stroke="#1e6fa8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7 17.5c0 1.2-.6 2-1.6 2.5M12 17.5c0 1.2-.6 2-1.6 2.5M17 17.5c0 1.2-.6 2-1.6 2.5" stroke="#1e6fa8" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function CloseIcon({ size = 16, color = '#4a544f' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function PlusIcon({ size = 15, color = '#fff' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5v14M5 12h14" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 17, color = '#c98a2e' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="m9 5 7 7-7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ListIcon({ color = 'currentColor', size = 15 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6h18M3 12h18M3 18h18" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2l7 3v6c0 4.6-3 8-7 9-4-1-7-4.4-7-9V5l7-3z" fill="#0e6e63" />
      <path d="m9 12 2 2 4-4.5" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
