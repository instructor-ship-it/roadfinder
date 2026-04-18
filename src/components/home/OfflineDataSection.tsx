/**
 * Offline Data Section Component
 *
 * Provides UI for downloading and managing offline road data.
 * Extracted from page.tsx for maintainability.
 *
 * @module components/home/OfflineDataSection
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ChevronDown,
  Download,
  Trash2,
  RefreshCw,
  HardDrive,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { STORAGE_KEYS } from '@/lib/config';

interface OfflineDataSectionProps {
  /** Whether offline mode is toggled on */
  offlineMode: boolean;
  /** Callback when offline toggles change */
  onOfflineTogglesChange: (toggles: OfflineToggles) => void;
  /** Current offline toggles state */
  offlineToggles: OfflineToggles;
}

interface OfflineToggles {
  roads: boolean;
  speedZones: boolean;
  signage: boolean;
  traffic: boolean;
  amenities: boolean;
}

interface DatasetStats {
  name: string;
  count: number;
  lastSync: string | null;
}

interface OfflineMetadata {
  download_date: string;
  total_roads: number;
  regions: string[];
}

export function OfflineDataSection({
  offlineMode,
  onOfflineTogglesChange,
  offlineToggles,
}: OfflineDataSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const [offlineMetadata, setOfflineMetadata] = useState<OfflineMetadata | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [datasetStats, setDatasetStats] = useState<DatasetStats[]>([]);
  const [mrwaStatus, setMrwaStatus] = useState<Record<string, number>>({});

  // Check offline data status on mount
  useEffect(() => {
    checkOfflineStatus();
    loadDatasetStats();
    fetchMrwaStatus();
  }, []);

  const checkOfflineStatus = async () => {
    try {
      const response = await fetch('/api/sync-data?check=true');
      if (response.ok) {
        const data = await response.json();
        setOfflineMetadata(data.metadata);
      }
    } catch (error) {
      console.warn('[OfflineDataSection] Failed to check offline status:', error);
    }
  };

  const loadDatasetStats = async () => {
    try {
      const response = await fetch('/api/admin-sync?stats=true');
      if (response.ok) {
        const data = await response.json();
        setDatasetStats(data.stats || []);
      }
    } catch (error) {
      console.warn('[OfflineDataSection] Failed to load dataset stats:', error);
    }
  };

  const fetchMrwaStatus = async () => {
    try {
      const response = await fetch('/api/admin-sync?status=true');
      if (response.ok) {
        const data = await response.json();
        setMrwaStatus(data.counts || {});
      }
    } catch (error) {
      console.warn('[OfflineDataSection] Failed to fetch MRWA status:', error);
    }
  };

  const handleDownloadOfflineData = async () => {
    setIsDownloading(true);
    setDownloadProgress('Starting download...');

    try {
      // Download regions data
      setDownloadProgress('Downloading regions...');
      const regionsResponse = await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'regions' }),
      });

      if (!regionsResponse.ok) {
        throw new Error('Failed to download regions');
      }

      // Download speed zones
      setDownloadProgress('Downloading speed zones...');
      await fetch('/api/sync-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'speedZones' }),
      });

      setDownloadProgress('Download complete!');

      // Refresh metadata
      await checkOfflineStatus();

      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress('');
      }, 2000);
    } catch (error) {
      console.error('[OfflineDataSection] Download failed:', error);
      setDownloadProgress('Download failed. Please try again.');
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress('');
      }, 3000);
    }
  };

  const handleClearOfflineData = async () => {
    try {
      const response = await fetch('/api/sync-data', {
        method: 'DELETE',
      });

      if (response.ok) {
        setOfflineMetadata(null);
        setShowClearConfirm(false);
      }
    } catch (error) {
      console.error('[OfflineDataSection] Failed to clear offline data:', error);
    }
  };

  const resetToggles = () => {
    onOfflineTogglesChange({
      roads: true,
      speedZones: true,
      signage: true,
      traffic: true,
      amenities: true,
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card className="bg-gray-800 border-gray-700">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-gray-750 transition-colors">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-blue-400" />
                  Offline Data
                  {offlineMetadata && (
                    <Badge
                      variant="outline"
                      className="bg-green-900/30 text-green-400 border-green-700"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Downloaded
                    </Badge>
                  )}
                </span>
                <ChevronDown
                  className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Status */}
              {offlineMetadata ? (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm text-gray-400">
                    <span className="text-green-400">✓</span> Data downloaded on{' '}
                    {new Date(offlineMetadata.download_date).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {offlineMetadata.total_roads.toLocaleString()} roads across{' '}
                    {offlineMetadata.regions.length} regions
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm text-yellow-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    No offline data downloaded
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    Download data for offline access without internet
                  </div>
                </div>
              )}

              {/* Download Progress */}
              {isDownloading && (
                <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-blue-400">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {downloadProgress}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleDownloadOfflineData}
                  disabled={isDownloading}
                  variant="default"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {offlineMetadata ? 'Update Data' : 'Download Data'}
                </Button>

                {offlineMetadata && (
                  <Button
                    onClick={() => setShowClearConfirm(true)}
                    variant="outline"
                    size="sm"
                    className="text-red-400 border-red-700 hover:bg-red-900/30"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Data
                  </Button>
                )}
              </div>

              {/* Dataset Stats */}
              {datasetStats.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Dataset Statistics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {datasetStats.map((stat) => (
                      <div key={stat.name} className="bg-gray-700/50 rounded p-2 text-sm">
                        <div className="text-gray-400 capitalize">{stat.name}</div>
                        <div className="text-white font-medium">
                          {stat.count.toLocaleString()} records
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Clear Confirmation Dialog */}
      <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Offline Data?</DialogTitle>
            <DialogDescription>
              This will remove all downloaded road data from your device. You'll need to download it
              again for offline use.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowClearConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearOfflineData}>
              Clear Data
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default OfflineDataSection;
