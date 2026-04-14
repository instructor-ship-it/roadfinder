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
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>More Actions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto">
          {/* On Hold - Red toggle */}
          <button
            onClick={() => {
              onToggleHold();
              onOpenChange(false);
            }}
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-colors ${
              state.hold.active
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-slate-600 bg-slate-700 text-slate-200'
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
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-colors ${
              state.suspended
                ? 'bg-red-500 border-red-500 text-white'
                : 'border-slate-600 bg-slate-700 text-slate-200'
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
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-colors ${
              state.break.active
                ? 'bg-green-500 border-green-500 text-green-950'
                : 'border-slate-600 bg-slate-700 text-slate-200'
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
            className={`w-full py-3 px-4 rounded-lg border font-medium text-sm transition-colors ${
              state.shuttle
                ? 'bg-green-500 border-green-500 text-green-950'
                : 'border-slate-600 bg-slate-700 text-slate-200'
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
            className="w-full py-3 px-4 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            Site check
          </button>

          {/* Advanced flashers */}
          <button
            onClick={() => {
              onOpenFlashers();
              onOpenChange(false);
            }}
            className="w-full py-3 px-4 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 font-medium text-sm hover:scale-[1.01] active:scale-[0.99] transition-transform"
          >
            Advanced flashers…
          </button>
        </div>
        <DrawerFooter>
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2 px-4 rounded-lg border border-slate-600 bg-slate-700 text-slate-200 text-sm"
          >
            Close
          </button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
