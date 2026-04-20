'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong</h1>
        <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left overflow-auto">
          <p className="text-sm text-gray-300 font-mono break-all">
            {error?.message || 'Unknown error'}
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} className="bg-cyan-600 hover:bg-cyan-700">
            Try again
          </Button>
          <Button
            onClick={() => (window.location.href = '/')}
            variant="outline"
            className="border-gray-600"
          >
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
