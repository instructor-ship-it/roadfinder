'use client';

import { Button } from '@/components/ui/button';
import {
  generateShareText,
  formatAusDate,
  type TrafficCountRecord,
} from '@/lib/traffic-counter-storage';

interface TrafficCountDetailModalProps {
  selectedCountDetail: TrafficCountRecord | null;
  onClose: () => void;
  onUseCount: (count: TrafficCountRecord) => void;
}

export function TrafficCountDetailModal({
  selectedCountDetail,
  onClose,
  onUseCount,
}: TrafficCountDetailModalProps) {
  if (!selectedCountDetail) return null;

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-base font-bold text-green-400">📊 Traffic Count Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Location */}
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="font-bold text-white text-sm">{selectedCountDetail.road_id}</p>
            <p className="text-gray-400 text-xs">{selectedCountDetail.road_name}</p>
            {selectedCountDetail.slk && (
              <p className="text-gray-500 text-xs mt-1">SLK {selectedCountDetail.slk.toFixed(2)}</p>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-white font-semibold text-sm">
                {formatAusDate(selectedCountDetail.date)}
              </p>
              <p className="text-xs text-gray-500">Date</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-white font-semibold text-sm">{selectedCountDetail.start_time}</p>
              <p className="text-xs text-gray-500">Start</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-white font-semibold text-sm">{selectedCountDetail.end_time}</p>
              <p className="text-xs text-gray-500">End</p>
            </div>
          </div>

          {/* Duration & Direction */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-white font-semibold text-sm">
                {selectedCountDetail.duration_minutes} min
              </p>
              <p className="text-xs text-gray-500">Duration</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-white font-semibold text-sm">
                {selectedCountDetail.direction_mode === 'both-ways' ? 'Both Ways' : 'One Way'}
              </p>
              <p className="text-xs text-gray-500">Direction</p>
            </div>
          </div>

          {/* Per-direction breakdown */}
          {selectedCountDetail.direction_mode === 'both-ways' && (
            <div className="bg-gray-900 rounded-lg p-3">
              <h4 className="text-xs font-medium text-gray-400 mb-2">Counts by Direction</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-green-400 text-xs font-semibold mb-1">← True Left</p>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Light:</span>
                      <span className="text-white">{selectedCountDetail.true_left_light}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Heavy:</span>
                      <span className="text-amber-400">{selectedCountDetail.true_left_heavy}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-0.5 mt-0.5">
                      <span className="text-gray-400">VPH:</span>
                      <span className="text-blue-400 font-semibold">
                        {selectedCountDetail.vph_true_left}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-cyan-400 text-xs font-semibold mb-1">True Right →</p>
                  <div className="text-xs space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Light:</span>
                      <span className="text-white">{selectedCountDetail.true_right_light}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Heavy:</span>
                      <span className="text-amber-400">{selectedCountDetail.true_right_heavy}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-0.5 mt-0.5">
                      <span className="text-gray-400">VPH:</span>
                      <span className="text-blue-400 font-semibold">
                        {selectedCountDetail.vph_true_right}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-lg font-bold text-white">{selectedCountDetail.total_vehicles}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-lg font-bold text-amber-400">
                {selectedCountDetail.heavy_percentage}%
              </p>
              <p className="text-xs text-gray-500">Heavy</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-lg font-bold text-blue-400">{selectedCountDetail.vph_combined}</p>
              <p className="text-xs text-gray-500">VPH</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2">
              <p className="text-lg font-bold text-purple-400">
                {selectedCountDetail.queue_length || '-'}
              </p>
              <p className="text-xs text-gray-500">Queue</p>
            </div>
          </div>

          {/* Notes */}
          {selectedCountDetail.notes && (
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-xs text-gray-400 mb-1">📝 Notes</p>
              <p className="text-sm text-gray-300 italic">{selectedCountDetail.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              onClick={() => {
                onUseCount(selectedCountDetail);
                onClose();
              }}
              className="flex-1 bg-blue-600 hover:bg-blue-700 h-10 text-sm font-semibold"
            >
              📊 Use This Count
            </Button>
            <Button
              onClick={() => {
                const text = generateShareText(selectedCountDetail);
                navigator.clipboard.writeText(text);
                if (navigator.vibrate) navigator.vibrate(50);
                alert('Count details copied to clipboard!');
              }}
              variant="outline"
              className="flex-1 bg-gray-700 border-gray-600 h-10 text-sm"
            >
              📋 Copy
            </Button>
            <Button onClick={onClose} className="flex-1 bg-gray-600 hover:bg-gray-500 h-10 text-sm">
              ✕ Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
