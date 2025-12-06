import { createClient, type ChatDetail } from 'v0-sdk';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imageUrl, seedContext, variantDescription } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { success: false, error: 'No image URL provided' },
        { status: 400 }
      );
    }

    console.log('[generate-ui] Using image URL:', imageUrl);
    console.log('[generate-ui] Seed context:', seedContext);
    console.log('[generate-ui] Variant description:', variantDescription);

    const apiKey = process.env.V0_API_KEY
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'V0 API key not configured' },
        { status: 500 }
      );
    }

    const client = createClient({
      apiKey,
    });


    console.log('[generate-ui] Creating v0 chat with image...');

    // Build a rich prompt with context if available
    let contextPrompt = '';
    if (seedContext) {
      contextPrompt += `\n\nCONTEXT: This is a UI mockup for: ${seedContext}`;
    }
    if (variantDescription) {
      contextPrompt += `\n\nDESIGN DESCRIPTION: ${variantDescription}`;
    }

    // Create a chat with v0 SDK using the image URL
    const chat = await client.chats.create({
      message: `
        You are an expert design engineer, who builds the most beautiful UI in the world.
        You will receive a mid-fi mockup of a component. You will need to build a complete version of the UI, extending from the mockup.
        Its UI should be production ready, super polished, and can be competing with any other app in the market.
        It should also be realistic and functional.
        Generate clean, production-ready code UI with Tailwind CSS and shadcn/ui components.
        ${contextPrompt}
      `,
      responseMode: 'sync',
      attachments: [
        {
          url: imageUrl,
        },
      ],
      modelConfiguration: {
        modelId: 'v0-1.5-md',
        imageGenerations: false,
      },
    });

    // Type guard to ensure we have a ChatDetail and not a stream
    if (chat instanceof ReadableStream) {
      return NextResponse.json(
        { success: false, error: 'Unexpected streaming response' },
        { status: 500 }
      );
    }

    const chatDetail = chat as ChatDetail;
    console.log('[generate-ui] Chat created:', chatDetail.id);
    console.log('[generate-ui] Full chatDetail:', JSON.stringify(chatDetail, null, 2));
    console.log('[generate-ui] Initial chat state:', {
      hasLatestVersion: !!chatDetail.latestVersion,
      files: chatDetail.latestVersion?.files?.length || 0,
      demoUrl: chatDetail.latestVersion?.demoUrl,
    });

    // Wait for preview URL to be available
    let previewUrl = chatDetail.latestVersion?.demoUrl || '';

    if (!previewUrl) {
      // Poll for preview URL if not immediately available
      let attempts = 0;
      const maxAttempts = 300;
      const delayMs = 2000;

      console.log('[generate-ui] Preview URL not immediately available, polling...');

      while (attempts < maxAttempts && !previewUrl) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        attempts++;

        try {
          const updatedChat = await client.chats.getById({ chatId: chatDetail.id });
          console.log(`[generate-ui] Poll attempt ${attempts}:`, {
            hasLatestVersion: !!updatedChat.latestVersion,
            demoUrl: updatedChat.latestVersion?.demoUrl,
          });

          if (updatedChat.latestVersion?.demoUrl) {
            previewUrl = updatedChat.latestVersion.demoUrl;
            console.log('[generate-ui] Preview URL found after polling');
            break;
          }
        } catch (pollError) {
          console.error(`[generate-ui] Error polling attempt ${attempts}:`, pollError);
        }
      }
    }

    if (!previewUrl) {
      console.error('[generate-ui] No preview URL generated after polling');
      return NextResponse.json(
        {
          success: false,
          error: `Preview generation is taking longer than expected. Chat ID: ${chatDetail.id}. You can check the chat status manually. Please try again later.`,
          chatId: chatDetail.id,
        },
        { status: 500 }
      );
    }

    console.log('[generate-ui] UI generation completed:', {
      chatId: chatDetail.id,
      chatUrl: chatDetail.webUrl,
      previewUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        chatId: chatDetail.id,
        chatUrl: chatDetail.webUrl,
        previewUrl,
        chatDetail,
      },
    });
  } catch (error) {
    console.error('[generate-ui] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate UI',
      },
      { status: 500 }
    );
  }
}

