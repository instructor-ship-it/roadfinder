'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  getOfflineDocuments,
  getOfflineDocumentInfo,
  saveDocumentOffline,
  removeDocumentOffline,
  isDocumentOffline as checkDocumentOffline,
  getDownloadedDocuments,
  isDocumentDownloaded,
  markDocumentDownloaded,
  getDeletedCacheIds,
  type OfflineDocument,
} from '@/lib/offline-storage';

// Types
interface RegistryDocument {
  id: string;
  type: string;
  category: string;
  title: string;
  shortTitle: string;
  agency: string;
  version?: string;
  region?: string;
  pages?: number;
  status: string;
  mandatory?: boolean;
  path: string;
  url?: string;
  tags: string[];
  description: string;
  abstract?: string;
  hasTgs?: boolean;
  tgsPages?: [number, number];
  relatedDocuments?: string[];
  editable?: boolean;
  retention?: string;
  downloaded?: boolean;
  file?: string;
  fileSize?: string;
  parentDocument?: string;
}

interface RegistryCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  parent?: string;
}

interface ParentCategory {
  id: string;
  label: string;
  icon: string;
}

interface Registry {
  version: string;
  lastUpdated: string;
  name: string;
  description: string;
  categories: RegistryCategory[];
  parentCategories: ParentCategory[];
  regions: Array<{ id: string; label: string }>;
  documents: RegistryDocument[];
  quickLinks: Array<{ label: string; documentId: string; icon: string }>;
}

function LibraryPageContent() {
  const searchParams = useSearchParams();
  const [registry, setRegistry] = useState<Registry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [infoDoc, setInfoDoc] = useState<RegistryDocument | null>(null);
  const [showAbstractModal, setShowAbstractModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [isOnline, setIsOnline] = useState(true);
  const [offlineDocs, setOfflineDocs] = useState<OfflineDocument[]>([]);
  const [downloadedDocIds, setDownloadedDocIds] = useState<string[]>([]);
  const [deletedCacheIds, setDeletedCacheIds] = useState<string[]>([]);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  // Document Processing states
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processingDoc, setProcessingDoc] = useState<RegistryDocument | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const [aiApiKey, setAiApiKey] = useState('');

  // Load registry and offline status
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const response = await fetch('/library/registry.json');
        if (!response.ok) throw new Error('Failed to load registry');
        const data = await response.json();
        setRegistry(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load library');
      } finally {
        setLoading(false);
      }
    };
    loadRegistry();
    
    // Load offline documents
    setOfflineDocs(getOfflineDocuments());
    
    // Load downloaded documents
    const downloadedDocs = getDownloadedDocuments();
    setDownloadedDocIds(downloadedDocs.map(d => d.id));
    
    // Check for deleted caches (cache was cleared but tracking exists)
    const checkDeletedCaches = async () => {
      const deleted = await getDeletedCacheIds();
      setDeletedCacheIds(deleted);
    };
    checkDeletedCaches();
    
    // Check online status
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

  // Load AI API key and check for process parameter
  useEffect(() => {
    const savedKey = localStorage.getItem('ai_api_key') || '';
    setAiApiKey(savedKey);

    // Check if we should open process modal
    if (searchParams.get('process') === 'true' && savedKey) {
      setShowProcessModal(true);
    }
  }, [searchParams]);

  // Handle document processing
  const handleProcessDocument = useCallback(async (doc: RegistryDocument) => {
    if (!aiApiKey) {
      setProcessError('Please configure your AI API key in Settings first.');
      return;
    }

    setProcessingDoc(doc);
    setProcessing(true);
    setProcessResult(null);
    setProcessError(null);

    try {
      const response = await fetch('/api/documents/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          apiKey: aiApiKey,
          extractType: 'abstract',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProcessResult(data.extractedContent);
      } else {
        setProcessError(data.error || 'Failed to process document');
      }
    } catch (err) {
      setProcessError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setProcessing(false);
    }
  }, [aiApiKey]);

  // Handle saving document for offline
  const handleSaveOffline = useCallback(async (doc: RegistryDocument) => {
    const url = doc.file || doc.url;
    if (!url) return;
    
    setDownloadingDoc(doc.id);
    
    const result = await saveDocumentOffline({
      id: doc.id,
      url,
      title: doc.title,
      shortTitle: doc.shortTitle,
      fileSize: doc.fileSize,
    });
    
    if (result.success) {
      setOfflineDocs(getOfflineDocuments());
      // Clear from deleted cache list since it's now cached again
      setDeletedCacheIds(prev => prev.filter(id => id !== doc.id));
    } else {
      alert(`Failed to save: ${result.error}`);
    }
    
    setDownloadingDoc(null);
  }, []);

  // Handle removing document from offline
  const handleRemoveOffline = useCallback(async (docId: string) => {
    const result = await removeDocumentOffline(docId);
    if (result.success) {
      setOfflineDocs(getOfflineDocuments());
      // Refresh deleted cache list
      const deleted = await getDeletedCacheIds();
      setDeletedCacheIds(deleted);
    }
  }, []);

  // Filter documents by search and category
  const filteredDocuments = registry?.documents.filter((doc) => {
    const matchesSearch = !searchQuery.trim() || 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.shortTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      doc.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = !selectedParent || 
      registry.categories.find(c => c.id === doc.category)?.parent === selectedParent;
    
    return matchesSearch && matchesCategory;
  }) || [];

  // Group documents by parent category
  const documentsByParent = registry?.parentCategories.map(parent => ({
    ...parent,
    documents: filteredDocuments.filter(doc => 
      registry.categories.find(c => c.id === doc.category)?.parent === parent.id
    ),
    categories: registry.categories.filter(c => c.parent === parent.id)
  })) || [];

  // Get category info
  const getCategory = (categoryId: string) => 
    registry?.categories.find(c => c.id === categoryId);

  const getStatusColorClass = (status: string) => {
    const statusColors: Record<string, string> = {
      current: 'bg-green-900/30 border border-green-700 text-green-400',
      draft: 'bg-yellow-900/30 border border-yellow-700 text-yellow-400',
      superseded: 'bg-gray-600/30 border border-gray-500 text-gray-400',
      archived: 'bg-gray-700/30 border border-gray-600 text-gray-400',
    };
    return statusColors[status.toLowerCase()] || 'bg-gray-700/30 border border-gray-600 text-gray-300';
  };

  // Get document URL
  const getDocumentUrl = (doc: RegistryDocument | null): string => {
    if (!doc) return '#';
    // Priority: 1. Local file, 2. External URL, 3. Path fallback
    if (doc.file) {
      return doc.file;
    }
    return doc.url || doc.path || '#';
  };

  // Check if document is available offline
  const isDocOffline = (docId: string): boolean => {
    return offlineDocs.some(d => d.id === docId);
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Handle downloading file to device
  const handleDownloadToDevice = async (doc: RegistryDocument) => {
    const url = doc.file || doc.url;
    if (!url) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Create download link with sanitized filename
      const filename = (doc.shortTitle || doc.title || 'document').replace(/[^a-zA-Z0-9]/g, '_');
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      
      // Mark as downloaded
      markDocumentDownloaded({
        id: doc.id,
        title: doc.title,
        shortTitle: doc.shortTitle,
        fileSize: doc.fileSize,
      });
      setDownloadedDocIds(getDownloadedDocuments().map(d => d.id));
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  // Document item component
  const DocumentItem = ({ doc, category, showCategoryIcon = false }: { 
    doc: RegistryDocument; 
    category: RegistryCategory | undefined;
    showCategoryIcon?: boolean;
  }) => {
    const href = getDocumentUrl(doc);
    const isExternal = href.startsWith('http');
    const isCached = isDocOffline(doc.id) && !deletedCacheIds.includes(doc.id);
    const isCacheDeleted = deletedCacheIds.includes(doc.id);
    const isDownloaded = downloadedDocIds.includes(doc.id);
    const isDownloading = downloadingDoc === doc.id;

    return (
      <div className="p-3 rounded bg-gray-700/50 hover:bg-gray-700 transition-colors">
        {/* Title Row */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {showCategoryIcon && category && (
              <span className="text-lg shrink-0">{category.icon}</span>
            )}
            <Link 
              href={href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="font-semibold text-sm truncate text-white hover:text-blue-400"
            >
              {doc.shortTitle}
            </Link>
            {/* Document status indicators */}
            <div className="flex items-center gap-1 shrink-0">
              {doc.mandatory && (
                <span className="text-red-400" title="Required">☑</span>
              )}
              {doc.hasTgs && (
                <span className="text-amber-400" title="Has TGS Diagrams">☑</span>
              )}
              {doc.editable && (
                <span className="text-blue-400" title="Template">☑</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {/* Offline status indicators */}
            {isCached && (
              <span className="text-green-400 text-sm" title="Cached for offline access">📥</span>
            )}
            {isDownloaded && (
              <span className="text-blue-400 text-sm" title="Downloaded to device">💾</span>
            )}
            {isCacheDeleted && (
              <span className="text-red-400 text-sm" title="Cache deleted - re-cache needed">⚠️</span>
            )}
            {/* Info button */}
            <button 
              className="info-btn text-gray-400 hover:text-blue-400 transition-colors p-1"
              onClick={() => setInfoDoc(doc)}
              title="View document info"
            >
              ℹ️
            </button>
            <div className={`px-2 py-0.5 rounded text-xs ${getStatusColorClass(doc.status)}`}>
              {doc.status}
            </div>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-xs text-gray-400 line-clamp-2">{doc.description}</p>
        
        {/* Cache deleted warning */}
        {isCacheDeleted && (
          <p className="text-xs text-red-400 mt-1">
            ⚠️ Cache was cleared - click ℹ️ to re-cache
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading library registry...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  ← Home
                </Button>
              </Link>
              <h1 className="text-xl font-bold text-white">📚 {registry?.name}</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Document Processing Button */}
              <Button 
                onClick={() => setShowProcessModal(true)}
                variant="outline" 
                size="sm" 
                className="bg-amber-600/50 border-amber-500 text-amber-200 hover:bg-amber-600"
              >
                🧠 Process Docs
              </Button>
              {/* AI Q&A Link */}
              <Link href="/qa">
                <Button variant="outline" size="sm" className="bg-purple-600/50 border-purple-500 text-purple-200 hover:bg-purple-600">
                  🤖 AI Q&A
                </Button>
              </Link>
              {/* Online/Offline Status */}
              <div className={`flex items-center gap-2 text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></span>
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Input
              type="text"
              placeholder="Search documents, tags, descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              variant={selectedParent === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedParent(null)}
              className={selectedParent === null ? 'bg-blue-600' : 'bg-gray-700 border-gray-600'}
            >
              All
            </Button>
            {registry?.parentCategories.map(parent => (
              <Button
                key={parent.id}
                variant={selectedParent === parent.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedParent(parent.id)}
                className={selectedParent === parent.id ? 'bg-blue-600' : 'bg-gray-700 border-gray-600'}
              >
                {parent.icon} {parent.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Offline Mode Warning */}
      {!isOnline && offlineDocs.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-3 text-amber-200 text-sm">
            📴 You&apos;re offline. Only documents marked with 📥 are available.
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {registry?.quickLinks.map(link => {
            const doc = registry.documents.find(d => d.id === link.documentId);
            if (!doc) return null;
            const href = getDocumentUrl(doc);
            const isExternal = href.startsWith('http');
            
            return (
              <Link 
                key={link.documentId} 
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 hover:bg-gray-600">
                  {link.icon} {link.label}
                </Button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Document Categories */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        {documentsByParent.map(parent => {
          if (parent.documents.length === 0) return null;
          
          return (
            <div key={parent.id} className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <span className="text-2xl">{parent.icon}</span>
                {parent.label}
                <Badge variant="secondary" className="ml-2">{parent.documents.length}</Badge>
              </h2>
              
              {/* Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parent.categories.map(category => {
                  const categoryDocs = parent.documents.filter(d => d.category === category.id);
                  if (categoryDocs.length === 0) return null;
                  
                  const isExpanded = expandedCategories.has(category.id);
                  
                  return (
                    <Card key={category.id} className="bg-gray-800 border-gray-700">
                      <CardContent className="p-4">
                        <button 
                          className="w-full flex items-center gap-2 mb-1 text-left"
                          onClick={() => toggleCategory(category.id)}
                        >
                          <span className="text-xl">{category.icon}</span>
                          <h3 className="font-semibold text-white flex-1">{category.label}</h3>
                          <Badge variant="secondary">{categoryDocs.length}</Badge>
                          <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            ▼
                          </span>
                        </button>
                        <p className="text-sm text-gray-400 mb-2">{category.description}</p>
                        
                        {/* Document List - Collapsible */}
                        {isExpanded && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-gray-700">
                            {categoryDocs.map(doc => (
                              <DocumentItem key={doc.id} doc={doc} category={getCategory(doc.category)} />
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Search Results - Flat List */}
        {searchQuery && filteredDocuments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold mb-4 text-white">Search Results</h2>
            <div className="space-y-2">
              {filteredDocuments.map(doc => (
                <Card key={doc.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardContent className="p-4">
                    <DocumentItem doc={doc} category={getCategory(doc.category)} showCategoryIcon />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No results */}
        {filteredDocuments.length === 0 && searchQuery && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No documents found for &quot;{searchQuery}&quot;</p>
            <Button variant="outline" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-bold text-lg mb-3 text-white">📋 Document Indicators</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">📥</span>
              <span className="text-gray-300">Cached - Available offline in browser storage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">💾</span>
              <span className="text-gray-300">Downloaded - Saved to your device (permanent)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-gray-300">Cache cleared - Re-cache needed for offline access</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">☑</span>
              <span className="text-gray-300">Required - Mandatory for compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400">☑</span>
              <span className="text-gray-300">TGS - Has Traffic Guidance diagrams</span>
            </div>
          </div>
          
          {/* Download tip */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-sm text-amber-300">
              💡 <strong>Tip:</strong> Create a folder called <code className="bg-gray-700 px-1.5 py-0.5 rounded text-white">Documents/TCLibrary</code> to keep all your downloaded documents organized in one place.
            </p>
          </div>
        </div>

        {/* WHS Quick Reference */}
        <div className="mt-8 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <h3 className="font-bold text-lg mb-3 text-white">🦺 WHS Document Quick Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Required for All Sites:</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Safe Work Method Statement (SWMS)</li>
                <li>• Daily Diary - Keep 7 years</li>
                <li>• Site Induction Records</li>
                <li>• Training/Accreditation Records</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-300 mb-2">Required for Incidents:</h4>
              <ul className="space-y-1 text-gray-400">
                <li>• Incident Report Form - Keep 30 years</li>
                <li>• Risk Assessment</li>
                <li>• Health Monitoring Records - Keep 30 years</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Registry Info */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>Registry v{registry?.version} • Last updated: {registry?.lastUpdated}</p>
          <p className="mt-1">{registry?.description}</p>
        </div>
      </div>

      {/* Document Info Dialog */}
      <Dialog open={!!infoDoc} onOpenChange={() => { setInfoDoc(null); setShowAbstractModal(false); }}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">
              {infoDoc?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              {infoDoc?.shortTitle} • {infoDoc?.agency}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-2">
            {/* Overview */}
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">📄 Overview</h4>
              <p className="text-gray-300 text-sm">{infoDoc?.description}</p>
            </div>
            
            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {infoDoc?.version && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Version:</span>
                  <span className="text-white ml-2">{infoDoc.version}</span>
                </div>
              )}
              {infoDoc?.pages && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Pages:</span>
                  <span className="text-white ml-2">{infoDoc.pages}</span>
                </div>
              )}
              {infoDoc?.fileSize && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Size:</span>
                  <span className="text-white ml-2">{infoDoc.fileSize}</span>
                </div>
              )}
              {infoDoc?.region && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Region:</span>
                  <span className="text-white ml-2">{infoDoc.region}</span>
                </div>
              )}
              {infoDoc?.retention && (
                <div className="bg-gray-700/50 p-2 rounded col-span-2">
                  <span className="text-amber-400">Retention:</span>
                  <span className="text-white ml-2">Keep {infoDoc.retention}</span>
                </div>
              )}
            </div>

            {/* Status indicators */}
            <div className="flex flex-wrap gap-3">
              {infoDoc && isDocOffline(infoDoc.id) && !deletedCacheIds.includes(infoDoc.id) && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  📥 Cached for offline access
                </span>
              )}
              {infoDoc && downloadedDocIds.includes(infoDoc.id) && (
                <span className="text-blue-400 text-sm flex items-center gap-1">
                  💾 Downloaded to device
                </span>
              )}
              {infoDoc && deletedCacheIds.includes(infoDoc.id) && (
                <span className="text-red-400 text-sm flex items-center gap-1">
                  ⚠️ Cache was cleared - re-cache needed
                </span>
              )}
              {infoDoc?.mandatory && (
                <span className="text-green-400 text-sm flex items-center gap-1">
                  ☑ Required for compliance
                </span>
              )}
              {infoDoc?.hasTgs && (
                <span className="text-amber-400 text-sm flex items-center gap-1">
                  ☑ Contains TGS diagrams
                </span>
              )}
              {infoDoc?.editable && (
                <span className="text-blue-400 text-sm flex items-center gap-1">
                  ☑ Editable template
                </span>
              )}
            </div>

            {/* Tags */}
            {infoDoc?.tags && infoDoc.tags.length > 0 && (
              <div>
                <h4 className="font-semibold text-gray-400 mb-2 text-xs uppercase">Tags</h4>
                <div className="flex flex-wrap gap-1">
                  {infoDoc.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs border-gray-600 text-gray-300">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pt-2">
              {/* Download tip */}
              {infoDoc && (infoDoc.file || infoDoc.url) && (
                <p className="text-xs text-amber-300">
                  💡 Save to <code className="bg-gray-700 px-1 rounded">Documents/TCLibrary</code> for easy access
                </p>
              )}
              <div className="flex gap-2 flex-wrap">
                {/* Download to device - always available */}
                {infoDoc && (infoDoc.file || infoDoc.url) && (
                  <Button 
                    onClick={() => handleDownloadToDevice(infoDoc)}
                    className="bg-blue-600/80 hover:bg-blue-600 text-white"
                  >
                    ⬇️ Download
                  </Button>
                )}
                {infoDoc?.abstract && (
                  <Button 
                    onClick={() => setShowAbstractModal(true)}
                    className="bg-amber-600/80 hover:bg-amber-600 text-white"
                  >
                    📋 Abstract
                  </Button>
                )}
                {/* Generate Summary button - for docs without abstract but with local file */}
                {infoDoc && !infoDoc.abstract && infoDoc.file && !infoDoc.file.startsWith('http') && (
                  <Button 
                    onClick={() => {
                      setInfoDoc(null);
                      setShowProcessModal(true);
                    }}
                    className="bg-purple-600/80 hover:bg-purple-600 text-white"
                    disabled={!aiApiKey}
                    title={!aiApiKey ? 'Configure AI API key first' : 'Generate AI summary'}
                  >
                    🧠 Generate Summary
                  </Button>
                )}
                {/* Cache for offline button - show for local files only */}
                {infoDoc && infoDoc.file && !infoDoc.file.startsWith('http') && (
                  isDocOffline(infoDoc.id) && !deletedCacheIds.includes(infoDoc.id) ? (
                    <Button 
                      onClick={() => handleRemoveOffline(infoDoc.id)}
                      className="bg-red-600/80 hover:bg-red-600 text-white"
                    >
                      ✕ Remove Cache
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handleSaveOffline(infoDoc)}
                      disabled={!isOnline || downloadingDoc === infoDoc.id}
                      className="bg-green-600/80 hover:bg-green-600 text-white disabled:opacity-50"
                    >
                      {downloadingDoc === infoDoc.id ? '⏳ Caching...' : '📥 Cache Offline'}
                    </Button>
                  )
                )}
                <Link 
                  href={getDocumentUrl(infoDoc)}
                  target="_blank"
                  className="flex-1"
                >
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Open Document
                  </Button>
                </Link>
                <Button 
                  onClick={() => setInfoDoc(null)}
                  className="bg-gray-600 hover:bg-gray-500 text-white"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Abstract Modal */}
      <Dialog open={showAbstractModal} onOpenChange={setShowAbstractModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              📋 Abstract
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              {infoDoc?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2">
            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
              {infoDoc?.abstract}
            </p>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <Button 
              onClick={() => setShowAbstractModal(false)}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Processing Modal */}
      <Dialog open={showProcessModal} onOpenChange={setShowProcessModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              🧠 Document Processing
              <span className="text-xs text-amber-400 bg-amber-900/50 px-2 py-1 rounded">
                AI-Powered
              </span>
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Auto-generate summaries and extract knowledge from PDF documents
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* API Key Warning */}
            {!aiApiKey && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm">
                  ⚠️ No AI API key configured. Go to Settings → AI Settings to add your key.
                </p>
              </div>
            )}

            {/* Document Selection */}
            {!processingDoc && (
              <div>
                <h4 className="font-semibold text-amber-400 mb-2">Select Document to Process</h4>
                <p className="text-gray-400 text-xs mb-3">
                  Only documents with local PDF files can be processed.
                </p>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {registry?.documents
                    .filter(doc => doc.file && !doc.file.startsWith('http'))
                    .map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => handleProcessDocument(doc)}
                        disabled={!aiApiKey}
                        className="w-full text-left p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm font-medium">{doc.shortTitle}</span>
                            <span className="text-gray-400 text-xs ml-2">({doc.fileSize || 'Unknown size'})</span>
                          </div>
                          {doc.abstract && (
                            <span className="text-green-400 text-xs">✓ Has abstract</span>
                          )}
                        </div>
                        <p className="text-gray-400 text-xs mt-1 truncate">{doc.description}</p>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Processing Status */}
            {processing && (
              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400"></div>
                  <div>
                    <p className="text-blue-300 font-medium">Processing document...</p>
                    <p className="text-blue-400 text-xs">{processingDoc?.title}</p>
                  </div>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Extracting text and generating summary with AI. This may take 10-30 seconds.
                </p>
              </div>
            )}

            {/* Process Result */}
            {processResult && (
              <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                <h4 className="text-green-400 font-semibold mb-2">✓ Generated Summary</h4>
                <div className="bg-gray-900 rounded p-3 max-h-60 overflow-y-auto">
                  <p className="text-gray-300 text-sm whitespace-pre-line">{processResult}</p>
                </div>
                <p className="text-gray-500 text-xs mt-2">
                  Summary saved to generated-summaries.json
                </p>
              </div>
            )}

            {/* Error */}
            {processError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                <p className="text-red-300 text-sm">❌ {processError}</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-gray-700 flex gap-2">
            {processingDoc && !processing && (
              <Button
                onClick={() => {
                  setProcessingDoc(null);
                  setProcessResult(null);
                  setProcessError(null);
                }}
                className="bg-gray-600 hover:bg-gray-500"
              >
                Process Another
              </Button>
            )}
            <Button
              onClick={() => {
                setShowProcessModal(false);
                setProcessingDoc(null);
                setProcessResult(null);
                setProcessError(null);
              }}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading fallback for Suspense
function LibraryLoading() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-gray-400">Loading library...</p>
      </div>
    </div>
  );
}

// Wrap with Suspense for useSearchParams support in Next.js 16
export default function LibraryPage() {
  return (
    <Suspense fallback={<LibraryLoading />}>
      <LibraryPageContent />
    </Suspense>
  );
}
