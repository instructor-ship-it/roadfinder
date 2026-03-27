'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  getOfflineDocuments,
  clearAllOfflineDocuments,
  getStorageEstimate,
  removeDocumentOffline,
  type OfflineDocument,
} from '@/lib/offline-storage';

export default function OfflinePage() {
  const [offlineDocs, setOfflineDocs] = useState<OfflineDocument[]>([]);
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setOfflineDocs(getOfflineDocuments());
    getStorageEstimate().then(setStorageInfo);
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRemoveDoc = async (docId: string) => {
    await removeDocumentOffline(docId);
    setOfflineDocs(getOfflineDocuments());
  };

  const handleClearAll = async () => {
    if (confirm('Remove all offline documents?')) {
      await clearAllOfflineDocuments();
      setOfflineDocs([]);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/library">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  ← Library
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white">💾 Offline Documents</h1>
            </div>
            <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Storage Info */}
        {storageInfo && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-white">Storage Used</h3>
                  <p className="text-sm text-gray-400">
                    {formatBytes(storageInfo.used)} of {formatBytes(storageInfo.quota)}
                  </p>
                </div>
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${Math.min((storageInfo.used / storageInfo.quota) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offline Mode Info */}
        {!isOnline && (
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-200 mb-2">📴 Offline Mode</h3>
            <p className="text-sm text-amber-200/80">
              You&apos;re currently offline. Documents listed below are available for viewing.
            </p>
          </div>
        )}

        {/* Documents List */}
        {offlineDocs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Offline Documents</h3>
            <p className="text-gray-400 mb-6">
              Save documents from the library to access them offline.
            </p>
            <Link href="/library">
              <Button className="bg-blue-600 hover:bg-blue-700">
                Go to Library
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-400">{offlineDocs.length} document{offlineDocs.length !== 1 ? 's' : ''} saved</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearAll}
                className="bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50"
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-3">
              {offlineDocs.map((doc) => (
                <Card key={doc.id} className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">{doc.title}</h3>
                        <p className="text-sm text-gray-400">{doc.shortTitle}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Saved: {new Date(doc.savedDate).toLocaleDateString()}
                          {doc.fileSize && ` • ${doc.fileSize}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={doc.url} target="_blank">
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Open
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRemoveDoc(doc.id)}
                          className="bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/50"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        {/* Help */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-bold text-lg mb-3 text-white">📖 How Offline Works</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <p>📥 <strong className="text-gray-300">Save:</strong> Click the download button (📥) on any document to save it for offline access.</p>
            <p>💾 <strong className="text-gray-300">Access:</strong> Saved documents are marked with 💾 and available even when you&apos;re offline.</p>
            <p>✕ <strong className="text-gray-300">Remove:</strong> Click the X button to remove a document from offline storage.</p>
            <p className="text-amber-400 mt-4">⚠️ Offline storage is managed by your browser. Clearing browser data may remove saved documents.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
