import { MenuNotificationBadge } from './MenuNotificationBadge';
import { NotificationBell } from './NotificationBell';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

export function AccountDropdown({ name, subtitle, children }: {
  name: string; subtitle: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.key]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  return <><NotificationBell /><div className="nav-account" ref={root} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button type="button" className="nav-account-trigger" ref={trigger}
      aria-label={`Account menu for ${name}`} aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
      <MenuNotificationBadge />
      <span className="user-avatar-initial" aria-hidden="true">{name.trim().charAt(0) || 'U'}</span>
      <span className="user-pill-name"><strong>{name}</strong><small>{subtitle}</small></span>
      <svg className="nav-account-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="m6 9 6 6 6-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
    {open && <div id={id} className="nav-account-panel" onClick={(event) => {
      if ((event.target as HTMLElement).closest('a, button')) setOpen(false);
    }}>{children}</div>}
  </div></>;
}
