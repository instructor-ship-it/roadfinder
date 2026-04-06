'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Types
interface RegistryDocument {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  agency: string;
  version?: string;
  pages?: number;
  status: string;
  file?: string;
  url?: string;
  fileSize?: string;
  tags: string[];
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
  abstract?: string;
  completeSections?: SummarySection[];
}

export default function PdfViewerIndex() {
  const params = useParams();
  const router = useRouter();
  const docId = params.docId as string;

  const [document, setDocument] = useState<RegistryDocument | null>(null);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState(false);

  // Load document info
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load registry
        const registryResponse = await fetch('/library/registry.json');
        if (!registryResponse.ok) throw new Error('Failed to load registry');
        const registryData: Registry = await registryResponse.json();

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
          // Summary not available
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [docId]);

  // Get PDF URL
  const getPdfUrl = (): string | null => {
    if (!document) return null;
    if (document.file) return document.file;
    if (document.url) return document.url;
    return null;
  };

  // Open at specific page
  const openAtPage = (page: number) => {
    router.push(`/library/viewer/${docId}/${page}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading document info...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
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

  const pdfUrl = getPdfUrl();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Link href="/library">
              <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                ← Library
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{document.shortTitle}</h1>
              <p className="text-sm text-gray-400 truncate">{document.agency}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={() => openAtPage(1)} className="bg-blue-600 hover:bg-blue-700">
            📖 Read Document
          </Button>
          {pdfUrl && (
            <Link href={pdfUrl} target="_blank">
              <Button variant="outline" className="bg-gray-700 border-gray-600">
                📄 Open PDF
              </Button>
            </Link>
          )}
        </div>

        {/* Document Info Card */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-4">
            <h2 className="font-bold text-lg mb-2">{document.title}</h2>
            <p className="text-gray-300 text-sm mb-4">{document.description}</p>

            {/* Meta info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {document.version && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Version:</span>
                  <span className="text-white ml-2">{document.version}</span>
                </div>
              )}
              {document.pages && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Pages:</span>
                  <span className="text-white ml-2">{document.pages}</span>
                </div>
              )}
              {document.fileSize && (
                <div className="bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-400">Size:</span>
                  <span className="text-white ml-2">{document.fileSize}</span>
                </div>
              )}
              <div className="bg-gray-700/50 p-2 rounded">
                <span className="text-gray-400">Status:</span>
                <span className="text-green-400 ml-2">{document.status}</span>
              </div>
            </div>

            {/* Tags */}
            {document.tags && document.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-4">
                {document.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs border-gray-600 text-gray-300">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Abstract / Summary */}
        {summary?.abstract && (
          <Card className="bg-gray-800 border-gray-700 mb-6">
            <CardContent className="p-4">
              <h3 className="font-semibold text-purple-400 mb-2 flex items-center gap-2">
                🧠 AI Summary
              </h3>
              <p className="text-gray-300 text-sm whitespace-pre-line">{summary.abstract}</p>
            </CardContent>
          </Card>
        )}

        {/* Table of Contents */}
        {summary?.completeSections && summary.completeSections.length > 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-4">
              <button
                onClick={() => setExpandedSections(!expandedSections)}
                className="w-full text-left font-semibold text-indigo-400 mb-2 flex items-center gap-2"
              >
                📚 Document Structure ({summary.completeSections.length} sections)
                <span className="ml-auto text-gray-500 text-sm">
                  {expandedSections ? '▲ Collapse' : '▼ Expand'}
                </span>
              </button>

              {expandedSections && (
                <div className="max-h-96 overflow-y-auto space-y-1 border border-gray-600 rounded">
                  {summary.completeSections.map((section, i) => (
                    <Link
                      key={i}
                      href={`/library/viewer/${docId}/${section.page}`}
                      className="flex items-start gap-2 py-2 px-2 border-b border-gray-600/50 last:border-0 hover:bg-indigo-900/30 transition-colors"
                    >
                      <span className="text-indigo-300 font-mono text-sm min-w-[50px] shrink-0">
                        {section.sectionNumber}
                      </span>
                      <span className="text-gray-300 text-sm flex-1">{section.sectionTitle}</span>
                      <span className="text-indigo-400 text-xs shrink-0">p.{section.page}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Jump to Page */}
        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const input = form.elements.namedItem('page') as HTMLInputElement;
              const page = parseInt(input.value, 10);
              if (!isNaN(page) && page >= 1 && page <= (document.pages || 999)) {
                openAtPage(page);
              }
            }}
            className="flex items-center gap-2"
          >
            <label className="text-gray-400 text-sm">Jump to page:</label>
            <Input
              type="number"
              name="page"
              min={1}
              max={document.pages || 999}
              placeholder="Page #"
              className="w-24 bg-gray-700 border-gray-600"
            />
            <Button type="submit" variant="outline" className="bg-gray-700 border-gray-600">
              Go
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
