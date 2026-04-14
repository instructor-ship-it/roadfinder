'use client';

interface EventButtonsProps {
  onLogEvent: (type: string, label: string) => void;
  onLogRlr: () => void;
  shuttle: boolean;
}

export function EventButtons({ onLogEvent, onLogRlr, shuttle }: EventButtonsProps) {
  return (
    <div className="space-y-2">
      {/* Main event buttons - 2 columns */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onLogEvent('trueLeft', 'Sent True Left')}
          className="w-full py-3 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm active:scale-[0.98] transition-all"
        >
          Sent True Left
        </button>
        <button
          onClick={() => onLogEvent('trueRight', 'Sent True Right')}
          className="w-full py-3 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm active:scale-[0.98] transition-all"
        >
          Sent True Right
        </button>
      </div>

      {/* Secondary buttons - 2 columns with stacked items */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onLogEvent('trip', 'Trip Out')}
            className="w-full py-3 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm active:scale-[0.98] transition-all"
          >
            Trip Out
          </button>
          <button
            onClick={() => onLogEvent('spot', 'Spot Call')}
            className="w-full py-3 px-3 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm active:scale-[0.98] transition-all"
          >
            Spot Call
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={onLogRlr}
            className="w-full py-3 px-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium text-sm active:scale-[0.98] transition-all"
          >
            RLR
          </button>
          {shuttle && (
            <button
              onClick={() => onLogEvent('shuttleSend', 'Shuttle Send')}
              className="w-full py-3 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm active:scale-[0.98] transition-all"
            >
              Shuttle Send
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface TCMiniButtonsProps {
  onLogEvent: (type: string, label: string) => void;
  onOpenShift: () => void;
  onOpenMore: () => void;
}

export function TCMiniButtons({ onLogEvent, onOpenShift, onOpenMore }: TCMiniButtonsProps) {
  return (
    <div className="flex justify-between gap-1.5 w-full">
      <button
        onClick={() => onLogEvent('tcLeft', 'Start TC Left')}
        className="flex-1 py-2 px-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-xs font-medium hover:bg-gray-600 active:scale-[0.98] transition-all"
      >
        Start TC L
      </button>
      <button
        onClick={() => onLogEvent('tcRight', 'Start TC Right')}
        className="flex-1 py-2 px-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-xs font-medium hover:bg-gray-600 active:scale-[0.98] transition-all"
      >
        Start TC R
      </button>
      <button
        onClick={() => onLogEvent('tcEndBoth', 'End TC Both')}
        className="flex-1 py-2 px-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-xs font-medium hover:bg-gray-600 active:scale-[0.98] transition-all"
      >
        End TC Both
      </button>
      <button
        onClick={onOpenShift}
        className="flex-1 py-2 px-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-xs font-medium hover:bg-gray-600 active:scale-[0.98] transition-all"
      >
        Shift…
      </button>
      <button
        onClick={onOpenMore}
        className="flex-1 py-2 px-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-xs font-medium hover:bg-gray-600 active:scale-[0.98] transition-all"
      >
        More…
      </button>
    </div>
  );
}
