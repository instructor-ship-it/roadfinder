'use client';

import type { TrafficEvent } from '@/lib/traffic-event-logger';

interface EventListProps {
  events: TrafficEvent[];
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function EventList({ events }: EventListProps) {
  if (events.length === 0) {
    return <div className="text-center py-5 text-slate-500">No events</div>;
  }

  return (
    <div className="mt-2 space-y-0">
      {events.slice(0, 20).map((event) => (
        <div
          key={event.id}
          className="grid grid-cols-[auto_1fr] gap-2 py-2 border-b border-dashed border-slate-700/50"
        >
          <div className="min-w-[128px] text-slate-400 font-mono text-sm tabular-nums">
            {event.time}
          </div>
          <div>
            <div className="font-bold text-sm">{event.label}</div>
            {event.note && (
              <div className="text-slate-500 text-xs">Note: {escapeHtml(event.note)}</div>
            )}
            {event.site && (
              <div className="text-slate-500 text-xs">Site: {escapeHtml(event.site)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
