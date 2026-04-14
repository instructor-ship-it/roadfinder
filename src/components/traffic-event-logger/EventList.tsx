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
    return <div className="text-center py-6 text-gray-500 text-sm">No events</div>;
  }

  return (
    <div className="divide-y divide-gray-700/50">
      {events.slice(0, 50).map((event) => (
        <div
          key={event.id}
          className="grid grid-cols-[auto_1fr] gap-3 py-2.5 px-3 hover:bg-gray-700/30"
        >
          <div className="min-w-[100px] text-gray-400 font-mono text-xs tabular-nums">
            {event.time}
          </div>
          <div>
            <div className="font-medium text-white text-sm">{event.label}</div>
            {event.note && (
              <div className="text-gray-500 text-xs mt-0.5">Note: {escapeHtml(event.note)}</div>
            )}
            {event.site && (
              <div className="text-gray-500 text-xs mt-0.5">Site: {escapeHtml(event.site)}</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
