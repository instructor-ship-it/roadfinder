'use client';

interface EventButtonsProps {
  onLogEvent: (type: string, label: string) => void;
  shuttle: boolean;
}

export function EventButtons({ onLogEvent, shuttle }: EventButtonsProps) {
  return (
    <div className="space-y-2">
      {/* Main event buttons - 2 columns */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => onLogEvent('trueLeft', 'Sent True Left')}
          className="w-full py-3 px-3 rounded-lg border border-blue-600 bg-blue-600 text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Sent True Left
        </button>
        <button
          onClick={() => onLogEvent('trueRight', 'Sent True Right')}
          className="w-full py-3 px-3 rounded-lg border border-blue-600 bg-blue-600 text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
        >
          Sent True Right
        </button>
      </div>

      {/* Secondary buttons - 2 columns with stacked items */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onLogEvent('trip', 'Trip Out')}
            className="w-full py-3 px-3 rounded-lg border border-amber-500 bg-amber-500 text-slate-900 font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Trip Out
          </button>
          <button
            onClick={() => onLogEvent('spot', 'Spot Call')}
            className="w-full py-3 px-3 rounded-lg border border-green-500 bg-green-500 text-green-950 font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Spot Call
          </button>
        </div>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => onLogEvent('rlr', 'RLR')}
            className="w-full py-3 px-3 rounded-lg border border-red-500 bg-red-500 text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            RLR
          </button>
          {shuttle && (
            <button
              onClick={() => onLogEvent('shuttleSend', 'Shuttle Send')}
              className="w-full py-3 px-3 rounded-lg border border-blue-600 bg-blue-600 text-white font-medium text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
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
        className="flex-1 min-w-[65px] py-2 px-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        Start TC L
      </button>
      <button
        onClick={() => onLogEvent('tcRight', 'Start TC Right')}
        className="flex-1 min-w-[65px] py-2 px-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        Start TC R
      </button>
      <button
        onClick={() => onLogEvent('tcEndBoth', 'End TC Both')}
        className="flex-1 min-w-[65px] py-2 px-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        End TC Both
      </button>
      <button
        onClick={onOpenShift}
        className="flex-1 min-w-[65px] py-2 px-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        Shift…
      </button>
      <button
        onClick={onOpenMore}
        className="flex-1 min-w-[65px] py-2 px-1.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition-transform"
      >
        More…
      </button>
    </div>
  );
}
