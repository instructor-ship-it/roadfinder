#!/usr/bin/env node
/**
 * Process AGTTM PDFs - Split into pages and generate previews
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const AGTTM_DIR = '/home/z/my-project/public/library/standards/agttm';
const DENSITY = 150;
const QUALITY = 85;

// Get all PDF files in AGTTM directory
function findPdfs(dir) {
  const pdfs = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pdfs.push(...findPdfs(fullPath));
    } else if (entry.name.endsWith('.pdf')) {
      pdfs.push(fullPath);
    }
  }
  return pdfs;
}

// Get page count of PDF
function getPageCount(pdfPath) {
  try {
    const result = execSync(`pdfinfo "${pdfPath}" 2>/dev/null | grep Pages`, { encoding: 'utf-8' });
    const match = result.match(/Pages:\s+(\d+)/);
    return match ? parseInt(match[1]) : 0;
  } catch (e) {
    console.error(`Error getting page count for ${pdfPath}: ${e.message}`);
    return 0;
  }
}

// Split PDF into individual pages
function splitPdf(pdfPath, outputDir) {
  console.log(`Splitting: ${pdfPath}`);
  
  const pagesDir = path.join(outputDir, 'pages');
  const previewDir = path.join(outputDir, 'preview');
  
  // Create directories
  fs.mkdirSync(pagesDir, { recursive: true });
  fs.mkdirSync(previewDir, { recursive: true });
  
  const pageCount = getPageCount(pdfPath);
  if (pageCount === 0) {
    console.error(`  No pages found in ${pdfPath}`);
    return null;
  }
  
  console.log(`  Pages: ${pageCount}`);
  
  // Split PDF into individual pages using pdftk
  for (let i = 1; i <= pageCount; i++) {
    const pageNum = String(i).padStart(3, '0');
    const outputPath = path.join(pagesDir, `page-${pageNum}.pdf`);
    
    try {
      execSync(`pdftk "${pdfPath}" cat ${i} output "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
    } catch (e) {
      // Try with qpdf if pdftk fails
      try {
        execSync(`qpdf "${pdfPath}" --pages . ${i} -- "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
      } catch (e2) {
        console.error(`  Error splitting page ${i}`);
      }
    }
  }
  
  // Generate preview images using ImageMagick/Ghostscript
  for (let i = 1; i <= pageCount; i++) {
    const pageNum = String(i).padStart(3, '0');
    const inputPath = path.join(pagesDir, `page-${pageNum}.pdf`);
    const outputPath = path.join(previewDir, `page-${pageNum}.webp`);
    
    if (!fs.existsSync(inputPath)) continue;
    
    try {
      // Convert PDF page to WebP preview
      execSync(`convert -density ${DENSITY} "${inputPath}[0]" -quality ${QUALITY} -background white -flatten "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
    } catch (e) {
      // Try with pdftoppm if ImageMagick fails
      try {
        const tempPng = outputPath.replace('.webp', '.png');
        execSync(`pdftoppm -png -r ${DENSITY} -f 1 -l 1 "${inputPath}" "${tempPng.replace('.png', '')}" 2>/dev/null`, { stdio: 'pipe' });
        // Convert PNG to WebP
        if (fs.existsSync(tempPng.replace('.png', '-1.png'))) {
          execSync(`convert "${tempPng.replace('.png', '-1.png')}" -quality ${QUALITY} "${outputPath}" 2>/dev/null`, { stdio: 'pipe' });
          fs.unlinkSync(tempPng.replace('.png', '-1.png'));
        }
      } catch (e2) {
        console.error(`  Error generating preview for page ${i}`);
      }
    }
  }
  
  return pageCount;
}

// Create index.json for each document
function createIndex(pdfPath, outputDir, pageCount, docId, title, agency, version) {
  const indexPath = path.join(outputDir, 'index.json');
  
  const index = {
    id: docId,
    title: title,
    shortTitle: title.split(' - ')[1] || title,
    agency: agency,
    version: version,
    pages: pageCount,
    path: outputDir.replace('/home/z/my-project/public', ''),
    file: pdfPath.replace('/home/z/my-project/public', ''),
    processed: new Date().toISOString(),
    pageFiles: []
  };
  
  // List all page files
  const pagesDir = path.join(outputDir, 'pages');
  if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir)
      .filter(f => f.endsWith('.pdf'))
      .sort();
    index.pageFiles = files.map(f => f.replace('.pdf', ''));
  }
  
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  console.log(`  Created index.json`);
  
  return index;
}

// Main processing
async function main() {
  console.log('=== Processing AGTTM PDFs ===\n');
  
  const pdfs = findPdfs(AGTTM_DIR);
  console.log(`Found ${pdfs.length} PDF files\n`);
  
  const documents = [];
  
  for (const pdf of pdfs) {
    const filename = path.basename(pdf, '.pdf');
    const partDir = path.dirname(pdf);
    
    // Extract document info from filename
    let docId = filename;
    let title = filename.replace(/-/g, ' ').replace(/_/g, ': ');
    let agency = 'Austroads';
    let version = 'Current';
    
    // Determine document type
    if (filename.includes('qgttm')) {
      agency = 'TMR Queensland';
      const partMatch = filename.match(/part-(\d+)/i);
      if (partMatch) {
        title = `Queensland Guide to Temporary Traffic Management Part ${partMatch[1]}`;
      }
    } else if (filename.includes('agttm')) {
      agency = 'Austroads';
      const partMatch = filename.match(/part-(\d+)/i);
      if (partMatch) {
        title = `Guide to Temporary Traffic Management Part ${partMatch[1]}`;
      }
    } else if (filename.includes('vic')) {
      agency = 'WorkSafe Victoria';
      title = 'Code of Practice for Worksite Safety - Traffic Management';
    }
    
    console.log(`Processing: ${filename}`);
    
    const pageCount = splitPdf(pdf, partDir);
    
    if (pageCount > 0) {
      const index = createIndex(pdf, partDir, pageCount, docId, title, agency, version);
      documents.push(index);
    }
    
    console.log('');
  }
  
  // Create master index
  const masterIndex = {
    version: '1.0',
    lastUpdated: new Date().toISOString(),
    documents: documents
  };
  
  const masterIndexPath = path.join(AGTTM_DIR, 'catalog.json');
  fs.writeFileSync(masterIndexPath, JSON.stringify(masterIndex, null, 2));
  console.log(`\nCreated catalog.json with ${documents.length} documents`);
}

main().catch(console.error);
