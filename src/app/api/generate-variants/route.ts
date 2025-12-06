import { createGateway, generateObject } from 'ai';
import { variantsResponseSchema } from '@/lib/schemas/shape-variants';
import type { GenerateVariantsRequest } from '@/lib/types/variant-state';
import { NextRequest, NextResponse } from 'next/server';
import { GENERATE_SHAPES_SYSTEM } from '@/lib/ai/prompts';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVariantsRequest = await request.json();
    const { imageBase64, svgString, selectionBounds, context } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    const result = await generateObject({
      model: gateway('anthropic/claude-opus-4-5'),
      schema: variantsResponseSchema,
      system: GENERATE_SHAPES_SYSTEM,
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
              text: `Recreate this hand-drawn sketch as freehand draw shapes.

${svgString ? `SVG reference:\n${svgString}\n` : ''}
${context ? `Context: ${context}\n` : ''}
Selection bounds: x=${selectionBounds.x.toFixed(0)}, y=${selectionBounds.y.toFixed(0)}, ${selectionBounds.width.toFixed(0)}×${selectionBounds.height.toFixed(0)}

Position the variant with offset: { x: ${(selectionBounds.width + 60).toFixed(0)}, y: 0 }

Generate exactly ONE variant recreating all the drawn elements as freehand paths.`,
            },
          ],
        },
      ],
      maxRetries: 3,
    });

    return NextResponse.json({
      success: true,
      data: result.object,
    });
  } catch (error) {
    console.error('Error generating variants:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate variants',
      },
      { status: 500 }
    );
  }
}
