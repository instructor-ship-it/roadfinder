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
    return <div className="text-center py-8 text-muted-foreground">No events</div>;
  }

  return (
    <div className="p-3 space-y-0">
      {events.slice(0, 20).map((event) => (
        <div
          key={event.id}
          className="grid grid-cols-[auto_1fr] gap-3 py-3 border-b border-dashed border-border/50"
        >
          <div className="min-w-[128px] text-muted-foreground font-mono text-sm tabular-nums">
            {event.time}
          </div>
          <div>
            <div className="font-semibold text-foreground text-sm">{event.label}</div>
            {event.note && (
              <div className="text-muted-foreground text-xs mt-0.5">
                Note: {escapeHtml(event.note)}
              </div>
            )}
            {event.site && (
              <div className="text-muted-foreground text-xs mt-0.5">
                Site: {escapeHtml(event.site)}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
