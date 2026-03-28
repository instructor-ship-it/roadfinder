import { NextResponse } from 'next/server';
import path from 'path';

// GET - List documents that can be searched
export async function GET() {
  try {
    const fs = await import('fs');
    const registryPath = path.join(process.cwd(), 'public', 'library', 'registry.json');
    const data = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(data);

    const documents = registry.documents
      .filter((doc: { abstract?: string }) => doc.abstract)
      .map((doc: { id: string; title: string; shortTitle: string; category?: string }) => ({
        id: doc.id,
        title: doc.title,
        shortTitle: doc.shortTitle,
        category: doc.category,
      }));

    return NextResponse.json({
      success: true,
      documents,
      total: documents.length
    });

  } catch (error) {
    console.error('Failed to load documents:', error);
    return NextResponse.json({ error: 'Failed to load documents' }, { status: 500 });
  }
}
