import { NextResponse } from 'next/server';

/**
 * Test z.ai API connection
 * POST /api/ai/verify
 * Body: { apiKey: string }
 *
 * Tests z.ai public API: https://api.z.ai/api/paas/v4/chat/completions
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'API key is required',
      });
    }

    // z.ai API endpoint (from docs.z.ai)
    const apiUrl = 'https://api.z.ai/api/paas/v4/chat/completions';

    // Test by making a simple chat request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-plus',
        messages: [
          {
            role: 'user',
            content: 'Say "Connection successful" in exactly those words.',
          },
        ],
        max_tokens: 10,
      }),
    });

    const responseText = await response.text();
    console.log('AI API test response:', response.status, responseText);

    if (!response.ok) {
      // Parse error for better messages
      try {
        const errorJson = JSON.parse(responseText);
        const errorCode = errorJson.error?.code;
        const errorMsg = errorJson.error?.message || errorJson.error?.code;

        if (errorCode === '1113' || errorMsg?.includes('Insufficient balance')) {
          return NextResponse.json({
            success: false,
            error:
              'API key is valid but account has insufficient balance. Add credits at z.ai/manage-apikey/billing',
            needsCredits: true,
            validKey: true,
          });
        }

        if (errorCode === '1211' || errorMsg?.includes('Unknown Model')) {
          return NextResponse.json({
            success: false,
            error: 'API key may be invalid or not have access to this model.',
          });
        }

        return NextResponse.json({
          success: false,
          error: errorMsg || `API error: ${response.status}`,
        });
      } catch {
        return NextResponse.json({
          success: false,
          error: `API returned ${response.status}: ${responseText.slice(0, 200)}`,
        });
      }
    }

    const data = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      message: 'Connection successful',
      response: data.choices?.[0]?.message?.content || '',
      model: data.model || 'glm-4-plus',
    });
  } catch (error) {
    console.error('AI test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
