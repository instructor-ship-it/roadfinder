import { NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';

/**
 * Chat with z.ai API using the built-in SDK
 * POST /api/ai/chat
 * Body: { messages: ChatMessage[], context?: string }
 *
 * Note: Uses internal z.ai SDK configured in this environment.
 * No API key required from users.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, context } = body;

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

    // Create SDK instance (uses internal config from /etc/.z-ai-config)
    const zai = await ZAI.create();

    // Make the chat completion request
    const response = await zai.chat.completions.create({
      messages: [systemMessage, ...messages],
    });

    // Extract the assistant's response
    const assistantMessage = response.choices?.[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      answer: assistantMessage,
      usage: response.usage,
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
