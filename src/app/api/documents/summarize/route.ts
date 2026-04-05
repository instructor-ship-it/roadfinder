import { NextResponse } from 'next/server';

/**
 * Document Summarization API
 * POST /api/documents/summarize
 *
 * Body: {
 *   documentId: string,
 *   apiKey: string,
 *   extractType: 'abstract' | 'keywords' | 'sections' | 'full'
 * }
 *
 * Generates AI-powered summaries and extracts knowledge from documents
 * Uses HTTP fetch to access files (avoids Vercel function size limits)
 */

// Extraction prompts for different types
const EXTRACTION_PROMPTS = {
  abstract: `Analyze the following document text and generate a comprehensive abstract (2-3 paragraphs).
Focus on:
- Purpose and scope of the document
- Key requirements or standards mentioned
- Who should use this document
- Main topics covered

Document text:
---
{TEXT}
---

Respond with ONLY the abstract text, no additional formatting or markdown.`,

  keywords: `Extract the most important keywords and topics from this document.
Focus on traffic management, safety, and regulatory terms.

Document text:
---
{TEXT}
---

Respond with a JSON array of 10-15 keywords: ["keyword1", "keyword2", ...]`,

  sections: `Analyze this document and identify the main sections and their key points.
For each section, provide a brief summary of what it covers.

Document text:
---
{TEXT}
---

Respond in JSON format:
{
  "sections": [
    { "title": "Section Name", "summary": "Brief summary", "keyPoints": ["point1", "point2"] }
  ]
}`,

  full: `Perform a comprehensive analysis of this traffic management document.
Extract all relevant information that would be useful for Traffic Controllers.

Document text:
---
{TEXT}
---

Respond in JSON format:
{
  "abstract": "2-3 paragraph summary",
  "keywords": ["keyword1", "keyword2"],
  "speedZonesMentioned": [40, 50, 60],
  "keyRequirements": ["requirement1", "requirement2"],
  "targetAudience": ["TC", "TMS"],
  "complianceNotes": ["note1"],
  "crossReferences": ["AGTTM Part 3", "AS 1742.3"]
}`,

  // Phase 2: Structured extraction for traffic management documents
  structured: `You are analyzing a traffic management document for Western Australia. Extract structured data that Traffic Controllers need.

Document text:
---
{TEXT}
---

Extract and return ONLY valid JSON in this exact format:
{
  "abstract": "2-3 paragraph summary of the document's purpose and scope",
  "keywords": ["traffic management", "speed zone", "TGS"],
  "targetAudience": ["Traffic Controller", "TMS"],
  "keyRequirements": ["list of key requirements mentioned"],
  "extractedData": {
    "speedZonesMentioned": [40, 50, 60, 70, 80, 100, 110],
    "tgsDiagramsReferenced": ["IW-01", "LC-05"],
    "roleDefinitions": ["Traffic Management Supervisor", "Traffic Controller"],
    "notificationThresholds": {
      "roadClosure": "7 days",
      "speedReduction": "24 hours"
    },
    "requirements": [
      {"requirement": "All workers must wear high-visibility clothing", "section": "4.2.1", "type": "mandatory"}
    ],
    "taperLengths": [
      {"speedZone": 60, "taperLength": "57m", "notes": "Minimum taper for 60 km/h"}
    ],
    "signSchedules": [
      {"setup": "Short term works", "signs": ["T1-1", "T1-2"], "speedZone": 60}
    ]
  },
  "crossReferences": ["AGTTM Part 3", "AS 1742.3"],
  "complianceNotes": ["Important compliance notes"]
}

IMPORTANT:
- Extract only what is explicitly stated in the document
- Use null for missing values, do not invent data
- Speed zones should be numbers only (e.g., 60 not "60 km/h")
- TGS codes should match the format used (e.g., "IW-01", "LC-05")
- Requirement types must be: "mandatory", "recommended", or "optional"`,
};

// Simple PDF text extraction from buffer
function extractTextFromPdfBuffer(buffer: Buffer): string {
  try {
    // Basic text extraction from PDF buffer
    // Look for text streams between BT and ET markers
    const pdfText = buffer.toString('latin1');

    // Extract text between stream markers
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    let extractedText = '';

    while ((match = streamRegex.exec(pdfText)) !== null) {
      const streamContent = match[1];
      // Try to decode if it looks like text
      if (streamContent.includes('Tj') || streamContent.includes('TJ')) {
        // Extract text from Tj/TJ operators
        const textMatches = streamContent.match(/\(([^)]+)\)/g);
        if (textMatches) {
          extractedText += textMatches.map((t) => t.replace(/[()]/g, '')).join(' ') + ' ';
        }
      }
    }

    // If basic extraction didn't work well, try another approach
    if (extractedText.length < 100) {
      // Fallback: extract readable text
      const readableText = pdfText
        .replace(/[^\x20-\x7E\r\n]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      extractedText = readableText.slice(0, 15000); // Limit for API
    }

    return extractedText.slice(0, 20000); // Limit text size for API
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

// Get the base URL for fetching static files
function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  // Use the request origin for internal fetches
  return url.origin;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { documentId, apiKey, extractType = 'abstract' } = body;

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

    // Fetch registry via HTTP (avoids bundling public files)
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

    // Fetch PDF via HTTP (avoids bundling public files)
    console.log(`Processing document: ${doc.id}`);
    const pdfResponse = await fetch(`${baseUrl}${doc.file}`);

    if (!pdfResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'PDF file not found on server' },
        { status: 404 }
      );
    }

    // Extract text from PDF
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());
    const extractedText = extractTextFromPdfBuffer(pdfBuffer);

    if (!extractedText || extractedText.length < 50) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Could not extract sufficient text from PDF. The PDF may be image-based or encrypted.',
        },
        { status: 400 }
      );
    }

    // Build prompt
    const prompt = EXTRACTION_PROMPTS[extractType as keyof typeof EXTRACTION_PROMPTS].replace(
      '{TEXT}',
      extractedText.slice(0, 15000)
    );

    // Call z.ai API
    const apiUrl = 'https://api.z.ai/api/paas/v4/chat/completions';

    const aiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-plus',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert in traffic management and road safety documentation for Western Australia. Extract and summarize information accurately and professionally.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // Lower temperature for more consistent extraction
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);

      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json({
          success: false,
          error: errorJson.error?.message || `API error: ${aiResponse.status}`,
        });
      } catch {
        return NextResponse.json({
          success: false,
          error: `API returned ${aiResponse.status}`,
        });
      }
    }

    const data = await aiResponse.json();
    const extractedContent = data.choices?.[0]?.message?.content || '';

    // For structured extraction, parse the JSON response
    if (extractType === 'structured') {
      try {
        // Try to extract JSON from the response
        let jsonStr = extractedContent;

        // Handle markdown code blocks
        const jsonMatch = extractedContent.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        const parsedData = JSON.parse(jsonStr);

        // Return the structured data
        return NextResponse.json({
          success: true,
          documentId,
          extractType,
          extractedContent: jsonStr,
          textLength: extractedText.length,
          usage: data.usage,
          // Include full summary data for client-side saving
          summary: {
            generatedAt: new Date().toISOString(),
            abstract: parsedData.abstract || '',
            keywords: parsedData.keywords || [],
            targetAudience: parsedData.targetAudience || [],
            keyRequirements: parsedData.keyRequirements || [],
            crossReferences: parsedData.crossReferences || [],
            complianceNotes: parsedData.complianceNotes || [],
            extractedData: parsedData.extractedData || {},
            type: extractType,
            extractionType: 'structured',
            extractionVersion: '2.0',
          },
        });
      } catch (parseError) {
        console.error('Failed to parse structured extraction:', parseError);
        // Fall through to return raw content
      }
    }

    // Return the generated summary (client will handle saving)
    // Note: On Vercel serverless, we can't write to public/ directory
    // The client should save to localStorage or a database
    return NextResponse.json({
      success: true,
      documentId,
      extractType,
      extractedContent,
      textLength: extractedText.length,
      usage: data.usage,
      // Include summary data for client-side saving
      summary: {
        generatedAt: new Date().toISOString(),
        abstract: extractedContent,
        type: extractType,
      },
    });
  } catch (error) {
    console.error('Document summarization error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
