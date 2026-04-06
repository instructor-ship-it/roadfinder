'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
interface SummarySection {
  sectionNumber: string;
  sectionTitle: string;
  page: number;
}

interface DocumentSummary {
  completeSections?: SummarySection[];
  pageOffset?: number;
}

interface PdfViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  docId: string;
  docTitle: string;
  initialPage?: number;
  pdfUrl: string;
}

export function PdfViewerModal({
  isOpen,
  onClose,
  docId,
  docTitle,
  initialPage = 1,
  pdfUrl,
}: PdfViewerModalProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [containerHeight, setContainerHeight] = useState<number>(0);
  const [pageWidth, setPageWidth] = useState<number>(0);
  const [pageHeight, setPageHeight] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState(initialPage.toString());
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [isLandscape, setIsLandscape] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  // Configure PDF.js worker on mount
  useEffect(() => {
    setMounted(true);
    import('react-pdf').then((mod) => {
      const version = mod.pdfjs.version;
      mod.pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
    });
  }, []);

  // Update container dimensions on resize
  useEffect(() => {
    if (!isOpen) return;

    const updateDimensions = () => {
      // Prefer container dimensions, fallback to window
      const width = containerRef.current?.clientWidth || window.innerWidth;
      const height = containerRef.current?.clientHeight || window.innerHeight;
      setContainerWidth(width);
      setContainerHeight(height);
      // Detect landscape mode (width > height)
      setIsLandscape(window.innerWidth > window.innerHeight);
    };

    // Initial measurement with delay to ensure modal is rendered
    const timer = setTimeout(updateDimensions, 100);

    // Listen for resize (handles orientation change)
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    window.addEventListener('resize', updateDimensions);

    return () => {
      clearTimeout(timer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, [isOpen]);

  // Load summary when docId changes
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await fetch(`/library/summaries/${docId}.json`);
        if (response.ok) {
          const data = await response.json();
          setSummary(data);
        }
      } catch {
        // Summary not available
      }
    };
    if (docId) loadSummary();
  }, [docId]);

  // Reset when opening with new page
  useEffect(() => {
    if (isOpen && initialPage) {
      setCurrentPage(initialPage);
      setPageInput(initialPage.toString());
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen, initialPage]);

  // Update page input when currentPage changes
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // Handle document load success
  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setLoading(false);
  };

  // Handle page load success - get natural dimensions
  const onPageLoadSuccess = (page: { originalWidth: number; originalHeight: number }) => {
    setPageWidth(page.originalWidth);
    setPageHeight(page.originalHeight);
  };

  // Calculate optimal display width to fit in container
  const getDisplayWidth = useCallback(() => {
    if (!containerWidth || !containerHeight || !pageWidth || !pageHeight) {
      return containerWidth || undefined;
    }

    // Calculate scale needed to fit width
    const widthScale = containerWidth / pageWidth;
    // Calculate scale needed to fit height
    const heightScale = containerHeight / pageHeight;

    // Use the smaller scale (fits within both constraints)
    const fitScale = Math.min(widthScale, heightScale);

    // Return the width at this scale
    return pageWidth * fitScale;
  }, [containerWidth, containerHeight, pageWidth, pageHeight]);

  // Navigation
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= numPages) {
        setCurrentPage(page);
      }
    },
    [numPages]
  );

  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);

  const goToNextPage = useCallback(() => {
    if (currentPage < numPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, numPages, goToPage]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle page input
  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput, 10);
    if (!isNaN(page) && page >= 1 && page <= numPages) {
      goToPage(page);
    } else {
      setPageInput(currentPage.toString());
    }
  };

  // Constrain position
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

  // Touch gestures
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
  }, [currentPage]);

  // Keyboard navigation (only when modal is open)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
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
  }, [isOpen, onClose, goToPrevPage, goToNextPage, zoomIn, zoomOut, resetZoom]);

  if (!mounted) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-gray-900 border-gray-700 text-white p-0 overflow-hidden flex flex-col rounded-none"
        style={
          {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: isLandscape ? '95vh' : '100vh',
            maxWidth: '100vw',
            maxHeight: isLandscape ? '95vh' : '100vh',
            '--tw-translate-x': '0px',
            '--tw-translate-y': '0px',
          } as React.CSSProperties
        }
      >
        {/* Header */}
        <DialogHeader className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                      {summary.pageOffset && summary.pageOffset > 0 && (
                        <p className="text-xs text-amber-400 mt-1">
                          ⚠️ Document pages start at physical page {summary.pageOffset + 1}
                        </p>
                      )}
                    </DrawerHeader>
                    <div className="p-3 overflow-y-auto flex-1 max-h-[60vh]">
                      {summary.completeSections.map((section, idx) => {
                        const physicalPage =
                          typeof section.page === 'number'
                            ? section.page + (summary.pageOffset || 0)
                            : section.page;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              if (typeof physicalPage === 'number') {
                                goToPage(physicalPage);
                                setIsDrawerOpen(false);
                              }
                            }}
                            className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-gray-700 cursor-pointer text-left"
                          >
                            <span className="font-medium text-sm text-blue-400">
                              {section.sectionNumber}
                            </span>
                            <span className="flex-1 text-gray-300 truncate text-sm">
                              {section.sectionTitle}
                            </span>
                            <span className="text-gray-500 text-sm">p.{section.page}</span>
                          </button>
                        );
                      })}
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

              <DialogTitle className="text-white text-sm font-medium truncate max-w-[200px] md:max-w-[400px]">
                {docTitle}
              </DialogTitle>
            </div>

            {/* Center - Navigation for landscape */}
            {isLandscape && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={goToPrevPage}
                  className="bg-gray-700 border-gray-600 h-8 w-16 text-xs"
                >
                  ← Prev
                </Button>

                <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={1}
                    max={numPages || 999}
                    value={pageInput}
                    onChange={handlePageInputChange}
                    className="w-12 text-center bg-gray-700 border-gray-600 h-8 text-sm"
                  />
                  <span className="text-gray-400 text-xs">/ {numPages || '?'}</span>
                </form>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= numPages}
                  onClick={goToNextPage}
                  className="bg-gray-700 border-gray-600 h-8 w-16 text-xs"
                >
                  Next →
                </Button>
              </div>
            )}

            <div className="flex items-center gap-1 mr-8">
              {/* Zoom controls */}
              <div className="flex items-center gap-0.5 bg-gray-700 rounded px-1 py-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomOut}
                  className="h-6 w-6 p-0 text-base"
                >
                  −
                </Button>
                <span className="text-xs w-8 text-center tabular-nums">
                  {Math.round(scale * 100)}%
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={zoomIn}
                  className="h-6 w-6 p-0 text-base"
                >
                  +
                </Button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* PDF Viewer */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden bg-gray-950 relative min-h-[400px]"
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
                  setError(`Failed to load PDF: ${err.message}`);
                }}
                loading={
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="text-gray-400 text-sm">Loading page {currentPage}...</p>
                  </div>
                }
              >
                <Page
                  key={`page-${currentPage}-${containerWidth}-${containerHeight}`}
                  pageNumber={currentPage}
                  width={getDisplayWidth()}
                  onLoadSuccess={onPageLoadSuccess}
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

          {/* Error state */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <div className="text-center p-4">
                <p className="text-red-400 mb-4">{error}</p>
                <Button onClick={() => setError(null)}>Retry</Button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer - hidden in landscape */}
        {!isLandscape && (
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex-shrink-0">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
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
                disabled={currentPage >= numPages}
                onClick={goToNextPage}
                className="bg-gray-700 border-gray-600 h-9 w-20"
              >
                Next →
              </Button>
            </div>

            {/* Hints */}
            <div className="text-center text-xs text-gray-500 mt-1">
              Pinch to zoom • Double-tap to fit • Arrow keys to navigate • ESC to close
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
