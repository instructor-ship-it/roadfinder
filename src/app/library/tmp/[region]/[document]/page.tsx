'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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

interface TocItem {
  section: string;
  title: string;
  page: number;
  children?: TocItem[];
  isAppendix?: boolean;
  isTgs?: boolean;
}

interface PageData {
  num: number;
  file: string;
  preview: string;
  title: string;
  has_tgs: boolean;
  size_kb: number;
  drawingId?: string;
  drawingTitle?: string;
  category?: string;
  postedSpeed?: string;
  tempSpeed?: string;
  implementation?: string;
}

interface TmpDocument {
  id: string;
  title: string;
  subtitle: string;
  region: string;
  revision: string;
  effective_date: string;
  expiry_date: string;
  pages_total: number;
  tgs_count: number;
}

interface TmpData {
  document: TmpDocument;
  manifest: PageData[];
}

interface TgsEntry {
  id: string;
  title: string;
  page: number;
  postedSpeed?: string;
  tempSpeed?: string;
  implementation?: string;
}

interface TgsCategory {
  category: string;
  categoryName: string;
  entries: TgsEntry[];
}

export default function TmpViewerPage() {
  const params = useParams();
  const region = params.region as string;
  const document = params.document as string;
  
  const [toc, setToc] = useState<TocItem[]>([]);
  const [tmpData, setTmpData] = useState<TmpData | null>(null);
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showToc, setShowToc] = useState(false);
  const [showAllPages, setShowAllPages] = useState(false);
  const [tocSearch, setTocSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [tgsOnly, setTgsOnly] = useState(false);
  const [tgsIndex, setTgsIndex] = useState<TgsCategory[]>([]);

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load TOC
        const tocResponse = await fetch('/library/mrwa/tmp/toc.json');
        if (tocResponse.ok) {
          const tocData = await tocResponse.json();
          setToc(tocData);
        }
        
        // Load catalog
        const catalogResponse = await fetch('/library/mrwa/tmp/catalog.json');
        if (catalogResponse.ok) {
          const catalogData = await catalogResponse.json();
          setTmpData(catalogData);
        }
        
        // Load TGS Index
        const tgsResponse = await fetch('/library/mrwa/tmp/tgs-index.json');
        if (tgsResponse.ok) {
          const tgsData = await tgsResponse.json();
          setTgsIndex(tgsData);
        }
      } catch (error) {
        console.error('Failed to load TMP data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const getPageUrl = (pageNum: number) => {
    return `/library/mrwa/tmp/pages/page-${String(pageNum).padStart(3, '0')}.pdf`;
  };

  const getPreviewUrl = (pageNum: number) => {
    return `/library/mrwa/tmp/preview/page-${String(pageNum).padStart(3, '0')}.webp`;
  };

  const goToPage = (page: number) => {
    const pageCount = tmpData?.manifest.length || 369;
    setSelectedPage(Math.max(1, Math.min(pageCount, page)));
    setShowToc(false); // Close drawer on mobile
  };

  const nextPage = () => {
    const pageCount = tmpData?.manifest.length || 369;
    setSelectedPage(prev => Math.min(pageCount, prev + 1));
  };

  const prevPage = () => {
    setSelectedPage(prev => Math.max(1, prev - 1));
  };

  // Filter TOC by search
  const filteredToc = toc.filter(item => {
    if (!tocSearch.trim()) return true;
    const query = tocSearch.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.section.toLowerCase().includes(query) ||
      item.page.toString().includes(query) ||
      (item.children?.some(child => 
        child.title.toLowerCase().includes(query) ||
        child.section.toLowerCase().includes(query)
      ))
    );
  });

  const renderTocItem = (item: TocItem, depth: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.section);
    
    return (
      <div key={item.section} className="select-none">
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer hover:bg-gray-700/50 transition-colors touch-manipulation ${
            selectedPage === item.page ? 'bg-blue-600/30 text-blue-400' : 'text-gray-300'
          }`}
          style={{ paddingLeft: `${depth * 16 + 12}px` }}
          onClick={() => {
            goToPage(item.page);
            if (hasChildren) {
              toggleSection(item.section);
            }
          }}
        >
          {hasChildren && (
            <span className={`text-xs transition-transform shrink-0 ${isExpanded ? 'rotate-90' : ''}`}>
              ▶
            </span>
          )}
          {!hasChildren && <span className="w-3 shrink-0" />}
          
          <span className="text-xs text-gray-500 shrink-0 font-mono">{item.section}</span>
          <span className="text-sm truncate flex-1">{item.title}</span>
          
          {item.isTgs && (
            <Badge className="bg-green-600 text-xs h-5 shrink-0">TGS</Badge>
          )}
          {item.isAppendix && (
            <Badge className="bg-purple-600 text-xs h-5 shrink-0">App</Badge>
          )}
          
          <span className="text-xs text-gray-500 shrink-0 font-mono">p.{item.page}</span>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="border-l border-gray-700 ml-4">
            {item.children!.map(child => renderTocItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading TMP...</p>
        </div>
      </div>
    );
  }

  const pageCount = tmpData?.manifest.length || 369;
  const currentPageData = tmpData?.manifest[selectedPage - 1];

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header - Fixed */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-20 shrink-0">
        <div className="px-3 py-2 md:px-4 md:py-3">
          {/* Top Row - Navigation */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                  ←
                </Button>
              </Link>
              <Link href="/library/tmp">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                  📋
                </Button>
              </Link>
              <div className="min-w-0 hidden sm:block">
                <h1 className="text-sm font-bold text-blue-400 truncate">{tmpData?.document.title}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2">
              {/* TOC Drawer Trigger */}
              <Drawer open={showToc} onOpenChange={setShowToc}>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-gray-700 border-gray-600 px-3"
                  >
                    📑 <span className="hidden sm:inline ml-1">Contents</span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-gray-800 text-white max-h-[90vh]">
                  <DrawerHeader className="border-b border-gray-700 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <DrawerTitle className="text-white">Table of Contents</DrawerTitle>
                      <Badge variant="outline" className="border-gray-600 text-xs">
                        {tmpData?.document.pages_total} pages
                      </Badge>
                    </div>
                    {/* TOC Search */}
                    <div className="relative mt-3">
                      <Input
                        type="text"
                        placeholder="Search sections..."
                        value={tocSearch}
                        onChange={(e) => setTocSearch(e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full h-10"
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
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs border-gray-600 bg-gray-700 h-8"
                        onClick={() => goToPage(1)}
                      >
                        Cover
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="text-xs border-gray-600 bg-gray-700 h-8"
                        onClick={() => goToPage(8)}
                      >
                        Section 1
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className={`text-xs h-8 ${tgsOnly ? 'border-green-500 bg-green-600 text-white' : 'border-green-700 bg-green-900/30 text-green-400'}`}
                        onClick={() => setTgsOnly(!tgsOnly)}
                      >
                        TGS Only {tgsOnly ? '✓' : ''}
                      </Button>
                    </div>
                  </DrawerHeader>
                  <div className="p-2 overflow-y-auto flex-1 overscroll-contain" style={{ maxHeight: 'calc(90vh - 200px)' }}>
                    {tgsOnly ? (
                      /* TGS Index View */
                      <div className="space-y-3">
                        {tgsIndex.map(cat => (
                          <div key={cat.category}>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 py-1.5 bg-gray-700/50 rounded mb-1">
                              {cat.categoryName} ({cat.category})
                            </div>
                            {cat.entries.map(entry => (
                              <div
                                key={entry.id}
                                className={`flex items-center gap-2 py-2 px-3 rounded cursor-pointer hover:bg-gray-700/50 transition-colors touch-manipulation ${
                                  selectedPage === entry.page ? 'bg-green-600/30 text-green-400' : 'text-gray-300'
                                }`}
                                onClick={() => goToPage(entry.page)}
                              >
                                <span className="text-xs text-green-400 font-mono font-bold shrink-0 w-16">{entry.id}</span>
                                <span className="text-sm truncate flex-1">{entry.title}</span>
                                <span className="text-xs text-gray-500 shrink-0 font-mono">p.{entry.page}</span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Regular TOC View */
                      <>
                        {filteredToc.map(item => renderTocItem(item))}
                        {filteredToc.length === 0 && tocSearch && (
                          <p className="text-gray-400 text-center py-8">No matching sections</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="border-t border-gray-700 p-3 shrink-0">
                    <DrawerClose asChild>
                      <Button variant="outline" className="w-full bg-gray-700 border-gray-600">
                        Close
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerContent>
              </Drawer>
              
              <Button
                variant={showAllPages ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAllPages(!showAllPages)}
                className={`${showAllPages ? "bg-blue-600" : "bg-gray-700 border-gray-600"} px-3`}
              >
                📄 <span className="hidden sm:inline ml-1">Pages</span>
              </Button>
            </div>
          </div>
          
          {/* Document Title - Mobile */}
          <div className="sm:hidden mt-1">
            <h1 className="text-sm font-bold text-blue-400 truncate">{tmpData?.document.title}</h1>
          </div>
          
          {/* Document Info Row */}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 overflow-x-auto pb-1">
            <span className="shrink-0">📍 {tmpData?.document.region}</span>
            <span className="shrink-0">Rev {tmpData?.document.revision}</span>
            <span className="shrink-0">📄 {tmpData?.document.pages_total}p</span>
            <span className="shrink-0">🚧 {tmpData?.document.tgs_count} TGS</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {showAllPages ? (
          /* All Pages Grid View */
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {tmpData?.manifest.map((page) => (
                <button
                  key={page.num}
                  onClick={() => {
                    setSelectedPage(page.num);
                    setShowAllPages(false);
                  }}
                  className={`rounded-lg overflow-hidden border-2 transition-all hover:border-blue-500 text-left ${
                    page.has_tgs ? 'border-green-600/50' : 'border-gray-700'
                  } ${selectedPage === page.num ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div className="aspect-[3/4] bg-gray-800 relative">
                    <img
                      src={getPreviewUrl(page.num)}
                      alt={`Page ${page.num}`}
                      className="w-full h-full object-contain"
                      loading="lazy"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/80 px-2 py-1.5">
                      {page.drawingId ? (
                        <>
                          <div className="text-xs text-green-400 font-mono font-bold truncate">{page.drawingId}</div>
                          <div className="text-xs text-white truncate">{page.drawingTitle}</div>
                        </>
                      ) : (
                        <div className="text-xs text-white truncate font-medium">{page.title}</div>
                      )}
                      <div className="text-xs text-gray-400">Page {page.num}</div>
                    </div>
                    {page.has_tgs && page.drawingId && (
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-green-600 text-xs h-5 font-mono">{page.drawingId}</Badge>
                      </div>
                    )}
                    {page.has_tgs && !page.drawingId && (
                      <div className="absolute top-1 right-1">
                        <Badge className="bg-green-600 text-xs h-5">TGS</Badge>
                      </div>
                    )}
                    <div className="absolute top-1 left-1 bg-black/70 rounded px-1.5 py-0.5 text-xs font-bold">
                      {page.num}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Single Page View */
          <>
            {/* Page Display - Flexible Height */}
            <div className="flex-1 flex flex-col items-center justify-center p-3 md:p-4 min-h-0">
              <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl w-full max-w-2xl">
                {/* Page Title Bar */}
                <div className="p-2 bg-gray-700 border-b border-gray-600">
                  <div className="flex items-center justify-between gap-2">
                    {currentPageData?.drawingId ? (
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-green-400 font-mono font-bold">{currentPageData.drawingId}</div>
                        <div className="text-sm text-white truncate">{currentPageData.drawingTitle}</div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300 truncate flex-1">
                        {currentPageData?.title || `Page ${selectedPage}`}
                      </span>
                    )}
                    {currentPageData?.has_tgs && currentPageData.drawingId && (
                      <Badge className="bg-green-600 text-xs shrink-0 font-mono">{currentPageData.drawingId}</Badge>
                    )}
                    {currentPageData?.has_tgs && !currentPageData?.drawingId && (
                      <Badge className="bg-green-600 text-xs shrink-0">TGS</Badge>
                    )}
                  </div>
                  {/* TGS Metadata Row */}
                  {currentPageData?.drawingId && (
                    <div className="flex flex-wrap gap-2 mt-1.5 text-xs">
                      {currentPageData.postedSpeed && (
                        <span className="text-gray-400">Posted: <span className="text-white">{currentPageData.postedSpeed}</span></span>
                      )}
                      {currentPageData.tempSpeed && (
                        <span className="text-gray-400">Temp: <span className="text-yellow-400">{currentPageData.tempSpeed}</span></span>
                      )}
                      {currentPageData.implementation && (
                        <span className="text-gray-400">Impl: <span className="text-blue-400">{currentPageData.implementation}</span></span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Page Image */}
                <div className="aspect-[3/4] bg-white">
                  <img
                    src={getPreviewUrl(selectedPage)}
                    alt={`Page ${selectedPage}`}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Navigation Bar - Fixed on Mobile */}
            <div className="bg-gray-800 border-t border-gray-700 p-3 shrink-0">
              <div className="flex items-center justify-between gap-2 max-w-lg mx-auto">
                {/* Previous Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={selectedPage <= 1}
                  className="bg-gray-700 border-gray-600 px-4 h-10"
                >
                  ← Prev
                </Button>
                
                {/* Page Input */}
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max={pageCount}
                    value={selectedPage}
                    onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                    className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-2 text-sm text-center font-mono"
                  />
                  <span className="text-sm text-gray-400">/ {pageCount}</span>
                </div>
                
                {/* Next Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={selectedPage >= pageCount}
                  className="bg-gray-700 border-gray-600 px-4 h-10"
                >
                  Next →
                </Button>
              </div>
              
              {/* Open PDF Link */}
              <div className="text-center mt-2">
                <Link
                  href={getPageUrl(selectedPage)}
                  target="_blank"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Open Full PDF ↗
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
