import { NextResponse } from 'next/server';

/**
 * Chat with z.ai API
 * POST /api/ai/chat
 * Body: { apiKey?: string, messages: ChatMessage[], context?: string }
 *
 * Uses z.ai public API: https://api.z.ai/api/paas/v4/chat/completions
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, messages, context } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required. Configure it in Settings.' },
        { status: 400 }
      );
    }

    // Build system message with context if provided
    const systemMessage = context
      ? {
          role: 'system' as const,
          content: `You are a helpful assistant for Traffic Controllers in Western Australia. Answer questions based on the following document context:\n\n${context}`,
        }
      : {
          role: 'system' as const,
          content:
            'You are a helpful assistant for Traffic Controllers in Western Australia. Answer questions about traffic management, WHS, and road work procedures. Be concise and practical.',
        };

    // z.ai API endpoint (from docs.z.ai)
    const apiUrl = 'https://api.z.ai/api/paas/v4/chat/completions';

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-4-plus',
        messages: [systemMessage, ...messages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);

      // Parse error for better messages
      try {
        const errorJson = JSON.parse(errorText);
        const errorCode = errorJson.error?.code;
        const errorMsg = errorJson.error?.message || errorJson.error?.code;

        if (errorCode === '1113' || errorMsg?.includes('Insufficient balance')) {
          return NextResponse.json({
            success: false,
            error:
              'Insufficient API balance. Please add credits to your z.ai account at z.ai/manage-apikey/billing',
            needsCredits: true,
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
        // Not JSON, return raw error
        return NextResponse.json({
          success: false,
          error: `API returned ${response.status}: ${errorText.slice(0, 200)}`,
        });
      }
    }

    const data = await response.json();

    // Extract the assistant's response
    const assistantMessage = data.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      answer: assistantMessage,
      usage: data.usage,
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
