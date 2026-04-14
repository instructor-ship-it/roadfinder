'use client';

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
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
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Advanced Flashers</DrawerTitle>
        </DrawerHeader>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {DIRECTIONS.map((dir) => (
              <Button
                key={dir.key}
                variant={flashers[dir.key] ? 'default' : 'outline'}
                onClick={() => handleToggle(dir.key)}
                className={`h-14 ${dir.key === 'both' ? 'col-span-2' : ''} ${flashers[dir.key] ? 'bg-green-500 hover:bg-green-600 text-white' : ''}`}
              >
                {flashers[dir.key] ? `${dir.label.toUpperCase()} OFF` : dir.label}
              </Button>
            ))}
          </div>
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
