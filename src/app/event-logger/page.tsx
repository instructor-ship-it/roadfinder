'use client';

import { useState } from 'react';
import { TrafficEventLoggerModal } from '@/components/TrafficEventLoggerModal';
import Link from 'next/link';

export default function EventLoggerPage() {
  const [open, setOpen] = useState(true);

  // When modal closes, go back home
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Back link for accessibility if modal doesn't open */}
      <div className="p-4">
        <Link
          href="/"
          className="inline-flex items-center text-blue-400 text-sm hover:text-blue-300"
        >
          ← Back to Home
        </Link>
      </div>

      {/* Event Logger Modal - always open on this page */}
      <TrafficEventLoggerModal
        open={open}
        onOpenChange={handleOpenChange}
        roadId=""
        roadName=""
        slk=""
      />
    </div>
  );
}
