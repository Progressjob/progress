import React, { useEffect, useRef } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const GIS_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              text?: string;
              width?: number;
              shape?: string;
              logo_alignment?: string;
            },
          ) => void;
        };
      };
    };
  }
}

let gisLoader: Promise<void> | null = null;

function loadGoogleIdentity(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gisLoader) return gisLoader;
  gisLoader = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google sign-in failed to load')));
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in failed to load'));
    document.head.appendChild(script);
  });
  return gisLoader;
}

function GoogleMark() {
  return (
    <svg className="btn-google-mark" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.6 6.6l6.3 5.2C38.3 37.3 44 31.5 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export const GoogleContinueButton: React.FC<{
  onCredential: (idToken: string) => void;
  onUnconfigured?: () => void;
  disabled?: boolean;
}> = ({ onCredential, onUnconfigured, disabled }) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const stackRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) return;
    const host = hostRef.current;
    const stack = stackRef.current;
    if (!host || !stack) return;
    let cancelled = false;

    void loadGoogleIdentity()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            if (response.credential) onCredentialRef.current(response.credential);
          },
        });
        host.replaceChildren();
        window.google.accounts.id.renderButton(host, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          width: Math.max(stack.offsetWidth || 320, 240),
          shape: 'pill',
          logo_alignment: 'left',
        });
      })
      .catch(() => {
        /* Custom button stays visible if Google's script does not load. */
      });

    return () => {
      cancelled = true;
    };
  }, [disabled]);

  const handleClick = () => {
    if (GOOGLE_CLIENT_ID) return;
    onUnconfigured?.();
  };

  return (
    <div className={`auth-google${disabled ? ' is-disabled' : ''}`}>
      <div className="auth-google-divider">
        <span>or</span>
      </div>
      <div ref={stackRef} className="auth-google-stack">
        <button type="button" className="btn-google-continue" onClick={handleClick} disabled={disabled}>
          <GoogleMark />
          Continue with Google
        </button>
        {GOOGLE_CLIENT_ID ? <div ref={hostRef} className="auth-google-official" /> : null}
      </div>
    </div>
  );
};
