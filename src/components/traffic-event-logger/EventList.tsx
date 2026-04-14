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
        <div key={event.id} className="py-2.5 px-3 hover:bg-gray-700/30">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white text-sm truncate">{event.label}</div>
              {event.note && (
                <div className="text-gray-500 text-xs mt-0.5 truncate">
                  Note: {escapeHtml(event.note)}
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className="text-gray-400 font-mono text-xs tabular-nums">{event.time}</div>
            </div>
          </div>
          {(event.roadId || event.slk) && (
            <div className="text-xs text-cyan-400 mt-1 font-medium">
              {event.roadName || event.roadId} @ SLK {event.slk}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
