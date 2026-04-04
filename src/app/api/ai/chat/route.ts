import { NextResponse } from 'next/server';

/**
 * Chat with z.ai API
 * POST /api/ai/chat
 * Body: { apiKey: string, baseUrl?: string, messages: ChatMessage[], context?: string }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, baseUrl, messages, context } = body;

    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

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
            'You are a helpful assistant for Traffic Controllers in Western Australia. Answer questions about traffic management, WHS, and road work procedures.',
        };

    // Default base URL for z.ai API
    const apiUrl = baseUrl || 'https://api.z.ai/v1/chat/completions';

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'X-Z-AI-From': 'Z',
      },
      body: JSON.stringify({
        messages: [systemMessage, ...messages],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
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
