'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';

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
      <DrawerContent className="bg-gray-900 border-t border-gray-700">
        <DrawerHeader>
          <DrawerTitle className="text-white">Shift Actions</DrawerTitle>
        </DrawerHeader>
        <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
          {SHIFT_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.type, action.label)}
              className="w-full py-3 px-4 rounded-lg border border-gray-600 bg-gray-800 text-gray-200 font-medium text-sm hover:bg-gray-700 active:scale-[0.99] transition-all"
            >
              {action.label}
            </button>
          ))}
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
