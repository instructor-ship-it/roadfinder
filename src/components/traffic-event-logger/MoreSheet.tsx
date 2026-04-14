'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import type { TrafficEventState } from '@/lib/traffic-event-logger';

interface MoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: TrafficEventState;
  onToggleHold: () => void;
  onToggleBreak: () => void;
  onToggleSuspend: () => void;
  onToggleShuttle: () => void;
  onLogEvent: (type: string, label: string) => void;
  onOpenFlashers: () => void;
}

export function MoreSheet({
  open,
  onOpenChange,
  state,
  onToggleHold,
  onToggleBreak,
  onToggleSuspend,
  onToggleShuttle,
  onLogEvent,
  onOpenFlashers,
}: MoreSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-900 border-t border-gray-700">
        <DrawerHeader>
          <DrawerTitle className="text-white">More Actions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {/* On Hold - Red toggle */}
          <button
            onClick={() => {
              onToggleHold();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.hold.active
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.hold.active ? 'Hold OFF' : 'On Hold'}
          </button>

          {/* Data Entry Suspended - Red toggle */}
          <button
            onClick={() => {
              onToggleSuspend();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.suspended
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.suspended ? 'Suspended OFF' : 'Data Entry Suspended'}
          </button>

          {/* Take Break - Green toggle */}
          <button
            onClick={() => {
              onToggleBreak();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.break.active
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.break.active ? 'Break OFF' : 'Take Break'}
          </button>

          {/* Shuttle - Green toggle */}
          <button
            onClick={() => {
              onToggleShuttle();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
              state.shuttle
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {state.shuttle ? 'Shuttle OFF' : 'Shuttle'}
          </button>

          {/* Site check */}
          <button
            onClick={() => {
              onLogEvent('siteCheck', 'Site check');
              onOpenChange(false);
            }}
            className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 font-medium text-sm hover:bg-gray-700 active:scale-[0.99] transition-all"
          >
            Site check
          </button>

          {/* Advanced flashers */}
          <button
            onClick={() => {
              onOpenFlashers();
              onOpenChange(false);
            }}
            className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 font-medium text-sm hover:bg-gray-700 active:scale-[0.99] transition-all"
          >
            Advanced flashers…
          </button>
        </div>
        <DrawerFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2.5 px-4 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 text-sm hover:bg-gray-600 transition-all"
          >
            Close
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
