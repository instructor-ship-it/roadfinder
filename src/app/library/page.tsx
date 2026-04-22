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
import { PdfViewerModal } from '@/components/PdfViewerModal';
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
import {
  getAllSummaries,
  saveSummary,
  downloadSummaries,
  importSummariesFromJson,
  getStorageStats,
  type SummariesCollection,
  type DocumentSummary,
} from '@/lib/summaries-storage';

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

/**
 * Find the page number for a section reference in a document's completeSections.
 * Handles various section reference formats:
 * - "Section 8.2" -> finds sectionNumber "8.2"
 * - "Section 8" -> finds first subsection like "8.1" or "8.0"
 * - "8.2" -> direct match
 * - "Appendix 1" -> matches sectionNumber "Appendix 1"
 */
function findPageForSection(
  sectionRef: string,
  completeSections: Array<{ sectionNumber: string; sectionTitle?: string; page?: number | string }>
): number | null {
  if (!sectionRef || !completeSections?.length) return null;

  // Normalize the reference - extract section number
  // "Section 8.2" -> "8.2", "Section 8" -> "8", "Appendix 1" -> "Appendix 1"
  const normalizedRef = sectionRef
    .replace(/^Section\s+/i, '')
    .replace(/^Section$/i, '')
    .trim();

  if (!normalizedRef) return null;

  // Try exact match first
  const exactMatch = completeSections.find(
    (s) => s.sectionNumber.toLowerCase() === normalizedRef.toLowerCase()
  );
  if (exactMatch && typeof exactMatch.page === 'number') {
    return exactMatch.page;
  }

  // Try partial match (e.g., "8" should match "8.1" or "8.2")
  const partialMatch = completeSections.find((s) => {
    const sectionNum = s.sectionNumber.toLowerCase();
    // Match if section starts with the reference followed by a dot or is exact
    return (
      sectionNum === normalizedRef.toLowerCase() ||
      sectionNum.startsWith(normalizedRef.toLowerCase() + '.') ||
      sectionNum.startsWith(normalizedRef.toLowerCase() + ' ')
    );
  });
  if (partialMatch && typeof partialMatch.page === 'number') {
    return partialMatch.page;
  }

  // Try matching by title (e.g., "Traffic Controller Accreditation")
  const titleMatch = completeSections.find((s) => {
    const title = s.sectionTitle?.toLowerCase() || '';
    return title.includes(normalizedRef.toLowerCase());
  });
  if (titleMatch && typeof titleMatch.page === 'number') {
    return titleMatch.page;
  }

  return null;
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

  // Summaries storage
  const [summaries, setSummaries] = useState<SummariesCollection>({});
  const [storageStats, setStorageStats] = useState({ localCount: 0, localStorageSize: '0 KB' });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    imported: number;
    error?: string;
  } | null>(null);

  // PDF Viewer Modal state
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean;
    docId: string;
    docTitle: string;
    page: number;
    pdfUrl: string;
  } | null>(null);

  // Open PDF in modal
  const openPdfModal = useCallback(
    (docId: string, docTitle: string, page: number, pdfUrl: string) => {
      setPdfModal({ isOpen: true, docId, docTitle, page, pdfUrl });
    },
    []
  );

  // Close PDF modal
  const closePdfModal = useCallback(() => {
    setPdfModal((prev) => (prev ? { ...prev, isOpen: false } : null));
  }, []);

  // Load registry and offline status
  useEffect(() => {
    const loadRegistry = async () => {
      try {
        const response = await fetch('/library/registry.json?t=' + Date.now());
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
    setDownloadedDocIds(downloadedDocs.map((d) => d.id));

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

  // Load summaries from repo + localStorage
  useEffect(() => {
    const loadSummaries = async () => {
      const allSummaries = await getAllSummaries();
      setSummaries(allSummaries);
      setStorageStats(getStorageStats());
    };
    loadSummaries();
  }, []);

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
      setDeletedCacheIds((prev) => prev.filter((id) => id !== doc.id));
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

  // Filter documents by search and category (Phase 4: Enhanced search with extracted data)
  const filteredDocuments =
    registry?.documents.filter((doc) => {
      if (!searchQuery.trim()) {
        const matchesCategory =
          !selectedParent ||
          registry.categories.find((c) => c.id === doc.category)?.parent === selectedParent;
        return matchesCategory;
      }

      const query = searchQuery.toLowerCase();

      // Basic document fields
      const matchesBasicSearch =
        doc.title.toLowerCase().includes(query) ||
        doc.shortTitle.toLowerCase().includes(query) ||
        doc.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        doc.description.toLowerCase().includes(query);

      // Phase 4: Search in extracted data
      const summary = summaries[doc.id];
      const extracted = summary?.extractedData;
      const diagramAnalyses = summary?.diagramAnalyses;

      // Search in speed zones
      const matchesSpeedZone =
        extracted?.speedZonesMentioned?.some(
          (zone) => zone.toString().includes(query) || `${zone} km/h`.includes(query)
        ) || false;

      // Search in TGS diagrams referenced
      const matchesTgsDiagram =
        extracted?.tgsDiagramsReferenced?.some((tgs) => tgs.toLowerCase().includes(query)) || false;

      // Search in requirements
      const matchesRequirements =
        extracted?.requirements?.some((req) => req.requirement.toLowerCase().includes(query)) ||
        summary?.keyRequirements?.some((req) => {
          // Handle both string and object format
          const text =
            typeof req === 'object' && req !== null
              ? (req as { requirement?: string }).requirement
              : req;
          return text?.toLowerCase().includes(query) || false;
        }) ||
        false;

      // Search in role definitions
      const matchesRoles =
        extracted?.roleDefinitions?.some((role) => role.toLowerCase().includes(query)) || false;

      // Search in diagram analyses
      const matchesDiagrams =
        diagramAnalyses?.some(
          (diagram) =>
            diagram.description?.toLowerCase().includes(query) ||
            diagram.setupType?.toLowerCase().includes(query) ||
            diagram.signs?.some((sign) => sign.toLowerCase().includes(query)) ||
            diagram.trafficControlDevices?.some((device) => device.toLowerCase().includes(query)) ||
            diagram.safetyNotes?.some((note) => note.toLowerCase().includes(query))
        ) || false;

      // Search in keywords
      const matchesKeywords =
        summary?.keywords?.some((kw) => kw.toLowerCase().includes(query)) || false;

      // Search in abstract
      const matchesAbstract = summary?.abstract?.toLowerCase().includes(query) || false;

      // Search in compliance notes
      const matchesCompliance =
        summary?.complianceNotes?.some((note) => {
          // Handle both string and object format
          const text =
            typeof note === 'object' && note !== null ? (note as { note?: string }).note : note;
          return text?.toLowerCase().includes(query) || false;
        }) || false;

      const matchesCategory =
        !selectedParent ||
        registry.categories.find((c) => c.id === doc.category)?.parent === selectedParent;

      return (
        matchesCategory &&
        (matchesBasicSearch ||
          matchesSpeedZone ||
          matchesTgsDiagram ||
          matchesRequirements ||
          matchesRoles ||
          matchesDiagrams ||
          matchesKeywords ||
          matchesAbstract ||
          matchesCompliance)
      );
    }) || [];

  // Group documents by parent category
  const documentsByParent =
    registry?.parentCategories.map((parent) => ({
      ...parent,
      documents: filteredDocuments.filter(
        (doc) => registry.categories.find((c) => c.id === doc.category)?.parent === parent.id
      ),
      categories: registry.categories.filter((c) => c.parent === parent.id),
    })) || [];

  // Get category info
  const getCategory = (categoryId: string) => registry?.categories.find((c) => c.id === categoryId);

  const getStatusColorClass = (status: string) => {
    const statusColors: Record<string, string> = {
      current: 'bg-green-900/30 border border-green-700 text-green-400',
      draft: 'bg-yellow-900/30 border border-yellow-700 text-yellow-400',
      superseded: 'bg-gray-600/30 border border-gray-500 text-gray-400',
      archived: 'bg-gray-700/30 border border-gray-600 text-gray-400',
    };
    return (
      statusColors[status.toLowerCase()] || 'bg-gray-700/30 border border-gray-600 text-gray-300'
    );
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
    return offlineDocs.some((d) => d.id === docId);
  };

  // Toggle category expansion
  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Toggle complete sections expansion
  const toggleCompleteSections = (docId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
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
      setDownloadedDocIds(getDownloadedDocuments().map((d) => d.id));
    } catch (error) {
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  // Document item component
  const DocumentItem = ({
    doc,
    category,
    showCategoryIcon = false,
  }: {
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
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="font-semibold text-sm truncate text-white hover:text-blue-400"
            >
              {doc.shortTitle}
            </Link>
            {/* Document status indicators */}
            <div className="flex items-center gap-1 shrink-0">
              {doc.mandatory && (
                <span className="text-red-400" title="Required">
                  ☑
                </span>
              )}
              {doc.hasTgs && (
                <span className="text-amber-400" title="Has TGS Diagrams">
                  ☑
                </span>
              )}
              {doc.editable && (
                <span className="text-blue-400" title="Template">
                  ☑
                </span>
              )}
              {/* Phase 4: Enhanced AI Summary indicators */}
              {summaries[doc.id]?.extractionType === 'diagrams' && (
                <span
                  className="text-cyan-400 text-xs"
                  title={`Diagrams analyzed (${summaries[doc.id]?.diagramAnalyses?.length || 0} TGS)`}
                >
                  🖼️
                </span>
              )}
              {summaries[doc.id]?.extractionType === 'structured' && (
                <span className="text-purple-400 text-xs" title="Structured extraction">
                  🔬
                </span>
              )}
              {summaries[doc.id] && !summaries[doc.id]?.extractionType && (
                <span className="text-purple-400" title="AI Summary Available">
                  🧠
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {/* Offline status indicators */}
            {isCached && (
              <span className="text-green-400 text-sm" title="Cached for offline access">
                📥
              </span>
            )}
            {isDownloaded && (
              <span className="text-blue-400 text-sm" title="Downloaded to device">
                💾
              </span>
            )}
            {isCacheDeleted && (
              <span className="text-red-400 text-sm" title="Cache deleted - re-cache needed">
                ⚠️
              </span>
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
          <p className="text-xs text-red-400 mt-1">⚠️ Cache was cleared - click ℹ️ to re-cache</p>
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
              {/* Online/Offline Status */}
              <div
                className={`flex items-center gap-2 text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}
                ></span>
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
            {registry?.parentCategories.map((parent) => (
              <Button
                key={parent.id}
                variant={selectedParent === parent.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedParent(parent.id)}
                className={
                  selectedParent === parent.id ? 'bg-blue-600' : 'bg-gray-700 border-gray-600'
                }
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
          {registry?.quickLinks.map((link) => {
            const doc = registry.documents.find((d) => d.id === link.documentId);
            if (!doc) return null;
            const href = getDocumentUrl(doc);
            const isExternal = href.startsWith('http');

            return (
              <Link
                key={link.documentId}
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-700 border-gray-600 hover:bg-gray-600"
                >
                  {link.icon} {link.label}
                </Button>
              </Link>
            );
          })}
          {/* Import/Export Summaries */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadSummaries()}
            className="bg-blue-700/50 border-blue-600 hover:bg-blue-600 text-white"
            disabled={Object.keys(summaries).length === 0}
            title="Export AI summaries to JSON file"
          >
            📤 Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
            className="bg-green-700/50 border-green-600 hover:bg-green-600 text-white"
            title="Import AI summaries from JSON file"
          >
            📥 Import
          </Button>
        </div>
      </div>

      {/* Document Categories */}
      <div className="max-w-7xl mx-auto px-4 pb-6">
        {documentsByParent.map((parent) => {
          if (parent.documents.length === 0) return null;

          return (
            <div key={parent.id} className="mb-8">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <span className="text-2xl">{parent.icon}</span>
                {parent.label}
                <Badge variant="secondary" className="ml-2">
                  {parent.documents.length}
                </Badge>
              </h2>

              {/* Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {parent.categories.map((category) => {
                  const categoryDocs = parent.documents.filter((d) => d.category === category.id);
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
                          <span
                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            ▼
                          </span>
                        </button>
                        <p className="text-sm text-gray-400 mb-2">{category.description}</p>

                        {/* Document List - Collapsible */}
                        {isExpanded && (
                          <div className="space-y-2 mt-3 pt-3 border-t border-gray-700">
                            {categoryDocs.map((doc) => (
                              <DocumentItem
                                key={doc.id}
                                doc={doc}
                                category={getCategory(doc.category)}
                              />
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
              {filteredDocuments.map((doc) => (
                <Card
                  key={doc.id}
                  className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors"
                >
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-400">📥</span>
              <span className="text-gray-300">Cached - Available offline</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">💾</span>
              <span className="text-gray-300">Downloaded to device</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">⚠️</span>
              <span className="text-gray-300">Cache cleared - re-cache needed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400">☑</span>
              <span className="text-gray-300">Required - Mandatory for compliance</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400">☑</span>
              <span className="text-gray-300">TGS - Has Traffic Guidance diagrams</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">🧠</span>
              <span className="text-gray-300">AI Summary available</span>
            </div>
            {/* Phase 4: New indicators */}
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🔬</span>
              <span className="text-gray-300">Structured extraction (Phase 2)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-cyan-400">🖼️</span>
              <span className="text-gray-300">Diagrams analyzed (Phase 3)</span>
            </div>
          </div>

          {/* Phase 4: Search tips */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-sm text-purple-300">
              🔍 <strong>Enhanced Search (Phase 4):</strong> Search now includes extracted speed
              zones, TGS codes, requirements, sign codes, and diagram descriptions.
            </p>
          </div>

          {/* Download tip */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-sm text-amber-300">
              💡 <strong>Tip:</strong> Create a folder called{' '}
              <code className="bg-gray-700 px-1.5 py-0.5 rounded text-white">
                Documents/TCLibrary
              </code>{' '}
              to keep all your downloaded documents organized in one place.
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
          <p>
            Registry v{registry?.version} • Last updated: {registry?.lastUpdated}
          </p>
          <p className="mt-1">{registry?.description}</p>
        </div>
      </div>

      {/* Document Info Dialog */}
      <Dialog
        open={!!infoDoc}
        onOpenChange={() => {
          setInfoDoc(null);
          setShowAbstractModal(false);
        }}
      >
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">{infoDoc?.title}</DialogTitle>
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
                  {infoDoc.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs border-gray-600 text-gray-300"
                    >
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
                  💡 Save to <code className="bg-gray-700 px-1 rounded">Documents/TCLibrary</code>{' '}
                  for easy access
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
                {/* Smart Summary/Abstract button - ONE button with priority logic */}
                {infoDoc && summaries[infoDoc.id] ? (
                  /* Priority 1: AI Summary exists (no API key needed) */
                  <Button
                    onClick={() => setShowAbstractModal(true)}
                    className="bg-purple-600/80 hover:bg-purple-600 text-white"
                  >
                    🧠 AI Summary
                  </Button>
                ) : infoDoc?.abstract ? (
                  /* Priority 2: Registry abstract exists */
                  <Button
                    onClick={() => setShowAbstractModal(true)}
                    className="bg-amber-600/80 hover:bg-amber-600 text-white"
                  >
                    📋 Abstract
                  </Button>
                ) : null}
                {/* Cache for offline button - show for local files only */}
                {infoDoc &&
                  infoDoc.file &&
                  !infoDoc.file.startsWith('http') &&
                  (isDocOffline(infoDoc.id) && !deletedCacheIds.includes(infoDoc.id) ? (
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
                  ))}
                <Link href={getDocumentUrl(infoDoc)} target="_blank" className="flex-1">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Open Document</Button>
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

      {/* Abstract/Summary Modal */}
      <Dialog open={showAbstractModal} onOpenChange={setShowAbstractModal}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white text-lg flex items-center gap-2">
              {infoDoc && summaries[infoDoc.id] ? <>🧠 AI Summary</> : <>📋 Abstract</>}
              {infoDoc && summaries[infoDoc.id]?.source === 'repo' && (
                <span className="text-xs text-green-400 bg-green-900/50 px-2 py-1 rounded">
                  Pre-generated
                </span>
              )}
              {infoDoc && summaries[infoDoc.id]?.source === 'user' && (
                <span className="text-xs text-blue-400 bg-blue-900/50 px-2 py-1 rounded">
                  User-generated
                </span>
              )}
              {infoDoc && summaries[infoDoc.id]?.extractionType === 'structured' && (
                <span className="text-xs text-purple-400 bg-purple-900/50 px-2 py-1 rounded">
                  Structured v{summaries[infoDoc.id]?.extractionVersion || '2.0'}
                </span>
              )}
              {infoDoc && summaries[infoDoc.id]?.extractionType === 'diagrams' && (
                <span className="text-xs text-cyan-400 bg-cyan-900/50 px-2 py-1 rounded">
                  Diagrams v{summaries[infoDoc.id]?.extractionVersion || '3.0'}
                </span>
              )}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              {infoDoc?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            {/* Show AI-generated summary if available (priority), otherwise show registry abstract */}
            {infoDoc && summaries[infoDoc.id] ? (
              (() => {
                const summary = summaries[infoDoc.id];
                const extracted = summary?.extractedData;

                return (
                  <>
                    {/* Abstract */}
                    <div>
                      <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {summary.abstract}
                      </p>
                    </div>

                    {/* Structured Extraction Data */}
                    {extracted && (
                      <div className="space-y-4 pt-3 border-t border-gray-700">
                        {/* Speed Zones */}
                        {extracted.speedZonesMentioned &&
                          extracted.speedZonesMentioned.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-amber-400 mb-2 uppercase flex items-center gap-2">
                                <span>🚗</span> Speed Zones Mentioned
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {extracted.speedZonesMentioned.map((zone) => (
                                  <Badge
                                    key={zone}
                                    className="bg-amber-900/50 text-amber-300 border border-amber-700"
                                  >
                                    {zone} km/h
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* TGS Diagrams */}
                        {extracted.tgsDiagramsReferenced &&
                          extracted.tgsDiagramsReferenced.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase flex items-center gap-2">
                                <span>📐</span> TGS Diagrams Referenced
                              </h4>
                              <div className="flex flex-wrap gap-1">
                                {extracted.tgsDiagramsReferenced.map((tgs, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs border-blue-600 text-blue-300"
                                  >
                                    {tgs}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                        {/* Taper Lengths */}
                        {extracted.taperLengths && extracted.taperLengths.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-cyan-400 mb-2 uppercase flex items-center gap-2">
                              <span>📏</span> Taper Lengths
                            </h4>
                            <div className="grid grid-cols-2 gap-2">
                              {extracted.taperLengths.map((taper, i) => (
                                <div key={i} className="bg-gray-700/50 p-2 rounded text-xs">
                                  <span className="text-cyan-300 font-semibold">
                                    {taper.speedZone} km/h:
                                  </span>{' '}
                                  <span className="text-gray-300">{taper.taperLength}</span>
                                  {taper.notes && (
                                    <span className="text-gray-500 block mt-1">{taper.notes}</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Notification Thresholds */}
                        {extracted.notificationThresholds &&
                          Object.keys(extracted.notificationThresholds).length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-orange-400 mb-2 uppercase flex items-center gap-2">
                                <span>⏰</span> Notification Thresholds
                              </h4>
                              <div className="space-y-1">
                                {Object.entries(extracted.notificationThresholds).map(
                                  ([key, value]) =>
                                    value && (
                                      <div
                                        key={key}
                                        className="flex justify-between text-xs bg-gray-700/50 p-2 rounded"
                                      >
                                        <span className="text-gray-400 capitalize">
                                          {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </span>
                                        <span className="text-orange-300 font-semibold">
                                          {value}
                                        </span>
                                      </div>
                                    )
                                )}
                              </div>
                            </div>
                          )}

                        {/* Requirements with Sections */}
                        {extracted.requirements && extracted.requirements.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-red-400 mb-2 uppercase flex items-center gap-2">
                              <span>📋</span> Key Requirements
                            </h4>
                            <ul className="space-y-2">
                              {extracted.requirements.slice(0, 10).map((req, i) => (
                                <li key={i} className="text-xs bg-gray-700/50 p-2 rounded">
                                  <div className="flex items-start gap-2">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-xs ${
                                        req.type === 'mandatory'
                                          ? 'bg-red-900/50 text-red-300'
                                          : req.type === 'recommended'
                                            ? 'bg-yellow-900/50 text-yellow-300'
                                            : 'bg-gray-600 text-gray-300'
                                      }`}
                                    >
                                      {req.type}
                                    </span>
                                    <span className="text-gray-300 flex-1">{req.requirement}</span>
                                    {req.section && (
                                      <span className="text-gray-500 text-xs">§{req.section}</span>
                                    )}
                                  </div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Role Definitions */}
                        {extracted.roleDefinitions && extracted.roleDefinitions.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-2 uppercase flex items-center gap-2">
                              <span>👥</span> Roles Defined
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {extracted.roleDefinitions.map((role, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs border-green-600 text-green-300"
                                >
                                  {role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Basic Keywords & Requirements (non-structured) */}
                    {!extracted && (
                      <>
                        {summary.keywords && summary.keywords.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-gray-400 mb-1 uppercase">
                              Keywords
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {summary.keywords.map((kw, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs border-gray-600 text-gray-300"
                                >
                                  {kw}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {summary.keySections && summary.keySections.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-blue-400 mb-2 uppercase flex items-center gap-2">
                              <span>📑</span> Key Sections
                            </h4>
                            <div className="space-y-2">
                              {summary.keySections.map((section, i) => (
                                <div key={i} className="bg-gray-700/50 p-2 rounded">
                                  <div className="text-blue-300 text-xs font-medium">
                                    {section.section}
                                  </div>
                                  <div className="text-gray-400 text-xs mt-1">
                                    {section.summary}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {/* Complete Sections - ALL sections from document */}
                        {summary.completeSections && summary.completeSections.length > 0 && (
                          <div className="mt-4">
                            <button
                              type="button"
                              onClick={() => toggleCompleteSections(infoDoc?.id || '')}
                              className="w-full text-left text-xs font-semibold text-indigo-400 mb-2 uppercase flex items-center gap-2 cursor-pointer hover:text-indigo-300 transition-colors"
                            >
                              <span>📚</span> Complete Document Structure (
                              {summary.completeSections.length} sections)
                              <span className="ml-auto text-gray-500 flex items-center gap-1">
                                {expandedSections.has(infoDoc?.id || '')
                                  ? '▲ Collapse'
                                  : '▼ Expand'}
                              </span>
                            </button>
                            {expandedSections.has(infoDoc?.id || '') && (
                              <div className="max-h-80 overflow-y-auto space-y-1 pr-2 bg-gray-700/30 rounded text-xs border border-gray-600">
                                {/* Page offset warning */}
                                {(() => {
                                  const offset = (summary as { pageOffset?: number }).pageOffset;
                                  return offset && offset > 0 ? (
                                    <div className="text-amber-400 text-[10px] px-2 py-1 border-b border-amber-600/50 bg-amber-900/20">
                                      ⚠️ Document page numbers offset by +{offset} (cover page not
                                      numbered)
                                    </div>
                                  ) : null;
                                })()}
                                {/* Note about page navigation */}
                                <div className="text-gray-500 text-[10px] px-2 py-1 border-b border-gray-600/50 italic">
                                  💡 Click section to open in document reader
                                </div>
                                {summary.completeSections.map((section, i) => {
                                  // Build viewer URL based on document type
                                  const pageNum =
                                    typeof section.page === 'number' ? section.page : null;
                                  // Apply page offset for documents where physical pages differ from document page numbers
                                  const pageOffset =
                                    (summary as { pageOffset?: number }).pageOffset || 0;
                                  const physicalPage = pageNum ? pageNum + pageOffset : null;
                                  // TMP documents (traffic-management-plan) use split-image viewer
                                  // Other documents use PDF modal
                                  const isTmpDoc =
                                    infoDoc?.type === 'traffic-management-plan' ||
                                    infoDoc?.category === 'mrwa-tmp';
                                  const viewerUrl =
                                    physicalPage && infoDoc?.id && isTmpDoc
                                      ? `/library/${infoDoc.id}/${physicalPage}`
                                      : '#';
                                  // Get PDF URL for modal (non-TMP docs)
                                  const pdfUrl = infoDoc?.file || infoDoc?.url || null;
                                  const canOpenModal =
                                    physicalPage && infoDoc?.id && pdfUrl && !isTmpDoc;

                                  const SectionContent = (
                                    <>
                                      <span className="text-indigo-300 font-mono min-w-[40px] shrink-0 group-hover:text-indigo-200">
                                        {section.sectionNumber}
                                      </span>
                                      <span className="text-gray-300 flex-1 group-hover:text-white">
                                        {section.sectionTitle}
                                      </span>
                                      {section.page && (
                                        <span className="text-indigo-400 text-[10px] group-hover:text-indigo-300 flex items-center gap-1 shrink-0">
                                          📄 p.{section.page}
                                        </span>
                                      )}
                                    </>
                                  );

                                  // TMP docs use Link, PDF docs use modal
                                  if (viewerUrl !== '#') {
                                    return (
                                      <Link
                                        key={i}
                                        href={viewerUrl}
                                        className="flex items-start gap-2 py-1 border-b border-gray-600/50 first:border-0 last:border-0 hover:bg-indigo-900/30 px-2 rounded cursor-pointer transition-colors group"
                                      >
                                        {SectionContent}
                                      </Link>
                                    );
                                  } else if (canOpenModal) {
                                    return (
                                      <button
                                        key={i}
                                        onClick={() =>
                                          openPdfModal(
                                            infoDoc!.id,
                                            infoDoc!.title,
                                            physicalPage!,
                                            pdfUrl!
                                          )
                                        }
                                        className="flex w-full items-start gap-2 py-1 border-b border-gray-600/50 first:border-0 last:border-0 hover:bg-indigo-900/30 px-2 rounded cursor-pointer transition-colors group text-left"
                                      >
                                        {SectionContent}
                                      </button>
                                    );
                                  } else {
                                    return (
                                      <div
                                        key={i}
                                        className="flex items-start gap-2 py-1 border-b border-gray-600/50 first:border-0 last:border-0 px-2"
                                      >
                                        {SectionContent}
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            )}
                          </div>
                        )}
                        {summary.keyRequirements && summary.keyRequirements.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-red-400 mb-1 uppercase flex items-center gap-2">
                              <span>📋</span> Key Requirements
                            </h4>
                            <ul className="text-gray-300 text-xs space-y-2">
                              {summary.keyRequirements.map((req, i) => {
                                // Handle both string and object format
                                const isObject = typeof req === 'object' && req !== null;
                                const requirementText = isObject
                                  ? (req as { requirement?: string }).requirement
                                  : req;
                                const section = isObject
                                  ? (req as { section?: string }).section
                                  : null;
                                const priority = isObject
                                  ? (req as { priority?: string }).priority
                                  : null;
                                const regulation = isObject
                                  ? (req as { regulation?: string }).regulation
                                  : null;
                                const employeeDuty = isObject
                                  ? (req as { employeeDuty?: boolean }).employeeDuty
                                  : false;
                                const employeeRight = isObject
                                  ? (req as { employeeRight?: boolean }).employeeRight
                                  : false;

                                // Use physicalPage directly if available in data, otherwise derive from section
                                const directPhysicalPage = isObject
                                  ? (req as { physicalPage?: number }).physicalPage
                                  : null;
                                const documentPage = isObject
                                  ? (req as { documentPage?: number }).documentPage
                                  : null;

                                // Find page number for section reference (fallback)
                                const pageOffset =
                                  (summary as { pageOffset?: number }).pageOffset || 0;
                                let pageNum: number | null = null;
                                let physicalPage: number | null = null;

                                if (directPhysicalPage) {
                                  // Use physicalPage directly from data
                                  physicalPage = directPhysicalPage;
                                  pageNum = documentPage || null;
                                } else if (section) {
                                  // Fallback: derive from section reference
                                  pageNum = findPageForSection(
                                    section,
                                    summary.completeSections || []
                                  );
                                  physicalPage = pageNum ? pageNum + pageOffset : null;
                                }

                                // Determine if TMP document (uses different viewer)
                                const isTmpDoc =
                                  infoDoc?.type === 'traffic-management-plan' ||
                                  infoDoc?.category === 'mrwa-tmp';
                                const viewerUrl =
                                  physicalPage && infoDoc?.id && isTmpDoc
                                    ? `/library/${infoDoc.id}/${physicalPage}`
                                    : null;

                                // Get PDF URL for modal (non-TMP docs)
                                const pdfUrl = infoDoc?.file || infoDoc?.url || null;
                                const canOpenModal =
                                  physicalPage && infoDoc?.id && pdfUrl && !isTmpDoc;

                                const CardContent = (
                                  <>
                                    <div className="flex items-start gap-2">
                                      {priority && (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] uppercase shrink-0 ${
                                            priority === 'critical'
                                              ? 'bg-red-900/50 text-red-300'
                                              : priority === 'high'
                                                ? 'bg-orange-900/50 text-orange-300'
                                                : 'bg-yellow-900/50 text-yellow-300'
                                          }`}
                                        >
                                          {priority}
                                        </span>
                                      )}
                                      {employeeDuty && (
                                        <span
                                          className="px-1.5 py-0.5 rounded text-[10px] bg-blue-900/50 text-blue-300 shrink-0"
                                          title="Employee Duty"
                                        >
                                          👷
                                        </span>
                                      )}
                                      {employeeRight && (
                                        <span
                                          className="px-1.5 py-0.5 rounded text-[10px] bg-green-900/50 text-green-300 shrink-0"
                                          title="Employee Right"
                                        >
                                          ✅
                                        </span>
                                      )}
                                      <span className="flex-1">{requirementText}</span>
                                      {(regulation || section) && (
                                        <span
                                          className={`text-[10px] shrink-0 flex items-center gap-1 ${
                                            canOpenModal || viewerUrl
                                              ? 'text-indigo-400 group-hover:text-indigo-300'
                                              : 'text-gray-500'
                                          }`}
                                        >
                                          {regulation ? `Reg ${regulation}` : section}
                                          {(canOpenModal || viewerUrl) && (
                                            <span className="text-indigo-400">📄</span>
                                          )}
                                        </span>
                                      )}
                                    </div>
                                    {(canOpenModal || viewerUrl) && (
                                      <div className="text-indigo-400 text-[10px] mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        🔗 Click to view p.{pageNum || physicalPage}
                                      </div>
                                    )}
                                  </>
                                );

                                // TMP docs use Link, PDF docs use modal
                                if (viewerUrl) {
                                  return (
                                    <Link
                                      key={i}
                                      href={viewerUrl}
                                      className="block bg-gray-700/30 p-2 rounded hover:bg-indigo-900/30 hover:border-indigo-500/50 border border-transparent transition-all cursor-pointer group"
                                    >
                                      {CardContent}
                                    </Link>
                                  );
                                } else if (canOpenModal) {
                                  return (
                                    <button
                                      key={i}
                                      onClick={() =>
                                        openPdfModal(
                                          infoDoc!.id,
                                          infoDoc!.title,
                                          physicalPage!,
                                          pdfUrl!
                                        )
                                      }
                                      className="block w-full text-left bg-gray-700/30 p-2 rounded hover:bg-indigo-900/30 hover:border-indigo-500/50 border border-transparent transition-all cursor-pointer group"
                                    >
                                      {CardContent}
                                    </button>
                                  );
                                } else {
                                  return (
                                    <li key={i} className="bg-gray-700/30 p-2 rounded">
                                      {CardContent}
                                    </li>
                                  );
                                }
                              })}
                            </ul>
                          </div>
                        )}
                        {summary.complianceNotes && summary.complianceNotes.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-amber-400 mb-1 uppercase flex items-center gap-2">
                              <span>⚠️</span> Compliance Notes
                            </h4>
                            <ul className="text-gray-300 text-xs space-y-2">
                              {summary.complianceNotes.map((note, i) => {
                                // Handle both string and object format
                                const isObject = typeof note === 'object' && note !== null;
                                const noteText = isObject ? (note as { note?: string }).note : note;
                                const reference = isObject
                                  ? (note as { reference?: string }).reference
                                  : null;
                                const title = isObject ? (note as { title?: string }).title : null;
                                const consequence = isObject
                                  ? (note as { consequence?: string }).consequence
                                  : null;
                                const employeeDuty = isObject
                                  ? (note as { employeeDuty?: boolean }).employeeDuty
                                  : false;

                                // Use physicalPage directly if available in data, otherwise derive from reference
                                const directPhysicalPage = isObject
                                  ? (note as { physicalPage?: number }).physicalPage
                                  : null;
                                const documentPage = isObject
                                  ? (note as { documentPage?: number }).documentPage
                                  : null;

                                // Find page number for reference (fallback)
                                const pageOffset =
                                  (summary as { pageOffset?: number }).pageOffset || 0;
                                let pageNum: number | null = null;
                                let physicalPage: number | null = null;

                                if (directPhysicalPage) {
                                  // Use physicalPage directly from data
                                  physicalPage = directPhysicalPage;
                                  pageNum = documentPage || null;
                                } else if (reference) {
                                  // Fallback: derive from reference
                                  pageNum = findPageForSection(
                                    reference,
                                    summary.completeSections || []
                                  );
                                  physicalPage = pageNum ? pageNum + pageOffset : null;
                                }

                                // Determine if TMP document (uses different viewer)
                                const isTmpDoc =
                                  infoDoc?.type === 'traffic-management-plan' ||
                                  infoDoc?.category === 'mrwa-tmp';
                                const viewerUrl =
                                  physicalPage && infoDoc?.id && isTmpDoc
                                    ? `/library/${infoDoc.id}/${physicalPage}`
                                    : null;

                                // Get PDF URL for modal (non-TMP docs)
                                const pdfUrl = infoDoc?.file || infoDoc?.url || null;
                                const canOpenModal =
                                  physicalPage && infoDoc?.id && pdfUrl && !isTmpDoc;

                                const CardContent = (
                                  <>
                                    {title && (
                                      <div className="text-amber-300 text-xs font-medium mb-1">
                                        {title}
                                      </div>
                                    )}
                                    <div className="text-gray-300 flex items-start gap-2">
                                      {employeeDuty && (
                                        <span
                                          className="text-blue-400 shrink-0"
                                          title="Employee Duty"
                                        >
                                          👷
                                        </span>
                                      )}
                                      <span>{noteText}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                      {reference && (
                                        <div
                                          className={`text-[10px] flex items-center gap-1 ${
                                            canOpenModal || viewerUrl
                                              ? 'text-indigo-400 group-hover:text-indigo-300'
                                              : 'text-amber-400'
                                          }`}
                                        >
                                          {reference}
                                          {(canOpenModal || viewerUrl) && (
                                            <span className="text-indigo-400">📄</span>
                                          )}
                                        </div>
                                      )}
                                      {(canOpenModal || viewerUrl) && (
                                        <div className="text-indigo-400 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">
                                          🔗 p.{pageNum || physicalPage}
                                        </div>
                                      )}
                                    </div>
                                    {consequence && (
                                      <div className="text-red-400 text-[10px] mt-1">
                                        ⚠️ {consequence}
                                      </div>
                                    )}
                                  </>
                                );

                                // TMP docs use Link, PDF docs use modal
                                if (viewerUrl) {
                                  return (
                                    <Link
                                      key={i}
                                      href={viewerUrl}
                                      className="block bg-amber-900/20 p-2 rounded border-l-2 border-amber-600 hover:bg-amber-900/40 hover:border-indigo-500 transition-all cursor-pointer group"
                                    >
                                      {CardContent}
                                    </Link>
                                  );
                                } else if (canOpenModal) {
                                  return (
                                    <button
                                      key={i}
                                      onClick={() =>
                                        openPdfModal(
                                          infoDoc!.id,
                                          infoDoc!.title,
                                          physicalPage!,
                                          pdfUrl!
                                        )
                                      }
                                      className="block w-full text-left bg-amber-900/20 p-2 rounded border-l-2 border-amber-600 hover:bg-amber-900/40 hover:border-indigo-500 transition-all cursor-pointer group"
                                    >
                                      {CardContent}
                                    </button>
                                  );
                                } else {
                                  return (
                                    <li
                                      key={i}
                                      className="bg-amber-900/20 p-2 rounded border-l-2 border-amber-600"
                                    >
                                      {CardContent}
                                    </li>
                                  );
                                }
                              })}
                            </ul>
                          </div>
                        )}
                        {summary.targetAudience && summary.targetAudience.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-green-400 mb-1 uppercase flex items-center gap-2">
                              <span>👥</span> Target Audience
                            </h4>
                            <div className="flex flex-wrap gap-1">
                              {summary.targetAudience.map((audience, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-xs border-green-600 text-green-300"
                                >
                                  {audience}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        {summary.crossReferences && summary.crossReferences.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-purple-400 mb-1 uppercase flex items-center gap-2">
                              <span>🔗</span> Related Documents
                            </h4>
                            <ul className="space-y-2">
                              {summary.crossReferences.map((ref, i) => {
                                // Handle both string and object format
                                const isObject = typeof ref === 'object' && ref !== null;
                                const docId = isObject
                                  ? (ref as { documentId?: string }).documentId
                                  : ref;
                                const reason = isObject
                                  ? (ref as { reason?: string }).reason
                                  : null;
                                const relevance = isObject
                                  ? (ref as { relevance?: string }).relevance
                                  : null;

                                return (
                                  <li
                                    key={i}
                                    className="bg-purple-900/20 p-2 rounded border-l-2 border-purple-600"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-purple-300 font-medium">{docId}</span>
                                      {relevance && (
                                        <span className="text-[10px] bg-purple-800/50 px-1.5 py-0.5 rounded text-purple-300 uppercase">
                                          {relevance}
                                        </span>
                                      )}
                                    </div>
                                    {reason && (
                                      <div className="text-gray-400 text-xs mt-1">{reason}</div>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </>
                    )}

                    {/* Phase 3: Diagram Analyses */}
                    {summary.diagramAnalyses && summary.diagramAnalyses.length > 0 && (
                      <div className="space-y-4 pt-3 border-t border-gray-700">
                        <h4 className="text-xs font-semibold text-cyan-400 mb-3 uppercase flex items-center gap-2">
                          <span>🖼️</span> Analyzed TGS Diagrams ({summary.diagramAnalyses.length})
                        </h4>
                        {summary.diagramAnalyses.map((diagram, idx) => (
                          <div key={idx} className="bg-gray-700/30 rounded-lg p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-white">
                                Page {diagram.pageNumber}
                              </span>
                              <div className="flex items-center gap-2">
                                {diagram.diagramType && (
                                  <Badge className="bg-cyan-900/50 text-cyan-300 text-xs">
                                    {diagram.diagramType}
                                  </Badge>
                                )}
                                {diagram.speedZone && (
                                  <Badge className="bg-amber-900/50 text-amber-300 text-xs">
                                    {diagram.speedZone} km/h
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {diagram.setupType && (
                              <p className="text-xs text-gray-300">
                                <span className="text-gray-500">Setup:</span> {diagram.setupType}
                              </p>
                            )}

                            {diagram.description && (
                              <p className="text-xs text-gray-400">{diagram.description}</p>
                            )}

                            {diagram.signs && diagram.signs.length > 0 && (
                              <div>
                                <h5 className="text-xs text-gray-500 mb-1">Signs:</h5>
                                <div className="flex flex-wrap gap-1">
                                  {diagram.signs.map((sign, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="text-xs border-blue-600 text-blue-300"
                                    >
                                      {sign}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}

                            {diagram.trafficControlDevices &&
                              diagram.trafficControlDevices.length > 0 && (
                                <div>
                                  <h5 className="text-xs text-gray-500 mb-1">Traffic Control:</h5>
                                  <div className="flex flex-wrap gap-1">
                                    {diagram.trafficControlDevices.map((device, i) => (
                                      <span
                                        key={i}
                                        className="text-xs bg-gray-600 px-2 py-0.5 rounded text-gray-300"
                                      >
                                        {device}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                            {diagram.measurements && diagram.measurements.length > 0 && (
                              <div>
                                <h5 className="text-xs text-gray-500 mb-1">Measurements:</h5>
                                <div className="grid grid-cols-2 gap-1">
                                  {diagram.measurements.map((m, i) => (
                                    <div key={i} className="text-xs bg-gray-600/50 p-1.5 rounded">
                                      <span className="text-gray-400">{m.label}:</span>{' '}
                                      <span className="text-white">
                                        {m.value}
                                        {m.unit && ` ${m.unit}`}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {diagram.safetyNotes && diagram.safetyNotes.length > 0 && (
                              <div>
                                <h5 className="text-xs text-gray-500 mb-1">Safety Notes:</h5>
                                <ul className="text-xs text-amber-300 space-y-0.5 list-disc list-inside">
                                  {diagram.safetyNotes.map((note, i) => (
                                    <li key={i}>{note}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()
            ) : (
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                {infoDoc?.abstract}
              </p>
            )}
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

      {/* Import Summaries Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-lg">📥 Import Summaries</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Import summaries from a JSON file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <input
                type="file"
                accept=".json"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const text = await file.text();
                    const result = importSummariesFromJson(text);
                    setImportResult(result);

                    if (result.success) {
                      // Reload summaries
                      const updated = await getAllSummaries();
                      setSummaries(updated);
                      setStorageStats(getStorageStats());
                    }
                  } catch (err) {
                    setImportResult({
                      success: false,
                      imported: 0,
                      error: err instanceof Error ? err.message : 'Failed to read file',
                    });
                  }
                }}
                className="block w-full text-sm text-gray-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700"
              />
            </div>

            {importResult && (
              <div
                className={`rounded-lg p-3 ${importResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}
              >
                {importResult.success ? (
                  <p className="text-green-300 text-sm">
                    ✓ Imported {importResult.imported} summaries
                  </p>
                ) : (
                  <p className="text-red-300 text-sm">❌ {importResult.error}</p>
                )}
              </div>
            )}

            <p className="text-gray-500 text-xs">
              Select a JSON file previously exported from this app. Imported summaries will be
              merged with your existing summaries.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-700">
            <Button
              onClick={() => {
                setShowImportDialog(false);
                setImportResult(null);
              }}
              className="w-full bg-gray-600 hover:bg-gray-500 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Modal */}
      {pdfModal && (
        <PdfViewerModal
          isOpen={pdfModal.isOpen}
          onClose={closePdfModal}
          docId={pdfModal.docId}
          docTitle={pdfModal.docTitle}
          initialPage={pdfModal.page}
          pdfUrl={pdfModal.pdfUrl}
        />
      )}
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
