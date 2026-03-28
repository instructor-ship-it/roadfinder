'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Library page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-red-400 mb-4">Something went wrong!</h1>
        <div className="bg-gray-800 p-4 rounded-lg mb-4 text-left overflow-auto">
          <p className="text-sm text-gray-300 font-mono break-all">
            {error?.message || 'Unknown error'}
          </p>
          {error?.stack && (
            <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap">
              {error.stack.slice(0, 500)}
            </pre>
          )}
        </div>
        <div className="flex gap-2 justify-center">
          <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
            Try again
          </Button>
          <Button 
            onClick={() => window.location.href = '/'}
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
