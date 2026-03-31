import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Q&A Entry interface
interface QAEntry {
  id: string;
  question: string;
  answer: string;
  documents: string[];
  documentNames: string[];
  category?: string;
  createdAt: string;
  isFavorite: boolean;
}

// Path to saved Q&A file
function getQAFilePath(): string {
  return path.join(process.cwd(), 'public', 'library', 'qa-saved.json');
}

// Load saved Q&As
function loadSavedQAs(): QAEntry[] {
  try {
    const filePath = getQAFilePath();
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load saved Q&As:', error);
  }
  return [];
}

// Save Q&As
function saveQAs(entries: QAEntry[]): boolean {
  try {
    const filePath = getQAFilePath();
    fs.writeFileSync(filePath, JSON.stringify(entries, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to save Q&As:', error);
    return false;
  }
}

// Generate a unique ID
function generateId(): string {
  return `qa-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// GET - List saved Q&As
export async function GET() {
  try {
    const entries = loadSavedQAs();
    return NextResponse.json({
      success: true,
      entries,
      total: entries.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load Q&As' }, { status: 500 });
  }
}

// POST - Save a new Q&A entry (from AI response)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, documents, documentNames, category } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 });
    }

    const entries = loadSavedQAs();

    const newEntry: QAEntry = {
      id: generateId(),
      question,
      answer,
      documents: documents || [],
      documentNames: documentNames || [],
      category,
      createdAt: new Date().toISOString(),
      isFavorite: false,
    };

    // Add to beginning
    entries.unshift(newEntry);

    // Keep max 100 entries
    const trimmed = entries.slice(0, 100);

    if (saveQAs(trimmed)) {
      return NextResponse.json({
        success: true,
        entry: newEntry,
        total: trimmed.length,
      });
    } else {
      return NextResponse.json({ error: 'Failed to save Q&A' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save Q&A' }, { status: 500 });
  }
}

// DELETE - Remove a Q&A entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const entries = loadSavedQAs();
    const filtered = entries.filter((e) => e.id !== id);

    if (filtered.length === entries.length) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    if (saveQAs(filtered)) {
      return NextResponse.json({ success: true, total: filtered.length });
    } else {
      return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete Q&A' }, { status: 500 });
  }
}

// PUT - Update entry (e.g., toggle favorite)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const entries = loadSavedQAs();
    const index = entries.findIndex((e) => e.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    entries[index] = { ...entries[index], ...updates };

    if (saveQAs(entries)) {
      return NextResponse.json({ success: true, entry: entries[index] });
    } else {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update Q&A' }, { status: 500 });
  }
}
