import { createGateway, generateText, generateObject } from 'ai';
import { put } from '@vercel/blob';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

// Stage 1: Description generation schema
const variantDescriptionsSchema = z.object({
  seed_context: z.string().describe('A detailed description of what the seed image depicts, including its content, elements, purpose, and visual style'),
  descriptions: z
    .array(z.string())
    .length(3)
    .describe('An array of exactly 3 different detailed layout variant descriptions. Each description should be a separate string element in the array, not a single combined string.'),
});

const DESCRIPTION_SYSTEM = `You are a skilled UI/UX designer. Given a tldraw wireframe drawing (the "seed"), generate 3 practical yet creative variant designs.

BALANCE: Be creative but realistic. These should be usable UI designs, not abstract art.

Your task:
1. Identify what the seed drawing depicts (seed_context)
2. Generate 3 distinct but REALISTIC UI variants - different layouts, styles, and arrangements that could actually ship in a product

Each variant description should include:

LAYOUT:
- Spatial arrangement and element positioning
- Visual hierarchy and flow
- Spacing and proportions

VISUAL STYLE:
- They should resemble rough sketches of the final UI, but done with solid lines 
- You may use shades or squiggles or any other typical sketching methods to make it look digitally hand-drawn.
- You may add details to the component that makes sense.
- Each generated variant needs to explore a different layout and different style to the original seed component. It is important that you generate very different layouts keeping the same core functionalitity. 

FUNCTIONAL ADDITIONS:
- What useful elements could enhance this UI?
- Different ways to organize the same information
- Mobile-friendly vs desktop-optimized approaches

Keep the tldraw wireframe hand drawn aesthetic. Each description should be 3-5 sentences with enough detail to recreate the design.

OUTPUT FORMAT:
- seed_context: What the seed image depicts in terms of functionality and what the seed image is. Do not go into detail into the seed image's layout.
- descriptions: Array of exactly 3 variant descriptions

Be creative within the bounds of practical UI design.`;

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
  variantDescription: string,
  index: number
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

  // Extract the image from the files and upload to Vercel Blob
  for (const file of result.files) {
    if (file.mediaType.startsWith('image/')) {
      const buffer = Buffer.from(file.base64, 'base64');
      const ext = file.mediaType.split('/')[1] || 'png';
      const filename = `variant-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const blob = await put(filename, buffer, {
        access: 'public',
        contentType: file.mediaType,
      });

      console.log(`[generate-image-variant] Uploaded to Vercel Blob: ${blob.url}`);
      return blob.url;
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
              text: 'Analyze this seed image and generate exactly 3 highly detailed and creative layout variant descriptions. Each description should be a separate item in the descriptions array. All backgrounds must be white.',
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
      return generateImageVariant(image, parsedDescriptions.seed_context, description, index);
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
