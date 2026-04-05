import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * Document Processing API
 * GET /api/documents - List all documents with metadata
 * POST /api/documents - Process a document for knowledge extraction
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

// GET - List all documents with their processing status
export async function GET() {
  try {
    const registryPath = path.join(process.cwd(), 'public/library/registry.json');
    const registryContent = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(registryContent);

    // Check for existing generated summaries
    const summariesPath = path.join(process.cwd(), 'public/library/generated-summaries.json');
    let existingSummaries: Record<string, { generatedAt: string; abstract: string }> = {};

    if (fs.existsSync(summariesPath)) {
      existingSummaries = JSON.parse(fs.readFileSync(summariesPath, 'utf-8'));
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
