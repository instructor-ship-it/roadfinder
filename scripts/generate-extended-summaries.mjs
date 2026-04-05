#!/usr/bin/env node
/**
 * Extended AI Summaries Generator for RoadFinder
 * 
 * This script processes PDF documents and generates extended AI summaries
 * with the following fields:
 * - abstract (existing, may enhance)
 * - keywords (existing)
 * - targetAudience (new)
 * - keyRequirements (new)
 * - complianceNotes (new)
 * - crossReferences (new)
 * 
 * Features:
 * - Resumable: tracks progress in state file
 * - Handles large PDFs via pre-split pages
 * - Skip forms/templates
 * - Uses AI for content analysis
 * 
 * Usage: node scripts/generate-extended-summaries.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// State file for resumability
const STATE_FILE = path.join(ROOT_DIR, 'scripts', '.summary-progress.json');

// Directories
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const LIBRARY_DIR = path.join(PUBLIC_DIR, 'library');
const SUMMARIES_DIR = path.join(LIBRARY_DIR, 'summaries');

// Documents to skip (forms/templates that don't need AI summaries)
const SKIP_IDS = [
  'form-notification-roadworks',
  'form-variation-standards',
  'form-swms-template',
  'form-incident-report',
  'form-daily-diary',
  'form-risk-assessment',
  'form-induction-checklist',
  'mrwa-spec-202', // Invalid PDF (HTML error page)
];

// Documents with external URLs only (no local PDF)
const EXTERNAL_ONLY_IDS = [
  'whs-construction-cop',
  'whs-workplace-traffic',
  'whs-swms-guide',
  'whs-records-guide',
  'as-1742-3',
  'as-nzs-31000',
  'agrs-part-3-safe-speed',
];

// Large documents that have pre-split pages
const LARGE_DOCUMENTS = {
  'mrwa-tmp-wheatbelt-0922-part1': {
    pagesDir: path.join(LIBRARY_DIR, 'mrwa', 'tmp', 'pages'),
    maxPages: 10
  },
  'mrwa-tmp-wheatbelt-0922-part2': {
    pagesDir: path.join(LIBRARY_DIR, 'mrwa', 'tmp', 'pages'),
    maxPages: 10
  },
  'agttm-part-9': {
    pagesDir: path.join(LIBRARY_DIR, 'standards', 'agttm', 'part-9', 'pages'),
    maxPages: 10
  }
};

// Load or create state
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
  }
  return {
    started: new Date().toISOString(),
    completed: [],
    failed: [],
    currentDocument: null,
    lastUpdated: new Date().toISOString()
  };
}

function saveState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Load registry
function loadRegistry() {
  const registryPath = path.join(LIBRARY_DIR, 'registry.json');
  return JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
}

// Load existing summary
function loadSummary(docId) {
  const summaryPath = path.join(SUMMARIES_DIR, `${docId}.json`);
  if (fs.existsSync(summaryPath)) {
    return JSON.parse(fs.readFileSync(summaryPath, 'utf-8'));
  }
  return null;
}

// Save summary
function saveSummary(docId, summary) {
  const summaryPath = path.join(SUMMARIES_DIR, `${docId}.json`);
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
}

// Check if PDF exists and is valid
function findPdfPath(doc) {
  if (!doc.file) return null;
  
  const publicPath = path.join(PUBLIC_DIR, doc.file);
  if (fs.existsSync(publicPath)) {
    // Check if it's actually a PDF (not HTML error page)
    const buffer = fs.readFileSync(publicPath);
    const header = buffer.slice(0, 5).toString();
    if (header === '%PDF-') {
      return publicPath;
    }
    console.log(`  ⚠️ Invalid PDF format for ${doc.id}: ${header}`);
    return null;
  }
  return null;
}

// Get split pages for large documents
function getSplitPages(docId, config) {
  if (!config.pagesDir || !fs.existsSync(config.pagesDir)) {
    return [];
  }
  
  const files = fs.readdirSync(config.pagesDir)
    .filter(f => f.endsWith('.pdf') && /^page-\d+\.pdf$/.test(f))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/)[0]);
      const numB = parseInt(b.match(/\d+/)[0]);
      return numA - numB;
    });
  
  return files.slice(0, config.maxPages).map(f => path.join(config.pagesDir, f));
}

// Extract text from PDF using pdfjs-dist
async function extractPdfText(pdfPath) {
  try {
    const buffer = fs.readFileSync(pdfPath);
    const loadingTask = getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true
    });
    
    const pdfDocument = await loadingTask.promise;
    let fullText = '';
    
    const numPages = Math.min(pdfDocument.numPages, 20); // Limit pages for large docs
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdfDocument.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText;
  } catch (error) {
    console.error(`  Error extracting text from ${pdfPath}: ${error.message}`);
    return '';
  }
}

// Generate AI summary using z-ai-web-dev-sdk
async function generateAISummary(doc, pdfText) {
  const ZAI = await import('z-ai-web-dev-sdk');
  const zai = await ZAI.default.create();
  
  const prompt = `You are an expert in traffic management and work health and safety documentation for Western Australia.

Analyze the following document and generate an extended summary with the following fields:

**Document Title**: ${doc.title}
**Document Type**: ${doc.type}
**Agency**: ${doc.agency}

**Document Content** (first 15000 characters):
${pdfText.substring(0, 15000)}

Generate a JSON object with these exact fields:

1. **abstract** (string, 3-5 sentences): A comprehensive summary of the document's purpose, scope, and key content.

2. **keywords** (array of strings): 5-10 relevant keywords for categorization and search.

3. **targetAudience** (array of strings): List of roles/personas who should read this document (e.g., "Traffic Controllers", "Traffic Management Supervisors", "Site Managers", "PCBUs", "Health and Safety Representatives").

4. **keyRequirements** (array of objects): Key mandatory requirements from the document. Each object should have:
   - "requirement": The requirement text
   - "section": Section reference if available
   - "priority": "critical" | "high" | "medium"

5. **complianceNotes** (array of objects): Important compliance considerations. Each object should have:
   - "note": The compliance note
   - "reference": Section or clause reference
   - "consequence": What happens if not followed

6. **crossReferences** (array of objects): Related documents that should be read alongside this one. Each object should have:
   - "documentId": The document ID from the registry (e.g., "whs-act-2020", "mrwa-cop-2025")
   - "reason": Why this document is related
   - "relevance": "prerequisite" | "supplementary" | "related"

Return ONLY valid JSON with no markdown formatting or explanation.`;

  try {
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are a technical document analyst specializing in traffic management and WHS documentation. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const responseText = completion.choices[0]?.message?.content || '';
    
    // Try to parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('No valid JSON found in AI response');
  } catch (error) {
    console.error(`  AI generation error: ${error.message}`);
    return null;
  }
}

// Process a single document
async function processDocument(doc, state) {
  console.log(`\n📄 Processing: ${doc.title} (${doc.id})`);
  
  // Skip forms/templates
  if (SKIP_IDS.includes(doc.id)) {
    console.log(`  ⏭️ Skipping (form/template)`);
    return { status: 'skipped', reason: 'form_template' };
  }
  
  // Skip documents without local PDFs
  if (EXTERNAL_ONLY_IDS.includes(doc.id)) {
    console.log(`  ⏭️ Skipping (external URL only)`);
    return { status: 'skipped', reason: 'external_only' };
  }
  
  // Check if already completed
  if (state.completed.includes(doc.id)) {
    console.log(`  ✅ Already completed`);
    return { status: 'already_completed' };
  }
  
  // Find PDF path
  const pdfPath = findPdfPath(doc);
  
  // Handle large documents with split pages
  let pdfText = '';
  
  if (LARGE_DOCUMENTS[doc.id]) {
    console.log(`  📚 Large document - using split pages`);
    const pages = getSplitPages(doc.id, LARGE_DOCUMENTS[doc.id]);
    console.log(`  Found ${pages.length} split pages to process`);
    
    // Extract text from each page
    for (let i = 0; i < pages.length; i++) {
      const pageText = await extractPdfText(pages[i]);
      pdfText += pageText + '\n\n';
      if (pdfText.length > 20000) break; // Enough context
    }
  } else if (pdfPath) {
    console.log(`  📖 Extracting text from PDF...`);
    pdfText = await extractPdfText(pdfPath);
  } else {
    console.log(`  ⚠️ No PDF found for ${doc.id}`);
    return { status: 'skipped', reason: 'no_pdf' };
  }
  
  if (pdfText.length < 100) {
    console.log(`  ⚠️ Insufficient text extracted (${pdfText.length} chars)`);
    return { status: 'failed', reason: 'no_text' };
  }
  
  console.log(`  📝 Extracted ${pdfText.length} characters`);
  
  // Generate AI summary
  console.log(`  🤖 Generating AI summary...`);
  const aiSummary = await generateAISummary(doc, pdfText);
  
  if (!aiSummary) {
    console.log(`  ❌ AI generation failed`);
    return { status: 'failed', reason: 'ai_failed' };
  }
  
  // Load existing summary and merge
  const existingSummary = loadSummary(doc.id) || {};
  
  // Merge AI summary with existing
  const mergedSummary = {
    ...existingSummary,
    title: doc.title,
    abstract: aiSummary.abstract || existingSummary.abstract || doc.abstract || '',
    keywords: aiSummary.keywords || existingSummary.keywords || doc.tags || [],
    targetAudience: aiSummary.targetAudience || [],
    completeSections: existingSummary.completeSections || [],
    keyRequirements: aiSummary.keyRequirements || [],
    complianceNotes: aiSummary.complianceNotes || [],
    crossReferences: aiSummary.crossReferences || [],
    lastProcessed: new Date().toISOString()
  };
  
  // Save summary
  saveSummary(doc.id, mergedSummary);
  console.log(`  ✅ Summary saved`);
  
  return { status: 'completed', summary: mergedSummary };
}

// Update index.json
function updateIndex(documents) {
  const indexPath = path.join(SUMMARIES_DIR, 'index.json');
  const index = {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    generatedBy: "Phase 1 Extended Summary Generator",
    documentsCount: documents.length,
    documents: documents.map(doc => ({
      id: doc.id,
      title: doc.title,
      hasAbstract: true,
      sectionsCount: doc.completeSections?.length || 0,
      hasExtendedSummary: !!(doc.keyRequirements?.length || doc.complianceNotes?.length),
      hasCrossReferences: !!(doc.crossReferences?.length),
      targetAudience: doc.targetAudience || []
    }))
  };
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`\n📋 Updated index.json`);
}

// Main function
async function main() {
  console.log('🚀 Extended AI Summaries Generator');
  console.log('===================================\n');
  
  // Load state and registry
  const state = loadState();
  const registry = loadRegistry();
  
  console.log(`📚 Found ${registry.documents.length} documents in registry`);
  console.log(`✅ Already completed: ${state.completed.length}`);
  console.log(`❌ Previously failed: ${state.failed.length}`);
  
  // Process each document
  const allSummaries = [];
  let processed = 0;
  let completed = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const doc of registry.documents) {
    // Update current document in state
    state.currentDocument = doc.id;
    saveState(state);
    
    const result = await processDocument(doc, state);
    processed++;
    
    switch (result.status) {
      case 'completed':
        state.completed.push(doc.id);
        completed++;
        allSummaries.push(result.summary);
        break;
      case 'failed':
        state.failed.push({ id: doc.id, reason: result.reason, timestamp: new Date().toISOString() });
        failed++;
        break;
      case 'skipped':
        skipped++;
        break;
      case 'already_completed':
        // Load existing summary
        const existing = loadSummary(doc.id);
        if (existing) allSummaries.push(existing);
        break;
    }
    
    // Save state after each document
    saveState(state);
    
    // Progress update
    console.log(`\n📊 Progress: ${processed}/${registry.documents.length} (${completed} completed, ${skipped} skipped, ${failed} failed)`);
  }
  
  // Update index
  updateIndex(allSummaries);
  
  // Final state update
  state.currentDocument = null;
  state.finished = new Date().toISOString();
  saveState(state);
  
  console.log('\n✨ Processing Complete!');
  console.log(`   Completed: ${completed}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  
  if (state.failed.length > 0) {
    console.log('\n❌ Failed documents:');
    state.failed.forEach(f => console.log(`   - ${f.id}: ${f.reason}`));
  }
}

// Run
main().catch(console.error);
