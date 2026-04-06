'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

// Types
interface CatalogData {
  document: {
    id: string;
    title: string;
    subtitle: string;
    category: string;
    subcategory: string;
    author: string;
    authority: string;
    region: string;
    effective_date: string;
    expiry_date: string;
    revision: string;
    tags: string[];
    pages_total: number;
    tgs_count: number;
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

interface SearchIndexItem {
  n: number; // page number
  t: string; // title
  s: string; // snippet
  g: boolean; // has TGS
}

interface TocEntry {
  section: string;
  title: string;
  page: number;
  isAppendix?: boolean;
  isTgs?: boolean;
  children?: TocEntry[];
}

export default function DocumentViewerPage() {
  const params = useParams();
  const docId = params.docId as string;

  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [searchIndex, setSearchIndex] = useState<SearchIndexItem[]>([]);
  const [toc, setToc] = useState<TocEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [tocSearch, setTocSearch] = useState('');
  const [showTgsOnly, setShowTgsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [isTocDrawerOpen, setIsTocDrawerOpen] = useState(false);
  const [viewerPath, setViewerPath] = useState<string | null>(null);

  // Determine viewer path and load catalog
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try different viewer paths in order
        const possiblePaths = [
          `/library/viewer/${docId}`, // Universal viewer path
          `/library/mrwa/tmp`, // Legacy TMP path (for backward compatibility)
        ];

        let foundPath: string | null = null;
        let catalogData: CatalogData | null = null;

        for (const basePath of possiblePaths) {
          try {
            const response = await fetch(`${basePath}/catalog.json`);
            if (response.ok) {
              catalogData = await response.json();
              foundPath = basePath;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!catalogData || !foundPath) {
          throw new Error('Document viewer not available for this document');
        }

        setViewerPath(foundPath);
        setCatalog(catalogData);

        // Load search index
        const indexResponse = await fetch(`${foundPath}/index.json`);
        if (indexResponse.ok) {
          const indexData = await indexResponse.json();
          setSearchIndex(indexData);
        }

        // Load TOC
        const tocResponse = await fetch(`${foundPath}/toc.json`);
        if (tocResponse.ok) {
          const tocData = await tocResponse.json();
          setToc(tocData);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [docId]);

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

  // Filter pages based on search query and TGS filter
  const filteredPages = useMemo(() => {
    let pages = searchIndex;

    // Filter by TGS only
    if (showTgsOnly) {
      pages = pages.filter((item) => item.g);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      pages = pages.filter(
        (item) =>
          item.t.toLowerCase().includes(query) ||
          item.s.toLowerCase().includes(query) ||
          `page ${item.n}`.includes(query)
      );
    }

    return pages;
  }, [searchQuery, searchIndex, showTgsOnly]);

  // Filter TOC by search
  const filteredToc = useMemo(() => {
    if (!tocSearch.trim()) return toc;

    const query = tocSearch.toLowerCase();

    const filterEntries = (entries: TocEntry[]): TocEntry[] => {
      return entries.reduce((acc: TocEntry[], entry) => {
        const titleMatch = entry.title.toLowerCase().includes(query);
        const sectionMatch = entry.section.toLowerCase().includes(query);
        const pageMatch = entry.page.toString().includes(query);

        let filteredChildren: TocEntry[] = [];
        if (entry.children) {
          filteredChildren = filterEntries(entry.children);
        }

        if (titleMatch || sectionMatch || pageMatch || filteredChildren.length > 0) {
          acc.push({
            ...entry,
            children: filteredChildren.length > 0 ? filteredChildren : entry.children,
          });
        }

        return acc;
      }, []);
    };

    return filterEntries(toc);
  }, [toc, tocSearch]);

  // Get TGS page count
  const tgsCount = useMemo(() => {
    return searchIndex.filter((item) => item.g).length;
  }, [searchIndex]);

  // Render TOC entry
  const renderTocEntry = (entry: TocEntry, depth = 0) => {
    const hasChildren = entry.children && entry.children.length > 0;
    const isExpanded = expandedSections.has(entry.section);

    return (
      <div key={entry.section}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded hover:bg-gray-700 cursor-pointer group touch-manipulation`}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={() => toggleSection(entry.section)}
              className="text-gray-500 hover:text-white w-6 h-6 flex items-center justify-center shrink-0"
            >
              <span className={`transition-transform text-sm ${isExpanded ? 'rotate-90' : ''}`}>
                ›
              </span>
            </button>
          )}
          {!hasChildren && <span className="w-6 shrink-0" />}

          <Link
            href={`/library/${docId}/${entry.page}`}
            className="flex-1 flex items-center gap-2 min-w-0"
            onClick={() => setIsTocDrawerOpen(false)}
          >
            <span
              className={`font-medium text-sm ${entry.isTgs ? 'text-green-400' : entry.isAppendix ? 'text-purple-400' : 'text-blue-400'}`}
            >
              {entry.section}
            </span>
            <span className="text-gray-300 truncate text-sm">{entry.title}</span>
          </Link>

          <Link
            href={`/library/${docId}/${entry.page}`}
            className="text-gray-500 text-xs hover:text-white group-hover:text-gray-300 shrink-0"
            onClick={() => setIsTocDrawerOpen(false)}
          >
            p.{entry.page}
          </Link>
        </div>

        {hasChildren && isExpanded && (
          <div>{entry.children!.map((child) => renderTocEntry(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading document...</p>
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
      {/* Header - Sticky */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="px-3 py-3 md:px-4 md:py-4">
          {/* Top Row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link href="/library" className="shrink-0">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white px-2">
                  ←
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base md:text-lg font-bold truncate">
                  {catalog?.document.title}
                </h1>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-blue-400">{catalog?.document.category}</span>
                  <span>→</span>
                  <span className="text-green-400">{catalog?.document.subcategory}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* TOC Drawer */}
              <Drawer open={isTocDrawerOpen} onOpenChange={setIsTocDrawerOpen}>
                <DrawerTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-gray-700 border-gray-600 px-3">
                    📑 <span className="hidden sm:inline ml-1">Contents</span>
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="bg-gray-800 text-white max-h-[90vh]">
                  <DrawerHeader className="border-b border-gray-700 px-4 py-3">
                    <DrawerTitle className="text-white">Table of Contents</DrawerTitle>
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
                      <Link href={`/library/${docId}/1`} onClick={() => setIsTocDrawerOpen(false)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 border-gray-600 bg-gray-700"
                        >
                          Cover
                        </Button>
                      </Link>
                      <Link href={`/library/${docId}/8`} onClick={() => setIsTocDrawerOpen(false)}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 border-gray-600 bg-gray-700"
                        >
                          Section 1
                        </Button>
                      </Link>
                      <Link
                        href={`/library/${docId}/139`}
                        onClick={() => setIsTocDrawerOpen(false)}
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8 border-green-700 bg-green-900/30 text-green-400"
                        >
                          TGS Diagrams
                        </Button>
                      </Link>
                    </div>
                  </DrawerHeader>
                  <div
                    className="p-3 overflow-y-auto flex-1 overscroll-contain"
                    style={{ maxHeight: 'calc(90vh - 200px)' }}
                  >
                    {filteredToc.map((entry) => renderTocEntry(entry))}
                    {filteredToc.length === 0 && tocSearch && (
                      <p className="text-gray-400 text-center py-8">No matching sections</p>
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
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Input
                type="text"
                placeholder="Search pages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 w-full h-10"
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

            {/* TGS Filter Toggle - Mobile friendly */}
            <div className="flex items-center justify-between bg-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-3">
                <Switch id="tgs-filter" checked={showTgsOnly} onCheckedChange={setShowTgsOnly} />
                <Label htmlFor="tgs-filter" className="cursor-pointer">
                  <span className="text-green-400 font-medium">TGS Only</span>
                </Label>
              </div>
              <Badge variant="outline" className="border-gray-600">
                {tgsCount} pages
              </Badge>
            </div>
          </div>

          {/* Results count */}
          <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
            <span>{filteredPages.length} pages</span>
            {(searchQuery || showTgsOnly) && (
              <Badge variant="secondary" className="text-xs">
                Filtered
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Document Info - Scrollable */}
      <div className="px-3 py-3 md:px-4 md:py-4">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="border-gray-600">
            📄 {catalog?.document.pages_total} pages
          </Badge>
          <Badge variant="outline" className="border-gray-600">
            🚧 {catalog?.document.tgs_count} TGS
          </Badge>
          <Badge variant="outline" className="border-gray-600">
            📍 {catalog?.document.region}
          </Badge>
          <Badge variant="outline" className="border-gray-600 hidden sm:inline-flex">
            📅 {catalog?.document.effective_date}
          </Badge>
        </div>
      </div>

      {/* Page Grid - Responsive */}
      <div className="px-3 pb-6 md:px-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredPages.map((page) => {
            const manifestPage = catalog?.manifest.find((m) => m.num === page.n);

            return (
              <Link key={page.n} href={`/library/${docId}/${page.n}`} className="group">
                <Card className="bg-gray-800 border-gray-700 hover:border-gray-500 transition-colors overflow-hidden">
                  <div className="aspect-[3/4] bg-gray-700 relative">
                    {/* Thumbnail */}
                    <img
                      src={`${viewerPath}/${manifestPage?.preview}`}
                      alt={`Page ${page.n}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {/* Page number badge */}
                    <div className="absolute top-1 left-1 bg-black/80 rounded px-1.5 py-0.5 text-xs font-bold">
                      {page.n}
                    </div>
                    {/* TGS badge */}
                    {page.g && (
                      <div className="absolute top-1 right-1 bg-green-600 rounded px-1.5 py-0.5 text-xs font-bold">
                        TGS
                      </div>
                    )}
                  </div>
                  <CardContent className="p-2">
                    <p className="text-xs truncate font-medium">{page.t}</p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {page.s.substring(0, 40)}...
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* No results */}
        {filteredPages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No pages found</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery('');
                setShowTgsOnly(false);
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
