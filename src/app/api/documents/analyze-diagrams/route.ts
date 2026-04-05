import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Diagram Analysis API
 * POST /api/documents/analyze-diagrams
 *
 * Body: {
 *   documentId: string,
 *   apiKey: string,
 *   pageNumbers?: number[],  // Specific pages to analyze (optional)
 *   maxDiagrams?: number     // Max diagrams to analyze (default: 5)
 * }
 *
 * Extracts and analyzes TGS diagrams from PDFs using VLM
 */

// VLM prompt for diagram analysis
const DIAGRAM_ANALYSIS_PROMPT = `You are analyzing a Traffic Guidance Scheme (TGS) diagram from an Australian traffic management document.

Analyze this diagram and extract the following information in JSON format:

{
  "diagramType": "TGS" | "TMP" | "sign_schedule" | "taper_diagram" | "layout" | "other",
  "setupType": "Description of setup type (e.g., 'Intersection Works', 'Lane Closure', 'Short Term Works')",
  "speedZone": 60,
  "signs": ["T1-1", "T1-2", "T2-1"],
  "trafficControlDevices": ["traffic cones", "barrier boards", "arrow board"],
  "lanesAffected": 1,
  "workAreaDescription": "Description of the work area shown",
  "measurements": [
    {"label": "Taper length", "value": "57", "unit": "m"},
    {"label": "Work zone length", "value": "100", "unit": "m"}
  ],
  "safetyNotes": ["Safety notes visible in diagram"],
  "description": "Detailed description of what this diagram shows"
}

IMPORTANT:
- Extract only what is visible in the diagram
- Use null for missing values
- Speed zone should be a number (e.g., 60 not "60 km/h")
- Sign codes should follow Australian standards (T1-1, T2-1, etc.)
- If no diagram is visible, return {"diagramType": "other", "description": "No TGS diagram detected"}`;

// Simple PDF image extraction from buffer
function extractImagesFromPdf(
  buffer: Buffer,
  pageNumbers?: number[]
): Array<{ pageNumber: number; imageData: string }> {
  const images: Array<{ pageNumber: number; imageData: string }> = [];

  try {
    // Look for JPEG images embedded in PDF
    const pdfBuffer = buffer;

    // Find JPEG signatures (FFD8FF)
    let offset = 0;
    let imageCount = 0;

    while (offset < pdfBuffer.length - 2 && imageCount < 10) {
      // Look for JPEG start marker
      if (
        pdfBuffer[offset] === 0xff &&
        pdfBuffer[offset + 1] === 0xd8 &&
        pdfBuffer[offset + 2] === 0xff
      ) {
        // Find JPEG end marker (FFD9)
        let endOffset = offset + 2;
        while (endOffset < pdfBuffer.length - 1) {
          if (pdfBuffer[endOffset] === 0xff && pdfBuffer[endOffset + 1] === 0xd9) {
            endOffset += 2;
            break;
          }
          endOffset++;
        }

        // Extract JPEG data
        if (endOffset > offset + 100) {
          const jpegBuffer = pdfBuffer.subarray(offset, endOffset);
          const base64 = jpegBuffer.toString('base64');

          // Skip tiny images (likely icons)
          if (base64.length > 5000) {
            imageCount++;
            if (!pageNumbers || pageNumbers.includes(imageCount)) {
              images.push({
                pageNumber: imageCount,
                imageData: `data:image/jpeg;base64,${base64}`,
              });
            }
          }
        }
        offset = endOffset;
      } else {
        offset++;
      }
    }

    // If no JPEGs found, try PNG signatures
    if (images.length === 0) {
      offset = 0;
      imageCount = 0;
      const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

      while (offset < pdfBuffer.length - 8 && imageCount < 10) {
        if (pdfBuffer.subarray(offset, offset + 8).equals(pngSignature)) {
          // Find PNG end (IEND chunk)
          let endOffset = offset + 8;
          while (endOffset < pdfBuffer.length - 12) {
            // IEND chunk: 00 00 00 00 49 45 4e 44 ae 42 60 82
            if (
              pdfBuffer[endOffset + 4] === 0x49 &&
              pdfBuffer[endOffset + 5] === 0x45 &&
              pdfBuffer[endOffset + 6] === 0x4e &&
              pdfBuffer[endOffset + 7] === 0x44
            ) {
              endOffset += 12; // Include IEND chunk
              break;
            }
            endOffset++;
          }

          if (endOffset > offset + 100) {
            const pngBuffer = pdfBuffer.subarray(offset, endOffset);
            const base64 = pngBuffer.toString('base64');

            if (base64.length > 5000) {
              imageCount++;
              if (!pageNumbers || pageNumbers.includes(imageCount)) {
                images.push({
                  pageNumber: imageCount,
                  imageData: `data:image/png;base64,${base64}`,
                });
              }
            }
          }
          offset = endOffset;
        } else {
          offset++;
        }
      }
    }

    return images;
  } catch (error) {
    console.error('PDF image extraction error:', error);
    return [];
  }
}

// Analyze a single diagram using VLM
async function analyzeDiagram(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  imageData: string,
  pageNumber: number
): Promise<{
  pageNumber: number;
  diagramType: string;
  description: string;
  analysis: Record<string, unknown>;
  confidence: number;
} | null> {
  try {
    const response = await zai.chat.completions.createVision({
      model: 'glm-4v-flash',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: DIAGRAM_ANALYSIS_PROMPT,
            },
            {
              type: 'image_url',
              image_url: {
                url: imageData,
              },
            },
          ],
        },
      ],
    });

    const content = response.choices?.[0]?.message?.content || '';

    // Try to parse JSON from response
    try {
      // Handle markdown code blocks
      let jsonStr = content;
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
      }

      const analysis = JSON.parse(jsonStr);

      // Skip if not a TGS diagram
      if (analysis.diagramType === 'other' && analysis.description?.includes('No TGS diagram')) {
        return null;
      }

      return {
        pageNumber,
        diagramType: analysis.diagramType || 'other',
        description: analysis.description || '',
        analysis,
        confidence: 0.8, // Default confidence
      };
    } catch (parseError) {
      console.error('Failed to parse VLM response:', parseError);
      return null;
    }
  } catch (error) {
    console.error('VLM analysis error:', error);
    return null;
  }
}

// Get the base URL for fetching static files
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  return url.origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, apiKey, pageNumbers, maxDiagrams = 5 } = body;

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'Document ID is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required. Configure it in Settings.' },
        { status: 400 }
      );
    }

    // Get base URL for fetching files via HTTP
    const baseUrl = getBaseUrl(request);

    // Fetch registry via HTTP
    const registryResponse = await fetch(`${baseUrl}/library/registry.json`);
    if (!registryResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to load document registry' },
        { status: 500 }
      );
    }
    const registry = await registryResponse.json();
    const doc = registry.documents.find((d: { id: string }) => d.id === documentId);

    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Document not found in registry' },
        { status: 404 }
      );
    }

    // Check if document has a local file
    if (!doc.file || doc.file.startsWith('http')) {
      return NextResponse.json(
        { success: false, error: 'Document does not have a local file for processing' },
        { status: 400 }
      );
    }

    // Fetch PDF via HTTP
    console.log(`Analyzing diagrams in document: ${doc.id}`);
    const pdfResponse = await fetch(`${baseUrl}${doc.file}`);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'PDF file not found on server' },
        { status: 404 }
      );
    }

    // Get PDF buffer
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

    // Initialize ZAI for VLM
    const zai = await ZAI.create();

    // Extract images from PDF
    const extractedImages = extractImagesFromPdf(pdfBuffer, pageNumbers);
    console.log(`Extracted ${extractedImages.length} potential diagram images`);

    if (extractedImages.length === 0) {
      return NextResponse.json({
        success: true,
        documentId,
        message: 'No images found in PDF for diagram analysis',
        diagramAnalyses: [],
      });
    }

    // Analyze each image with VLM
    const diagramAnalyses: Array<{
      pageNumber: number;
      diagramType: string;
      description: string;
      signs?: string[];
      speedZone?: number;
      setupType?: string;
      trafficControlDevices?: string[];
      measurements?: Array<{ label: string; value: string; unit?: string }>;
      safetyNotes?: string[];
      confidence: number;
    }> = [];

    const imagesToAnalyze = extractedImages.slice(0, maxDiagrams);

    for (const image of imagesToAnalyze) {
      const analysis = await analyzeDiagram(zai, image.imageData, image.pageNumber);

      if (analysis && analysis.diagramType !== 'other') {
        diagramAnalyses.push({
          pageNumber: analysis.pageNumber,
          diagramType: analysis.diagramType,
          description: analysis.description,
          signs: analysis.analysis.signs as string[] | undefined,
          speedZone: analysis.analysis.speedZone as number | undefined,
          setupType: analysis.analysis.setupType as string | undefined,
          trafficControlDevices: analysis.analysis.trafficControlDevices as string[] | undefined,
          measurements: analysis.analysis.measurements as
            | Array<{ label: string; value: string; unit?: string }>
            | undefined,
          safetyNotes: analysis.analysis.safetyNotes as string[] | undefined,
          confidence: analysis.confidence,
        });
      }
    }

    console.log(`Analyzed ${diagramAnalyses.length} TGS diagrams`);

    return NextResponse.json({
      success: true,
      documentId,
      totalImagesFound: extractedImages.length,
      diagramsAnalyzed: diagramAnalyses.length,
      diagramAnalyses,
      // Include summary data for client-side saving
      summary: {
        generatedAt: new Date().toISOString(),
        extractionType: 'diagrams',
        extractionVersion: '3.0',
        diagramAnalyses,
      },
    });
  } catch (error) {
    console.error('Diagram analysis error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
