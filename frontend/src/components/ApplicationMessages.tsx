import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ApplicationEvent } from '../types/api';

export function isApplicationMessageEvent(event: ApplicationEvent): boolean {
  return event.oldStatus === event.newStatus && Boolean(event.note?.trim());
}

function shortWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type ApplicationMessagesProps = {
  events?: ApplicationEvent[];
  /** Current viewer's user id — used to align bubbles. */
  viewerUserId: string;
  /** Other party's user id (employer or candidate). */
  counterpartUserId?: string | null;
  counterpartLabel: string;
  viewerLabel?: string;
  canSend?: boolean;
  sending?: boolean;
  onSend?: (body: string) => Promise<void> | void;
  placeholder?: string;
};

export const ApplicationMessages: React.FC<ApplicationMessagesProps> = ({
  events = [],
  viewerUserId,
  counterpartLabel,
  viewerLabel = 'You',
  canSend = false,
  sending = false,
  onSend,
  placeholder = 'Write a message…',
}) => {
  const [draft, setDraft] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const messages = useMemo(
    () => events.filter(isApplicationMessageEvent),
    [events],
  );

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    if (window.location.hash !== '#messages') return;
    document.getElementById('application-messages')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const submit = async () => {
    const body = draft.trim();
    if (!body || sending || !onSend) return;
    setLocalError(null);
    try {
      await onSend(body);
      setDraft('');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not send message');
    }
  };

  return (
    <div className="pb-card app-messages-card" id="application-messages">
      <div className="app-messages-header">
        <h3 className="pb-card-title" style={{ margin: 0 }}>
          Messages
        </h3>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {messages.length} message{messages.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="app-messages-list" ref={listRef}>
        {messages.length === 0 ? (
          <p className="app-messages-empty muted">
            {canSend
              ? 'No messages yet. Send an update about this application here.'
              : 'No messages from the employer yet.'}
          </p>
        ) : (
          messages.map((event) => {
            const mine = event.changedBy === viewerUserId;
            return (
              <div
                key={event.id}
                className={`app-message-bubble ${mine ? 'is-mine' : 'is-theirs'}`}
              >
                <div className="app-message-meta">
                  <strong>{mine ? viewerLabel : counterpartLabel}</strong>
                  <span>{shortWhen(event.createdAt)}</span>
                </div>
                <p>{event.note}</p>
              </div>
            );
          })
        )}
      </div>

      {canSend ? (
        <div className="app-messages-compose">
          {localError && <div className="alert-error">{localError}</div>}
          <textarea
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            disabled={sending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={sending || !draft.trim()}
            onClick={() => void submit()}
          >
            {sending ? 'Sending…' : 'Send message'}
          </button>
        </div>
      ) : (
        <p className="muted" style={{ margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
          Only the employer can send messages on this application.
        </p>
      )}
    </div>
  );
};
