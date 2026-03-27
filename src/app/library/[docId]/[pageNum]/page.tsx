'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';

// Types
interface CatalogData {
  document: {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    subcategory: string;
    region: string;
    pages_total: number;
  };
  manifest: Array<{
    num: number;
    file: string;
    preview: string;
    title: string;
    has_tgs: boolean;
    size_kb: number;
  }>;
}

interface TocEntry {
  section: string;
  title: string;
  page: number;
  isAppendix?: boolean;
  isTgs?: boolean;
  children?: TocEntry[];
}

interface TgsEntry {
  id: string;
  title: string;
  page: number;
  postedSpeed?: string;
  tempSpeed?: string;
  implementation: string;
}

interface TgsCategory {
  category: string;
  categoryName: string;
  entries: TgsEntry[];
}

type DrawerTab = 'toc' | 'tgs';

export default function PageViewer() {
  const params = useParams();
  const docId = params.docId as string;
  const pageNum = parseInt(params.pageNum as string, 10);

  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [tgsIndex, setTgsIndex] = useState<TgsCategory[]>([]);
  const [tocSearch, setTocSearch] = useState('');
  const [tgsSearch, setTgsSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<DrawerTab>('toc');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedImplementation, setSelectedImplementation] = useState<string>('all');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  
  // Touch state refs
  const touchState = useRef({
    initialDistance: 0,
    initialScale: 1,
    isPanning: false,
    lastX: 0,
    lastY: 0,
  });

  // Load catalog and TOC
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/library/mrwa/tmp/catalog.json');
        if (!response.ok) throw new Error('Failed to load catalog');
        const data = await response.json();
        setCatalog(data);

        // Load TOC
        const tocResponse = await fetch('/library/mrwa/tmp/toc.json');
        if (tocResponse.ok) {
          const tocData = await tocResponse.json();
          setToc(tocData);
        }

        // Load TGS Index
        const tgsResponse = await fetch('/library/mrwa/tmp/tgs-index.json');
        if (tgsResponse.ok) {
          const tgsData = await tgsResponse.json();
          setTgsIndex(tgsData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Reset zoom when page changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [pageNum]);

  // Get current page info
  const currentPage = catalog?.manifest.find((p) => p.num === pageNum);
  const totalPages = catalog?.document.pages_total || 0;
  const hasPrev = pageNum > 1;
  const hasNext = pageNum < totalPages;
  const hasTgs = currentPage?.has_tgs || false;

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale((s) => Math.min(s + 0.25, 5));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((s) => Math.max(s - 0.25, 0.5));
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Constrain position to keep image visible
  const constrainPosition = useCallback((newScale: number, x: number, y: number) => {
    if (!containerRef.current || !imageRef.current) return { x, y };
    
    const container = containerRef.current.getBoundingClientRect();
    const imgRect = imageRef.current.getBoundingClientRect();
    
    const scaledWidth = imgRect.width * newScale;
    const scaledHeight = imgRect.height * newScale;
    const maxOffsetX = Math.max(0, (scaledWidth - container.width) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - container.height) / 2);
    
    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    };
  }, []);

  // Get touch distance
  const getTouchDistance = (touches: React.TouchList): number => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      touchState.current.initialDistance = getTouchDistance(e.touches);
      touchState.current.initialScale = scale;
      touchState.current.isPanning = false;
    } else if (e.touches.length === 1 && scale > 1) {
      touchState.current.isPanning = true;
      touchState.current.lastX = e.touches[0].clientX;
      touchState.current.lastY = e.touches[0].clientY;
    }
  }, [scale]);

  // Handle touch move
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 2) {
      const currentDistance = getTouchDistance(e.touches);
      const initialDistance = touchState.current.initialDistance;
      
      if (initialDistance > 0) {
        const newScale = Math.max(0.5, Math.min(5, 
          touchState.current.initialScale * (currentDistance / initialDistance)
        ));
        
        setScale(newScale);
      }
    } else if (e.touches.length === 1 && touchState.current.isPanning && scale > 1) {
      const dx = e.touches[0].clientX - touchState.current.lastX;
      const dy = e.touches[0].clientY - touchState.current.lastY;
      
      setPosition(prev => constrainPosition(scale, prev.x + dx, prev.y + dy));
      
      touchState.current.lastX = e.touches[0].clientX;
      touchState.current.lastY = e.touches[0].clientY;
    }
  }, [scale, constrainPosition]);

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    touchState.current.isPanning = false;
    touchState.current.initialDistance = 0;
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((s) => Math.max(0.5, Math.min(5, s + delta)));
  }, []);

  // Print handler - opens PDF in new tab
  const handlePrint = useCallback(() => {
    if (currentPage) {
      window.open(`/library/mrwa/tmp/${currentPage.file}`, '_blank');
    }
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrev) {
        window.location.href = `/library/${docId}/${pageNum - 1}`;
      } else if (e.key === 'ArrowRight' && hasNext) {
        window.location.href = `/library/${docId}/${pageNum + 1}`;
      } else if (e.key === 'Escape') {
        window.location.href = `/library/${docId}`;
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      } else if (e.key === 'p' || e.key === 'P') {
        handlePrint();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [docId, pageNum, hasPrev, hasNext, zoomIn, zoomOut, resetZoom, handlePrint]);

  // Double tap to zoom
  const lastTap = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (scale > 1) {
        resetZoom();
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
  }, [scale, resetZoom]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // Filter TOC by search
  const filteredToc = toc.filter((entry) => {
    if (!tocSearch.trim()) return true;
    const query = tocSearch.toLowerCase();
    const titleMatch = entry.title.toLowerCase().includes(query);
    const sectionMatch = entry.section.toLowerCase().includes(query);
    const pageMatch = entry.page.toString().includes(query);
    const childMatch = entry.children?.some((c) => 
      c.title.toLowerCase().includes(query) || 
      c.section.toLowerCase().includes(query)
    );
    return titleMatch || sectionMatch || pageMatch || childMatch;
  });

  // Get unique implementations for filter
  const implementations = ['all', ...new Set(tgsIndex.flatMap(cat => cat.entries.map(e => e.implementation)))];
  
  // Filter TGS entries
  const filteredTgsCategories = tgsIndex.map(category => ({
    ...category,
    entries: category.entries.filter(entry => {
      const matchesSearch = !tgsSearch.trim() || 
        entry.id.toLowerCase().includes(tgsSearch.toLowerCase()) ||
        entry.title.toLowerCase().includes(tgsSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || category.category === selectedCategory;
      const matchesImpl = selectedImplementation === 'all' || entry.implementation === selectedImplementation;
      return matchesSearch && matchesCategory && matchesImpl;
    })
  })).filter(category => category.entries.length > 0);

  // Render TOC entry
  const renderTocEntry = (entry: TocEntry, depth = 0) => {
    const hasChildren = entry.children && entry.children.length > 0;
    const isExpanded = expandedSections.has(entry.section);
    
    return (
      <div key={entry.section}>
        <div
          className={`flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-700 cursor-pointer group`}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleSection(entry.section)}
              className="text-gray-500 hover:text-white w-5 h-5 flex items-center justify-center"
            >
              <span className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
            </button>
          )}
          {!hasChildren && <span className="w-5" />}
          
          <Link
            href={`/library/${docId}/${entry.page}`}
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => setIsDrawerOpen(false)}
          >
            <span className={`font-medium text-xs ${entry.isTgs ? 'text-green-400' : entry.isAppendix ? 'text-purple-400' : 'text-blue-400'}`}>
              {entry.section}
            </span>
            <span className="text-gray-300 truncate text-xs">{entry.title}</span>
          </Link>
          
          <Link
            href={`/library/${docId}/${entry.page}`}
            className="text-gray-500 text-xs hover:text-white group-hover:text-gray-300"
            onClick={() => setIsDrawerOpen(false)}
          >
            p.{entry.page}
          </Link>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {entry.children!.map((child) => renderTocEntry(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Render TGS entry
  const renderTgsEntry = (entry: TgsEntry) => {
    const implColor = {
      'Independent Works Crew': 'text-green-400',
      'TMI with BWTM': 'text-blue-400',
      'TMI with 3 Months Experience': 'text-yellow-400',
      'Additional Planning & Approvals': 'text-red-400',
      'Emergency Only': 'text-orange-400',
      'Guide': 'text-gray-400',
    }[entry.implementation] || 'text-gray-400';

    return (
      <Link
        key={entry.id}
        href={`/library/${docId}/${entry.page}`}
        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-700 cursor-pointer group"
        onClick={() => setIsDrawerOpen(false)}
      >
        <span className="font-mono font-bold text-xs text-cyan-400 w-16 flex-shrink-0">
          {entry.id}
        </span>
        <span className="flex-1 text-gray-300 truncate text-xs">{entry.title}</span>
        <span className="text-gray-500 text-xs group-hover:text-gray-300">p.{entry.page}</span>
      </Link>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !currentPage) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Page not found'}</p>
          <Link href={`/library/${docId}`}>
            <Button>Back to Document</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col touch-none select-none overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href={`/library/${docId}`}>
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-9">
                ←
              </Button>
            </Link>
            
            {/* TOC/TGS Drawer */}
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white h-9 px-2">
                  📑
                </Button>
              </DrawerTrigger>
              <DrawerContent className="bg-gray-800 text-white max-h-[85vh]">
                <DrawerHeader className="border-b border-gray-700 px-4 pb-2">
                  <DrawerTitle className="text-white">
                    {/* Tab Buttons */}
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setActiveTab('toc')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          activeTab === 'toc' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        📑 TOC
                      </button>
                      <button
                        onClick={() => setActiveTab('tgs')}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          activeTab === 'tgs' 
                            ? 'bg-cyan-600 text-white' 
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        🚧 TGS ({tgsIndex.reduce((sum, c) => sum + c.entries.length, 0)})
                      </button>
                    </div>
                  </DrawerTitle>
                </DrawerHeader>
                
                {/* TOC Tab Content */}
                {activeTab === 'toc' && (
                  <div className="p-3 overflow-y-auto flex-1">
                    {/* TOC Search */}
                    <div className="relative mb-3">
                      <Input
                        type="text"
                        placeholder="Search sections..."
                        value={tocSearch}
                        onChange={(e) => setTocSearch(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full h-9 text-sm"
                      />
                      {tocSearch && (
                        <button
                          onClick={() => setTocSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    {/* Quick Links */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Link href={`/library/${docId}/1`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-gray-600 bg-gray-700">
                          Cover
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/8`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-gray-600 bg-gray-700">
                          Section 1
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/139`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-green-700 bg-green-900/30 text-green-400">
                          TGS Diagrams
                        </Button>
                      </Link>
                    </div>
                    
                    {/* TOC Entries */}
                    <div className="space-y-0.5 max-h-[50vh] overflow-y-auto">
                      {filteredToc.map((entry) => renderTocEntry(entry))}
                    </div>
                    
                    {filteredToc.length === 0 && tocSearch && (
                      <p className="text-gray-400 text-center py-4 text-sm">No matching sections</p>
                    )}
                  </div>
                )}
                
                {/* TGS Tab Content */}
                {activeTab === 'tgs' && (
                  <div className="p-3 overflow-y-auto flex-1">
                    {/* TGS Search */}
                    <div className="relative mb-2">
                      <Input
                        type="text"
                        placeholder="Search TGS (e.g., LC-002, lane closure)..."
                        value={tgsSearch}
                        onChange={(e) => setTgsSearch(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full h-9 text-sm"
                      />
                      {tgsSearch && (
                        <button
                          onClick={() => setTgsSearch('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    
                    {/* Filters */}
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="all">All Categories</option>
                        {tgsIndex.map(cat => (
                          <option key={cat.category} value={cat.category}>{cat.categoryName}</option>
                        ))}
                      </select>
                      
                      <select
                        value={selectedImplementation}
                        onChange={(e) => setSelectedImplementation(e.target.value)}
                        className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white"
                      >
                        <option value="all">All Implementations</option>
                        {implementations.filter(i => i !== 'all').map(impl => (
                          <option key={impl} value={impl}>{impl}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Quick Category Links */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      <Link href={`/library/${docId}/139`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-cyan-700 bg-cyan-900/30 text-cyan-400">
                          📋 TGS Index
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/182`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-gray-600 bg-gray-700">
                          AC
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/196`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-gray-600 bg-gray-700">
                          LC
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/215`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-gray-600 bg-gray-700">
                          LS
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/272`} onClick={() => setIsDrawerOpen(false)}>
                        <Button size="sm" variant="outline" className="text-xs h-7 border-gray-600 bg-gray-700">
                          RF
                        </Button>
                      </Link>
                    </div>
                    
                    {/* TGS Entries by Category */}
                    <div className="space-y-3 max-h-[45vh] overflow-y-auto">
                      {filteredTgsCategories.map(category => (
                        <div key={category.category}>
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 px-2">
                            {category.categoryName} ({category.entries.length})
                          </div>
                          <div className="space-y-0.5">
                            {category.entries.map(renderTgsEntry)}
                          </div>
                        </div>
                      ))}
                      
                      {filteredTgsCategories.length === 0 && (
                        <p className="text-gray-400 text-center py-4 text-sm">No matching TGS entries</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="border-t border-gray-700 p-3">
                  <DrawerClose asChild>
                    <Button variant="outline" size="sm" className="w-full bg-gray-700 border-gray-600 h-9">
                      Close
                    </Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
            
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">{pageNum}</span>
              <span className="text-gray-400 text-sm">/ {totalPages}</span>
              {hasTgs && (
                <Badge className="bg-green-600 text-xs h-5">TGS</Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 bg-gray-700 rounded-lg px-1.5 py-0.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomOut}
                className="h-7 w-7 p-0 text-lg"
              >
                −
              </Button>
              <span className="text-xs w-9 text-center tabular-nums">{Math.round(scale * 100)}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={zoomIn}
                className="h-7 w-7 p-0 text-lg"
              >
                +
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetZoom}
                className="h-7 px-1.5 text-xs"
              >
                Reset
              </Button>
            </div>
            {/* Print button */}
            <Button
              onClick={handlePrint}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 h-9 px-2"
            >
              🖨️
            </Button>
          </div>
        </div>
      </div>

      {/* Image Viewer */}
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
          ref={imageRef}
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: 'transform 0.1s ease-out',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/library/mrwa/tmp/${currentPage.preview}`}
            alt={`Page ${pageNum}`}
            className="max-w-full max-h-full object-contain pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex-shrink-0 z-10">
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => (window.location.href = `/library/${docId}/${pageNum - 1}`)}
            className="bg-gray-700 border-gray-600 h-9 w-20"
          >
            ← Prev
          </Button>
          
          {/* Page input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={pageNum}
              onChange={(e) => {
                const newPage = parseInt(e.target.value, 10);
                if (newPage >= 1 && newPage <= totalPages) {
                  window.location.href = `/library/${docId}/${newPage}`;
                }
              }}
              className="w-12 text-center bg-gray-700 border border-gray-600 rounded px-1 py-1.5 text-sm"
            />
            <span className="text-gray-400 text-sm">/ {totalPages}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => (window.location.href = `/library/${docId}/${pageNum + 1}`)}
            className="bg-gray-700 border-gray-600 h-9 w-20"
          >
            Next →
          </Button>
        </div>
        
        {/* Hints */}
        <div className="text-center text-xs text-gray-500 mt-1">
          Pinch to zoom • Double-tap to fit • 📑 TOC/TGS
        </div>
      </div>
    </div>
  );
}
