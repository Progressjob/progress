import React, { useMemo, useState } from 'react';
import type { ApplicationEvent } from '../types/api';
import { formatApplicationStatus } from '../utils/applicationStatus';
import { isApplicationMessageEvent } from './ApplicationMessages';

function shortWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function timelineLabel(event: ApplicationEvent): string {
  const next = formatApplicationStatus(event.newStatus);
  if (!event.oldStatus || event.oldStatus === event.newStatus) return next;
  return `${formatApplicationStatus(event.oldStatus)} → ${next}`;
}

function showNote(event: ApplicationEvent): boolean {
  if (!event.note?.trim()) return false;
  return event.note.trim() !== 'Application submitted';
}

type ApplicationTimelineProps = {
  events?: ApplicationEvent[];
  emptyText?: string;
};

export const ApplicationTimeline: React.FC<ApplicationTimelineProps> = ({
  events = [],
  emptyText = 'No updates yet.',
}) => {
  const [open, setOpen] = useState(false);
  const statusEvents = useMemo(
    () => events.filter((event) => !isApplicationMessageEvent(event)),
    [events],
  );
  const latest = useMemo(
    () => (statusEvents.length ? statusEvents[statusEvents.length - 1] : null),
    [statusEvents],
  );

  if (!statusEvents.length) {
    return (
      <div className="app-timeline-dropdown">
        <div className="app-timeline-summary is-empty">
          <span className="app-timeline-summary-title">Timeline</span>
          <span className="muted">{emptyText}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`app-timeline-dropdown${open ? ' is-open' : ''}`}>
      <button
        type="button"
        className="app-timeline-summary"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className="app-timeline-summary-main">
          <span className="app-timeline-summary-title">
            Timeline
            <span className="app-timeline-count">{statusEvents.length}</span>
          </span>
          {latest && (
            <span className="app-timeline-summary-latest">
              {timelineLabel(latest)}
              <span className="app-timeline-summary-sep" aria-hidden="true">
                ·
              </span>
              {shortWhen(latest.createdAt)}
            </span>
          )}
        </span>
        <span className="app-timeline-chevron" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              d="M6 9l6 6 6-6"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {open && (
        <ul className="app-timeline">
          {statusEvents.map((event) => (
            <li key={event.id} className="app-timeline-row">
              <span className="app-timeline-label">{timelineLabel(event)}</span>
              <span className="app-timeline-when">{shortWhen(event.createdAt)}</span>
              {showNote(event) && (
                <p className="app-timeline-note">{event.note}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
