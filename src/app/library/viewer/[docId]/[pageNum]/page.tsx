'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

// Dynamically import react-pdf components with SSR disabled
const Document = dynamic(() => import('react-pdf').then((mod) => mod.Document), { ssr: false });

const Page = dynamic(() => import('react-pdf').then((mod) => mod.Page), { ssr: false });

// Types
interface RegistryDocument {
  id: string;
  title: string;
  shortTitle: string;
  file?: string;
  url?: string;
  pages?: number;
}

interface Registry {
  documents: RegistryDocument[];
}

interface SummarySection {
  sectionNumber: string;
  sectionTitle: string;
  page: number;
}

interface DocumentSummary {
  completeSections?: SummarySection[];
  abstract?: string;
}

export default function PdfViewer() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;
  const pageNum = parseInt(params.pageNum as string, 10) || 1;

  const [registry, setRegistry] = useState<Registry | null>(null);
  const [document, setDocument] = useState<RegistryDocument | null>(null);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [pageInput, setPageInput] = useState(pageNum.toString());
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Configure PDF.js worker on mount
  useEffect(() => {
    setMounted(true);
    import('react-pdf').then((mod) => {
      // Use multiple fallback options for the worker
      const version = mod.pdfjs.version;
      const workerUrls = [
        `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`,
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${version}/pdf.worker.min.js`,
      ];

      // Try the first URL (unpkg)
      mod.pdfjs.GlobalWorkerOptions.workerSrc = workerUrls[0];
    });
  }, []);

  // Load registry and document info
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load registry
        const registryResponse = await fetch('/library/registry.json');
        if (!registryResponse.ok) throw new Error('Failed to load registry');
        const registryData: Registry = await registryResponse.json();
        setRegistry(registryData);

        // Find document
        const doc = registryData.documents.find((d) => d.id === docId);
        if (!doc) throw new Error('Document not found');
        setDocument(doc);

        // Load summary if available
        try {
          const summaryResponse = await fetch(`/library/summaries/${docId}.json`);
          if (summaryResponse.ok) {
            const summaryData = await summaryResponse.json();
            setSummary(summaryData);
          }
        } catch {
          // Summary not available, continue without it
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [docId]);

  // Update page input when pageNum changes
  useEffect(() => {
    setPageInput(pageNum.toString());
  }, [pageNum]);

  // Get PDF URL - handle both local files and external URLs
  const getPdfUrl = (): string | null => {
    if (!document) return null;

    // Local files are served directly
    if (document.file) {
      return document.file;
    }

    // External URLs - these may have CORS issues
    if (document.url) {
      // For external URLs, we need to check if CORS is supported
      // If not, we should open in a new tab instead
      return document.url;
    }

    return null;
  };

  // Get PDF URL
  const pdfUrl = getPdfUrl();

  // Check if PDF is from external source (may have CORS issues)
  const isExternalPdf = pdfUrl?.startsWith('http');

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Navigation
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        router.push(`/library/viewer/${docId}/${page}`);
      }
    },
    [docId, numPages, router]
  );

  const goToPrevPage = useCallback(() => {
    if (pageNum > 1) {
      goToPage(pageNum - 1);
    }
  }, [pageNum, goToPage]);

  const goToNextPage = useCallback(() => {
    if (pageNum < numPages) {
      goToPage(pageNum + 1);
    }
  }, [pageNum, numPages, goToPage]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevPage();
      } else if (e.key === 'ArrowRight') {
        goToNextPage();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevPage, goToNextPage, zoomIn, zoomOut, resetZoom]);

  // Handle page input change
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      goToPage(page);
    } else {
      setPageInput(pageNum.toString());
    }
  };

  // Constrain position to keep image visible
  const constrainPosition = useCallback((newScale: number, x: number, y: number) => {
    if (!containerRef.current || !pageRef.current) return { x, y };

    const container = containerRef.current.getBoundingClientRect();
    const pageRect = pageRef.current.getBoundingClientRect();

    const scaledWidth = pageRect.width * newScale;
    const scaledHeight = pageRect.height * newScale;
    const maxOffsetX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - container.height) / 2);

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    };
  }, []);

  // Touch gestures for zoom and pan
  const touchState = useRef({
    initialDistance: 0,
    initialScale: 1,
    isPanning: false,
    lastX: 0,
    lastY: 0,
  });

  const getTouchDistance = (touches: React.TouchList): number => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        touchState.current.initialDistance = getTouchDistance(e.touches);
        touchState.current.initialScale = scale;
        touchState.current.isPanning = false;
      } else if (e.touches.length === 1 && scale > 1) {
        touchState.current.isPanning = true;
        touchState.current.lastX = e.touches[0].clientX;
        touchState.current.lastY = e.touches[0].clientY;
      }
    },
    [scale]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();

      if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e.touches);
        const initialDistance = touchState.current.initialDistance;

        if (initialDistance > 0) {
          const newScale = Math.max(
            0.5,
            Math.min(3, touchState.current.initialScale * (currentDistance / initialDistance))
          );
          setScale(newScale);
        }
      } else if (e.touches.length === 1 && touchState.current.isPanning && scale > 1) {
        const dx = e.touches[0].clientX - touchState.current.lastX;
        const dy = e.touches[0].clientY - touchState.current.lastY;

        setPosition((prev) => constrainPosition(scale, prev.x + dx, prev.y + dy));

        touchState.current.lastX = e.touches[0].clientX;
        touchState.current.lastY = e.touches[0].clientY;
      }
    },
    [scale, constrainPosition]
  );

  const handleTouchEnd = useCallback(() => {
    touchState.current.isPanning = false;
    touchState.current.initialDistance = 0;
  }, []);

  // Double tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback(
    (e: React.TouchEvent) => {
      const now = Date.now();
      if (now - lastTap.current < 300) {
        if (scale > 1) {
          setScale(1);
          setPosition({ x: 0, y: 0 });
        } else {
          setScale(2);
          const container = containerRef.current?.getBoundingClientRect();
          if (container) {
            const tapX = e.touches[0].clientX - container.left - container.width / 2;
            const tapY = e.touches[0].clientY - container.top - container.height / 2;
            setPosition({ x: -tapX * 0.5, y: -tapY * 0.5 });
          }
        }
      }
      lastTap.current = now;
    },
    [scale]
  );

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.5, Math.min(3, s + delta)));
  }, []);

  // Reset position when page changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [pageNum]);

  if (!mounted || (loading && !document)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error || !document || !pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Document not found'}</p>
          <Link href="/library">
            <Button>Back to Library</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/library">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-9">
                ←
              </Button>
            </Link>

            {/* TOC Drawer */}
            {summary?.completeSections && summary.completeSections.length > 0 && (
              <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white h-9 px-2"
                  >
                    📑
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-gray-800 text-white max-h-[85vh]">
                  <DrawerHeader className="border-b border-gray-700 px-4 pb-2">
                    <DrawerTitle className="text-white">📑 Table of Contents</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-3 overflow-y-auto flex-1 max-h-[60vh]">
                    {summary.completeSections.map((section, idx) => (
                      <Link
                        key={idx}
                        href={`/library/viewer/${docId}/${section.page}`}
                        onClick={() => setIsDrawerOpen(false)}
                        className="flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-700 cursor-pointer"
                      >
                        <span className="font-medium text-sm text-blue-400">
                          {section.sectionNumber}
                        </span>
                        <span className="flex-1 text-gray-300 truncate text-sm">
                          {section.sectionTitle}
                        </span>
                        <span className="text-gray-500 text-sm">p.{section.page}</span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-gray-700 p-3">
                    <DrawerClose asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-gray-700 border-gray-600 h-9"
                      >
                        Close
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerContent>
              </Drawer>
            )}

            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{pageNum}</span>
              <span className="text-gray-400 text-sm">/ {numPages || document.pages || '?'}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Open PDF in new tab button */}
            <Link href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-2 text-gray-400 hover:text-white"
                title="Open PDF in new tab"
              >
                📄
              </Button>
            </Link>
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 bg-gray-700 rounded-lg px-1.5 py-0.5">
              <Button variant="ghost" size="sm" onClick={zoomOut} className="h-7 w-7 p-0 text-lg">
                −
              </Button>
              <span className="text-xs w-9 text-center tabular-nums">
                {Math.round(scale * 100)}%
              </span>
              <Button variant="ghost" size="sm" onClick={zoomIn} className="h-7 w-7 p-0 text-lg">
                +
              </Button>
              <Button variant="ghost" size="sm" onClick={resetZoom} className="h-7 px-1.5 text-xs">
                Reset
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden bg-gray-950 relative"
        style={{ touchAction: 'none' }}
        onTouchStart={(e) => {
          handleTouchStart(e);
          if (e.touches.length === 1) {
            handleDoubleTap(e);
          }
        }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onWheel={handleWheel}
      >
        <div
          ref={pageRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {mounted && pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => {
                console.error('PDF load error:', err);
                if (isExternalPdf) {
                  setError(
                    'Cannot load external PDF due to CORS restrictions. Try opening the PDF directly in a new tab.'
                  );
                } else {
                  setError(`Failed to load PDF: ${err.message}`);
                }
              }}
              loading={
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  <p className="text-gray-400 text-sm">Loading page {pageNum}...</p>
                </div>
              }
              error={
                <div className="text-center py-12">
                  <p className="text-red-400 mb-4">Failed to load PDF</p>
                  {isExternalPdf && (
                    <Link href={pdfUrl} target="_blank" className="text-blue-400 underline">
                      Open PDF in new tab
                    </Link>
                  )}
                </div>
              }
            >
              <Page
                pageNumber={pageNum}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                className="shadow-2xl max-w-full max-h-full object-contain pointer-events-none"
                loading={
                  <div className="flex items-center justify-center w-[600px] h-[800px] bg-gray-800">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-gray-400 text-sm">Rendering page...</p>
                    </div>
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={pageNum <= 1}
            onClick={goToPrevPage}
            className="bg-gray-700 border-gray-600 h-9 w-20"
          >
            ← Prev
          </Button>

          {/* Page input */}
          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              max={numPages || 999}
              value={pageInput}
              onChange={handlePageInputChange}
              className="w-14 text-center bg-gray-700 border-gray-600 h-9"
            />
            <span className="text-gray-400 text-sm">/ {numPages || '?'}</span>
          </form>

          <Button
            variant="outline"
            size="sm"
            disabled={pageNum >= numPages}
            onClick={goToNextPage}
            className="bg-gray-700 border-gray-600 h-9 w-20"
          >
            Next →
          </Button>
        </div>

        {/* Hints */}
        <div className="text-center text-xs text-gray-500 mt-1">
          Pinch to zoom • Double-tap to fit • Arrow keys to navigate
        </div>
      </div>
    </div>
  );
}
