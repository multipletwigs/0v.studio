import { createGateway, generateObject } from 'ai';
import { variantsResponseSchema } from '@/lib/schemas/shape-variants';
import type { GenerateVariantsRequest } from '@/lib/types/variant-state';
import { NextRequest, NextResponse } from 'next/server';
import { AUTOCOMPLETE_DRAWING_SYSTEM } from '@/lib/ai/prompts';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVariantsRequest = await request.json();
    const { imageBase64, svgString, selectionBounds, existingShapes, context } = body;

    console.log('[generate-variants] Request received', {
      hasImage: !!imageBase64,
      imageSize: imageBase64?.length ?? 0,
      hasSvg: !!svgString,
      svgSize: svgString?.length ?? 0,
      selectionBounds,
      existingShapesCount: existingShapes?.length ?? 0,
      context,
    });

    if (!imageBase64) {
      console.log('[generate-variants] Error: No image provided');
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    console.log('[generate-variants] Calling Sonnet...');
    const startTime = Date.now();

    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4.5'),
      schema: variantsResponseSchema,
      system: AUTOCOMPLETE_DRAWING_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: `data:image/png;base64,${imageBase64}`,
            },
            {
              type: 'text',
              text: `Read the handwritten text in this image and autocomplete the sentence. Generate TLDraw draw shapes for the continuation - only the NEW letters/words needed to finish the thought.

EXISTING SHAPES (do not recreate these):
${JSON.stringify(existingShapes ?? [], null, 2)}

SELECTION BOUNDS: x=${selectionBounds.x}, y=${selectionBounds.y}, width=${selectionBounds.width}, height=${selectionBounds.height}

Position your new shapes starting AFTER x=${selectionBounds.x + selectionBounds.width} to continue the text.`,
            },
          ],
        },
      ],
      maxRetries: 3,
    });

    const duration = Date.now() - startTime;
    console.log('[generate-variants] Opus completed', {
      duration: `${duration}ms`,
      variantCount: result.object.variants.length,
      shapeCount: result.object.variants[0]?.shapes.length ?? 0,
    });

    return NextResponse.json({
      success: true,
      data: result.object,
    });
  } catch (error) {
    console.error('[generate-variants] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate variants',
      },
      { status: 500 }
    );
  }
}
