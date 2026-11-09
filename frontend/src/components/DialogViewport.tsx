import { useEffect } from 'react';

/** Keep fixed dialogs inside the screen area left visible by a mobile keyboard. */
export function DialogViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--dialog-viewport-height', `${viewport?.height ?? window.innerHeight}px`);
        root.style.setProperty('--dialog-viewport-top', `${viewport?.offsetTop ?? 0}px`);
        root.style.setProperty('--dialog-viewport-left', `${viewport?.offsetLeft ?? 0}px`);
        root.style.setProperty('--dialog-viewport-width', `${viewport?.width ?? window.innerWidth}px`);
        const active = document.activeElement;
        if (active instanceof HTMLElement && active.closest('[role="dialog"][aria-modal="true"]')) {
          active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      });
    };
    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      for (const name of ['height', 'top', 'left', 'width']) {
        root.style.removeProperty(`--dialog-viewport-${name}`);
      }
    };
  }, []);
  return null;
}
