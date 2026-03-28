'use client';

interface SavedLocation {
  id: string;
  road_id: string;
  road_name: string;
  start_slk: number;
  end_slk?: number;
  name: string;
  created_at?: string;
}

interface SavedLocationsProps {
  locations: SavedLocation[];
  onRecall: (location: SavedLocation) => void;
  onDelete: (id: string) => void;
}

export function SavedLocations({ locations, onRecall, onDelete }: SavedLocationsProps) {
  if (locations.length === 0) return null;

  return (
    <div className="bg-gray-800 rounded-lg p-3 mt-4 overflow-hidden">
      <h4 className="text-sm font-semibold text-purple-400 mb-2 shrink-0">
        📌 Saved Locations ({locations.length})
      </h4>
      <div 
        className="space-y-2 max-h-48 overflow-y-auto overscroll-contain pr-1" 
        style={{ scrollbarWidth: 'thin' }}
      >
        {locations.map(loc => {
          const savedDate = loc.created_at ? new Date(loc.created_at) : null;
          const dateStr = savedDate 
            ? savedDate.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) 
            : '';
          const timeStr = savedDate 
            ? savedDate.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }) 
            : '';
          
          return (
            <div 
              key={loc.id} 
              className="flex items-center gap-2 bg-gray-700 rounded p-2 hover:bg-gray-600/50 transition-colors shrink-0"
            >
              <button
                onClick={() => onRecall(loc)}
                className="flex-1 text-left px-2 py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-green-400 text-sm font-semibold">
                    {loc.road_id}
                  </span>
                  <span className="text-xs text-gray-500">
                    SLK {loc.start_slk}{loc.end_slk ? ` - ${loc.end_slk}` : ''}
                  </span>
                </div>
                <div className="text-xs text-gray-300 truncate">
                  {loc.name}
                </div>
                {savedDate && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    📅 {dateStr} at {timeStr}
                  </div>
                )}
              </button>
              <button
                onClick={() => onDelete(loc.id)}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/30 p-2 rounded text-lg shrink-0"
                title="Delete"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
