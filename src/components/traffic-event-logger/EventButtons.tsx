'use client';

import { Button } from '@/components/ui/button';

interface EventButtonsProps {
  onLogEvent: (type: string, label: string) => void;
  shuttle: boolean;
}

export function EventButtons({ onLogEvent, shuttle }: EventButtonsProps) {
  return (
    <div className="space-y-3">
      {/* Main event buttons - 2 columns */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => onLogEvent('trueLeft', 'Sent True Left')}
          className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
        >
          Sent True Left
        </Button>
        <Button
          onClick={() => onLogEvent('trueRight', 'Sent True Right')}
          className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
        >
          Sent True Right
        </Button>
      </div>

      {/* Secondary buttons - 2 columns with stacked items */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => onLogEvent('trip', 'Trip Out')}
            className="w-full h-12 text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white"
          >
            Trip Out
          </Button>
          <Button
            onClick={() => onLogEvent('spot', 'Spot Call')}
            className="w-full h-12 text-sm font-medium bg-green-500 hover:bg-green-600 text-white"
          >
            Spot Call
          </Button>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => onLogEvent('rlr', 'RLR')}
            className="w-full h-12 text-sm font-medium bg-red-500 hover:bg-red-600 text-white"
          >
            RLR
          </Button>
          {shuttle && (
            <Button
              onClick={() => onLogEvent('shuttleSend', 'Shuttle Send')}
              className="w-full h-12 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white"
            >
              Shuttle Send
            </Button>
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
    <div className="flex justify-between gap-2 w-full">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onLogEvent('tcLeft', 'Start TC Left')}
        className="flex-1"
      >
        Start TC L
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onLogEvent('tcRight', 'Start TC Right')}
        className="flex-1"
      >
        Start TC R
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onLogEvent('tcEndBoth', 'End TC Both')}
        className="flex-1"
      >
        End TC Both
      </Button>
      <Button variant="outline" size="sm" onClick={onOpenShift} className="flex-1">
        Shift…
      </Button>
      <Button variant="outline" size="sm" onClick={onOpenMore} className="flex-1">
        More…
      </Button>
    </div>
  );
}
