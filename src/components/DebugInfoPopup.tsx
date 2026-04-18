'use client';

import { Button } from '@/components/ui/button';

interface DebugInfoPopupProps {
  show: boolean;
  debugInfo: string;
  onClose: () => void;
  onCopyFeedback?: (message: string) => void;
}

export function DebugInfoPopup({ show, debugInfo, onClose, onCopyFeedback }: DebugInfoPopupProps) {
  if (!show) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(debugInfo);
    if (onCopyFeedback) {
      onCopyFeedback('Debug info copied!');
      setTimeout(() => onCopyFeedback(''), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-4 max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-sm font-semibold text-blue-400">🔧 Debug Info</h3>
          <Button onClick={onClose} className="h-8 w-8 p-0 bg-gray-700 hover:bg-gray-600">
            ✕
          </Button>
        </div>
        <textarea
          readOnly
          value={debugInfo}
          className="flex-1 w-full bg-gray-900 text-gray-300 text-xs font-mono p-3 rounded border border-gray-700 resize-none min-h-[300px]"
          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
        />
        <div className="flex gap-2 mt-3">
          <Button onClick={handleCopy} className="flex-1 bg-blue-600 hover:bg-blue-700">
            📋 Copy to Clipboard
          </Button>
          <Button onClick={onClose} className="bg-gray-600 hover:bg-gray-500">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
