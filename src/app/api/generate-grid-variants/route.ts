import { createGateway, generateText, generateObject } from 'ai';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Stage 1: Description generation schema
const variantDescriptionsSchema = z.object({
  seed_context: z.string().describe('A brief description of what the seed image depicts'),
  descriptions: z
    .array(z.string())
    .length(3)
    .describe('Three different layout variant descriptions'),
});

const DESCRIPTION_SYSTEM = `You are a creative design analyst. Given a tldraw drawing (the "seed"), analyze it and generate 3 different layout variant ideas.

CONTEXT: The seed image is a drawing created in tldraw (a digital drawing/whiteboard tool). All variants should maintain the tldraw drawing style.

Your task:
1. Identify what the seed drawing depicts (seed_context) - describe the content, elements, and purpose
2. Analyze what components or functionality might be missing that this type of element typically has
3. Generate 3 creative layout variants that explore different arrangements AND potentially include additional typical components/functionality

Each variant description should:
- Be detailed enough to recreate the concept with different layout/composition
- Consider adding missing typical components (e.g., if it's a form, maybe add submit button; if it's a card, maybe add actions/metadata; if it's a navigation, maybe add search/icons)
- Focus on how to rearrange, reposition, or restructure the elements
- Explore new spatial arrangements while enhancing completeness
- Be specific about positioning and relationships between elements

Return exactly 3 creative variant descriptions that explore both layout changes and functional enhancements.`;

interface GridVariantsRequest {
  image: string;
  svg: string;
  variantCount: number;
  cellWidth: number;
  cellHeight: number;
}

async function generateImageVariant(
  seedImageBase64: string,
  seedContext: string,
  variantDescription: string
): Promise<string> {
  // Generate a tldraw-style variant
  const imagePrompt = `Generate an image in tldraw drawing style. Content: ${seedContext}. Layout: ${variantDescription}. Style: Match the tldraw digital drawing aesthetic shown in the seed image - simple vector-like drawings with clean lines, basic shapes, and minimal colors. Maintain the same drawing style and visual language while applying the new layout.`;

  console.log('[generate-image-variant] Prompt:', imagePrompt);

  // Using Google Gemini's native image generation via generateText
  // Include the seed image as reference for style matching
  const result = await generateText({
    model: gateway('google/gemini-3-pro-image'),
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            image: seedImageBase64,
          },
          {
            type: 'text',
            text: imagePrompt,
          },
        ],
      },
    ],
  });

  // Extract the image from the files
  for (const file of result.files) {
    if (file.mediaType.startsWith('image/')) {
      // Return as base64 data URL with proper prefix
      return `data:${file.mediaType};base64,${file.base64}`;
    }
  }

  throw new Error('No image generated in response');
}

export async function POST(request: NextRequest) {
  try {
    const body: GridVariantsRequest = await request.json();
    const { image, svg, variantCount, cellWidth, cellHeight } = body;

    console.log('[generate-grid-variants] Request received', {
      hasImage: !!image,
      hasSvg: !!svg,
      variantCount,
      cellWidth,
      cellHeight,
    });

    if (!image) {
      return NextResponse.json(
        { success: false, error: 'No image provided' },
        { status: 400 }
      );
    }

    // === STAGE 1: Generate descriptions ===
    console.log('[generate-grid-variants] Stage 1: Generating descriptions...');
    const stage1Start = Date.now();

    const descriptionResponse = await generateObject({
      model: gateway('anthropic/claude-sonnet-4-5'),
      schema: variantDescriptionsSchema,
      system: DESCRIPTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: image,
            },
            {
              type: 'text',
              text: 'Analyze this seed image and generate 3 creative layout variant descriptions. Background must be white.',
            },
          ],
        },
      ],
      maxRetries: 3,
    });

    const parsedDescriptions = descriptionResponse.object;

    const stage1Duration = Date.now() - stage1Start;
    console.log('[generate-grid-variants] Stage 1 completed', {
      duration: `${stage1Duration}ms`,
      seedContext: parsedDescriptions.seed_context,
      descriptionCount: parsedDescriptions.descriptions.length,
    });

    // === STAGE 2: Generate images in parallel ===
    console.log('[generate-grid-variants] Stage 2: Generating images in parallel...');
    const stage2Start = Date.now();

    const imagePromises = parsedDescriptions.descriptions.map((description, index) => {
      console.log(`[generate-grid-variants] Starting variant ${index + 1}`);
      return generateImageVariant(image, parsedDescriptions.seed_context, description);
    });

    const imageUrls = await Promise.all(imagePromises);

    const stage2Duration = Date.now() - stage2Start;
    console.log('[generate-grid-variants] Stage 2 completed', {
      duration: `${stage2Duration}ms`,
      imageCount: imageUrls.length,
    });

    const totalDuration = Date.now() - stage1Start;
    console.log('[generate-grid-variants] Total duration:', `${totalDuration}ms`);

    return NextResponse.json({
      success: true,
      seed_context: parsedDescriptions.seed_context,
      descriptions: parsedDescriptions.descriptions,
      variants: imageUrls.map((url, index) => ({
        imageUrl: url,
        description: parsedDescriptions.descriptions[index],
      })),
    });
  } catch (error) {
    console.error('[generate-grid-variants] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate variants',
      },
      { status: 500 }
    );
  }
}
