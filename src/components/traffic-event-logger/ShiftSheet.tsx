'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface ShiftSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogEvent: (type: string, label: string) => void;
}

const SHIFT_ACTIONS = [
  { type: 'shift', label: 'Shift start' },
  { type: 'shift', label: 'Pre-start' },
  { type: 'shift', label: 'Travel to site' },
  { type: 'shift', label: 'Arrived at site' },
  { type: 'shift', label: 'Site setup' },
  { type: 'shift', label: 'Wait for crew' },
  { type: 'shift', label: 'Crew arrived' },
  { type: 'shift', label: 'Spot for crew' },
  { type: 'shift', label: 'Crew departed' },
  { type: 'shift', label: 'Pack up site' },
  { type: 'shift', label: 'Travel to depot' },
  { type: 'shift', label: 'Arrived at depot' },
  { type: 'shift', label: 'Shift end' },
];

export function ShiftSheet({ open, onOpenChange, onLogEvent }: ShiftSheetProps) {
  const handleAction = (type: string, label: string) => {
    onLogEvent(type, label);
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Shift Actions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto">
          {SHIFT_ACTIONS.map((action) => (
            <Button
              key={action.label}
              variant="outline"
              onClick={() => handleAction(action.type, action.label)}
              className="w-full justify-start"
            >
              {action.label}
            </Button>
          ))}
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
