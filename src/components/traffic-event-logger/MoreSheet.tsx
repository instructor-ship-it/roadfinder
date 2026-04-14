'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
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
          <Button
            variant={state.hold.active ? 'destructive' : 'outline'}
            onClick={() => {
              onToggleHold();
              onOpenChange(false);
            }}
            className="w-full justify-start"
          >
            {state.hold.active ? 'Hold OFF' : 'On Hold'}
          </Button>

          {/* Data Entry Suspended - Red toggle */}
          <Button
            variant={state.suspended ? 'destructive' : 'outline'}
            onClick={() => {
              onToggleSuspend();
              onOpenChange(false);
            }}
            className="w-full justify-start"
          >
            {state.suspended ? 'Suspended OFF' : 'Data Entry Suspended'}
          </Button>

          {/* Take Break - Green toggle */}
          <Button
            variant={state.break.active ? 'default' : 'outline'}
            onClick={() => {
              onToggleBreak();
              onOpenChange(false);
            }}
            className={`w-full justify-start ${state.break.active ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
          >
            {state.break.active ? 'Break OFF' : 'Take Break'}
          </Button>

          {/* Shuttle - Green toggle */}
          <Button
            variant={state.shuttle ? 'default' : 'outline'}
            onClick={() => {
              onToggleShuttle();
              onOpenChange(false);
            }}
            className={`w-full justify-start ${state.shuttle ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
          >
            {state.shuttle ? 'Shuttle OFF' : 'Shuttle'}
          </Button>

          {/* Site check */}
          <Button
            variant="outline"
            onClick={() => {
              onLogEvent('siteCheck', 'Site check');
              onOpenChange(false);
            }}
            className="w-full justify-start"
          >
            Site check
          </Button>

          {/* Advanced flashers */}
          <Button
            variant="outline"
            onClick={() => {
              onOpenFlashers();
              onOpenChange(false);
            }}
            className="w-full justify-start"
          >
            Advanced flashers…
          </Button>
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
