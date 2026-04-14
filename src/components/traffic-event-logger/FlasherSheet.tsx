'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import type { AdvancedFlashers } from '@/lib/traffic-event-logger';

interface FlasherSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flashers: AdvancedFlashers;
  onToggleFlasher: (direction: keyof AdvancedFlashers) => void;
}

const DIRECTIONS: { key: keyof AdvancedFlashers; label: string }[] = [
  { key: 'north', label: 'North' },
  { key: 'south', label: 'South' },
  { key: 'east', label: 'East' },
  { key: 'west', label: 'West' },
  { key: 'both', label: 'Both ends' },
];

export function FlasherSheet({ open, onOpenChange, flashers, onToggleFlasher }: FlasherSheetProps) {
  const handleToggle = (direction: keyof AdvancedFlashers) => {
    onToggleFlasher(direction);
    // Don't close - allow multiple toggles
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="bg-gray-900 border-t border-gray-700">
        <DrawerHeader>
          <DrawerTitle className="text-white">Advanced Flashers</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2">
            {DIRECTIONS.map((dir) => (
              <button
                key={dir.key}
                onClick={() => handleToggle(dir.key)}
                className={`py-3 px-4 rounded-lg border font-medium text-sm transition-all ${
                  dir.key === 'both' ? 'col-span-2' : ''
                } ${
                  flashers[dir.key]
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-200 hover:bg-gray-700'
                }`}
              >
                {flashers[dir.key] ? `${dir.label.toUpperCase()} OFF` : dir.label}
              </button>
            ))}
          </div>
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
