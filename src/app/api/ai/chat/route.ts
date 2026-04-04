import { NextResponse } from 'next/server';

/**
 * Chat with z.ai API
 * POST /api/ai/chat
 * Body: { apiKey?: string, messages: ChatMessage[], context?: string }
 *
 * Uses internal endpoint if no API key provided, or user's key with public API.
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

    // Use internal endpoint if no user API key provided
    const useInternal = !apiKey;
    const apiUrl = useInternal
      ? 'http://172.25.136.193:8080/v1/chat/completions'
      : 'https://z.ai/api/v1/chat/completions';

    // Build headers based on which endpoint we're using
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (useInternal) {
      // Internal endpoint needs X-Token (currently not configured)
      headers['Authorization'] = 'Bearer Z.ai';
      headers['X-Z-AI-From'] = 'Z';
      headers['X-Token'] = 'Z.ai';
    } else {
      // Public API with user's key
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages: [systemMessage, ...messages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);

      // Parse error for better messages
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.code === 'insufficient_balance') {
          return NextResponse.json(
            {
              success: false,
              error: 'Insufficient API balance. Please add credits to your z.ai account.',
              needsCredits: true,
            },
            { status: 200 }
          );
        }
      } catch {
        // Not JSON, continue with raw error
      }

      return NextResponse.json(
        {
          success: false,
          error: `API returned ${response.status}: ${errorText.slice(0, 500)}`,
        },
        { status: 200 }
      );
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 200 }
    );
  }
}
