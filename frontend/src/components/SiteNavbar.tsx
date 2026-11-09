import { MenuNotificationBadge } from './MenuNotificationBadge';
import type { UnreadCountParams } from '../api/notifications';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProgressLogo } from './ProgressLogo';

export function SiteNavbar({
  children, account, label, admin = false, unreadScopes = [],
}: {
  children: ReactNode;
  account: ReactNode;
  label: string;
  admin?: boolean;
  unreadScopes?: UnreadCountParams[];
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const links = useRef<HTMLElement>(null);
  const id = useId();
  const { key } = useLocation();

  useEffect(() => setOpen(false), [key]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !links.current?.contains(target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <header className={`top-nav split-site-nav ${admin ? 'admin-topbar' : ''} ${open ? 'is-menu-open' : ''}`}>
      <button type="button" className="nav-toggle" ref={trigger}
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        aria-expanded={open} aria-controls={id} onClick={() => setOpen((value) => !value)}>
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <span className="nav-toggle-bar" />
        <MenuNotificationBadge scopes={unreadScopes} />
      </button>
      <div className="nav-brand">
        <Link to={admin ? '/admin' : '/'} className="brand-logo-link" aria-label={admin ? 'Admin dashboard' : 'Home'}>
          <ProgressLogo size="sm" />
        </Link>
      </div>
      <div className={`nav-panel ${open ? 'is-open' : ''}`}>
        <nav id={id} ref={links} className={`nav-links ${admin ? 'admin-primary-nav' : ''}`} aria-label={label}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a')) setOpen(false);
          }}>
          {children}
        </nav>
        <div className="nav-auth" onFocusCapture={() => setOpen(false)}>
          {account}
        </div>
      </div>
    </header>
  );
}
