'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { fonts } from '@/theme';

export function TopBar({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 22,
      }}
    >
      <div>
        <div style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: 27, letterSpacing: '-0.02em' }}>{title}</div>
        <div style={{ fontSize: '13.5px', color: '#8a8578', marginTop: 2 }}>{subtitle}</div>
      </div>
    </div>
  );
}

export function Toggle({ on, onClick, size = 'md' }: { on: boolean; onClick: () => void; size?: 'sm' | 'md' }) {
  const w = size === 'sm' ? 42 : 44;
  const h = size === 'sm' ? 25 : 26;
  const knob = size === 'sm' ? 19 : 20;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onClick}
      style={{
        width: w,
        height: h,
        borderRadius: 20,
        background: on ? '#0e6e63' : '#d5cdbd',
        position: 'relative',
        cursor: 'pointer',
        transition: 'background .2s',
        flex: 'none',
        border: 'none',
        padding: 0,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: on ? w - knob - 3 : 3,
          width: knob,
          height: knob,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        }}
      />
    </button>
  );
}

export function Avatar({ initials, size }: { initials: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        flex: 'none',
        background: 'linear-gradient(140deg,#12857a,#0a554d)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: size * 0.36,
        fontFamily: fonts.display,
      }}
    >
      {initials}
    </div>
  );
}

export function Modal({
  onClose,
  width = 520,
  children,
}: {
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const overlay = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        background: 'rgba(11,43,40,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        animation: 'overlayIn .2s ease both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width,
          maxWidth: '100%',
          maxHeight: '88vh',
          background: '#fbf7ef',
          borderRadius: 22,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          animation: 'sheetIn .25s cubic-bezier(.2,.9,.3,1) both',
          boxShadow: '0 30px 70px -20px rgba(11,43,40,.5)',
        }}
      >
        {children}
      </div>
    </div>
  );

  // Portal to document.body: every admin page wraps its content in a
  // fadeUp-animated div (see globals.css), and a transform animation on an
  // ancestor makes it the containing block for `position: fixed` — without
  // this, the modal anchors to that tall page wrapper instead of the
  // viewport. Guarded by `mounted` since document isn't available during SSR.
  if (!mounted) return null;
  return createPortal(overlay, document.body);
}

export function chip(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    fontWeight: 800,
    fontSize: '10.5px',
    padding: '3px 9px',
    borderRadius: 20,
    whiteSpace: 'nowrap',
  };
}

export function svcIconWrap(svc: string, size: number): React.CSSProperties {
  const tint = svc === 'aircon' ? '#e7f0f7' : '#eaf3f0';
  return {
    width: size,
    height: size,
    borderRadius: 12,
    flex: 'none',
    background: tint,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
