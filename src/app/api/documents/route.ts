import { NextResponse } from 'next/server';

/**
 * Document Processing API
 * GET /api/documents - List all documents with metadata
 * Uses HTTP fetch to access files (avoids Vercel function size limits)
 */

// Document metadata type
interface DocumentMetadata {
  id: string;
  title: string;
  shortTitle: string;
  category: string;
  status: string;
  hasAbstract: boolean;
  hasGeneratedSummary: boolean;
  generatedAt?: string;
  filePath?: string;
  fileSize?: string;
}

// Get the base URL for fetching static files
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

// GET - List all documents with their processing status
export async function GET(request: Request) {
  try {
    const baseUrl = getBaseUrl(request);

    // Fetch registry via HTTP (avoids bundling public files)
    const registryResponse = await fetch(`${baseUrl}/library/registry.json`);
    if (!registryResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to load document registry' },
        { status: 500 }
      );
    }
    const registry = await registryResponse.json();

    // Try to fetch generated summaries (may not exist)
    let existingSummaries: Record<string, { generatedAt: string; abstract: string }> = {};
    try {
      const summariesResponse = await fetch(`${baseUrl}/library/generated-summaries.json`);
      if (summariesResponse.ok) {
        existingSummaries = await summariesResponse.json();
      }
    } catch {
      // Summaries file doesn't exist yet - that's okay
    }

    // Build document list with status
    const documents: DocumentMetadata[] = registry.documents.map((doc: {
      id: string;
      title: string;
      shortTitle: string;
      category: string;
      status: string;
      abstract?: string;
      file?: string;
      fileSize?: string;
    }) => ({
      id: doc.id,
      title: doc.title,
      shortTitle: doc.shortTitle,
      category: doc.category,
      status: doc.status,
      hasAbstract: !!doc.abstract,
      hasGeneratedSummary: !!existingSummaries[doc.id],
      generatedAt: existingSummaries[doc.id]?.generatedAt,
      filePath: doc.file,
      fileSize: doc.fileSize,
    }));

    // Get category info
    const categories = registry.categories;
    const parentCategories = registry.parentCategories;

    return NextResponse.json({
      success: true,
      documents,
      categories,
      parentCategories,
      total: documents.length,
      withAbstracts: documents.filter((d: DocumentMetadata) => d.hasAbstract).length,
      withGeneratedSummaries: documents.filter((d: DocumentMetadata) => d.hasGeneratedSummary).length,
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}
