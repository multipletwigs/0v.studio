import { createGateway, generateText, generateObject } from 'ai';
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

const DESCRIPTION_SYSTEM = `You are a creative UI/UX design analyst specializing in digital wireframes and mockups. Given a tldraw drawing (the "seed"), analyze it deeply and generate 3 highly detailed and creative layout variant descriptions.

CONTEXT: The seed image is a drawing created in tldraw (a digital drawing/whiteboard tool). All variants should maintain the tldraw drawing style - simple vector-like drawings with clean lines, basic shapes (rectangles, circles, lines), and minimal colors typical of wireframe/mockup aesthetics.

Your task:
1. Identify what the seed drawing depicts (seed_context) - describe the content, elements, purpose, and visual style in detail
2. Analyze what components or functionality might be missing that this type of element typically has
3. Generate 3 highly creative and distinct layout variants that explore different arrangements AND potentially include additional typical components/functionality

Each variant description MUST be extremely detailed and include:

LAYOUT & STRUCTURE:
- Precise spatial arrangement (e.g., "navigation bar at top spanning full width", "3-column grid layout with 20px gaps", "sidebar on left taking 1/4 of width")
- Exact positioning of elements (top/bottom/left/right/center, with relative sizing)
- Hierarchy and visual flow (what catches attention first, reading order)
- Spacing and padding details (tight, spacious, compact, airy)

VISUAL ELEMENTS:
- All shapes present (rectangles, circles, lines, text blocks, icons)
- Size and proportions of each element relative to others
- Visual style (outlined boxes, filled shapes, line weights, rounded corners vs sharp corners)
- Text elements (headings, body text, labels, captions) and their relative sizing
- Any icons, buttons, or interactive elements with their appearance

CREATIVE VARIATIONS:
- Completely different spatial arrangements from the seed (horizontal → vertical, grid → stack, etc.)
- Additional missing typical components that would enhance functionality (if it's a form: add submit button, validation messages; if it's a card: add actions, timestamps, avatars; if it's a navigation: add search, notifications, user menu)
- Experimental layouts that push creative boundaries while staying practical
- Different visual hierarchies and emphasis

COLOR & STYLE NOTES:
- Mention any color blocks, shading, or emphasis areas
- Note the drawing style specifics (hand-drawn feel, geometric precision, wireframe aesthetic)
- Background treatment (white background, sections, dividers)

FUNCTIONAL ENHANCEMENTS:
- What new interactive elements are added (buttons, dropdowns, toggles, sliders)
- What information hierarchy changes improve usability
- How the variant solves potential UX issues from the seed

Each description should be 4-6 sentences minimum, rich with visual and spatial details that an image generation model can use to accurately recreate the design. Be specific about EVERYTHING - shapes, sizes, positions, colors, text, spacing, and relationships between elements.

OUTPUT FORMAT:
- seed_context: A single detailed string describing the seed image
- descriptions: An array containing exactly 3 separate string descriptions (NOT a single combined string, but 3 individual array elements)

Return exactly 3 creative variant descriptions that are visually distinct and functionally enhanced.`;

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
