import { createGateway, generateObject } from 'ai';
import { variantsResponseSchema } from '@/lib/schemas/shape-variants';
import type { GenerateVariantsRequest } from '@/lib/types/variant-state';
import { NextRequest, NextResponse } from 'next/server';

const gateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body: GenerateVariantsRequest = await request.json();
    const { shapes, selectionBounds, context } = body;

    if (!shapes || shapes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No shapes provided' },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are generating TLDraw shapes for a mid-fidelity music player component.

Use ONLY the following two shape types:
-   geo shapes that follow geoShapeSchema
-   text shapes that follow textShapeSchema

Your output MUST be:
-   A single JSON array of shape objects.
-   No comments, no extra fields, no explanations – just the array.

MID-FI RULES

1. Create ONE main component card as a geo rectangle.
   This card is the boundary for the entire component.
2. Every other shape (text or geo) MUST sit fully inside the card interior with clear padding.
   - No shape may extend outside the card width or height.
   - Leave at least 16 px of space between any inner shape and the card border.
3. Mid-fi means SOLID color fills but HAND-DRAWN line style:
   - For surfaces like the card background, buttons, bars, set fill to solid.
   - For image placeholders (album art) set fill to pattern.
   - For ALL geo shapes, set dash to draw for a hand-drawn sketchy line style.
4. Do NOT use gradients or shadows. Only solid fills, patterns, and hand-drawn strokes.
5. You choose the numeric values for x, y, w, h, but you MUST respect the layout rules below.

REQUIRED ELEMENTS

You MUST create all of the following:

1. Card container (component boundary)
   - type: geo
   - props.geo: rectangle
   - props.fill: solid
   - props.dash: draw
   - Tall vertical orientation (height greater than width).
   - Largest shape; everything else is inside this.

2. Album artwork placeholder as a CIRCLE at the TOP
   - type: geo
   - props.geo: ellipse
   - props.fill: pattern (to represent image placeholder)
   - props.dash: draw
   - Positioned in the UPPER portion of the card, HORIZONTALLY CENTERED.
   - Width and height are EQUAL (a perfect circle).
   - Constraints:
     - At least 16 px from top, left, and right card edges.
     - Large and visually prominent but leaves room below for other elements.

3. Small label text BELOW the artwork
   - type: text
   - Text content: NOW PLAYING
   - Positioned BELOW the album artwork with a small vertical gap.
   - HORIZONTALLY CENTERED within the card.
   - props.size: s
   - props.font: draw
   - props.textAlign: middle

4. Main song title BELOW the label
   - type: text
   - Positioned DIRECTLY BELOW the NOW PLAYING label with a small vertical gap.
   - HORIZONTALLY CENTERED within the card.
   - props.size: l or xl
   - props.font: draw
   - props.textAlign: middle

5. Artist name BELOW the song title
   - type: text
   - Positioned BELOW the song title with a small vertical gap.
   - HORIZONTALLY CENTERED within the card.
   - props.size: m
   - props.font: draw
   - props.textAlign: middle

6. Progress bar near the BOTTOM, HORIZONTALLY CENTERED
   Use TWO or THREE geo shapes:

   a. Background bar
      - type: geo
      - props.geo: rectangle
      - props.dash: draw
      - Positioned in the LOWER portion of the card, ABOVE the button row.
      - HORIZONTALLY CENTERED (equal spacing from left and right card edges).
      - Spans about 80 percent of the card width.
      - Short in height (thin bar).
      - props.fill: none or light solid fill.

   b. Filled portion
      - type: geo
      - props.geo: rectangle
      - props.dash: draw
      - Same y and height as background bar.
      - Starts at the same x as background bar.
      - Shorter width than background bar.
      - props.fill: solid with a stronger color.

   c. Optional knob/handle
      - type: geo
      - props.geo: ellipse
      - props.dash: draw
      - Small circle centered vertically on the progress bar.
      - x positioned at the right edge of the filled portion.

7. TWO buttons at the BOTTOM in a horizontal row, CENTERED
   Each button consists of one geo and one text:

   a. Left button (e.g. Previous or Shuffle)
      - type: geo
      - props.geo: rectangle
      - props.fill: solid
      - props.dash: draw
      - Positioned at the BOTTOM of the card, LEFT of center.
      - At least 16 px from bottom and left card edges.
      - Width greater than height (pill-like).

      Button label inside:
      - type: text
      - Centered inside the button shape.
      - Text content: Prev or Shuffle
      - props.size: s or m
      - props.font: draw
      - props.textAlign: middle

   b. Right button (e.g. Play or Next)
      - type: geo
      - props.geo: rectangle
      - props.fill: solid
      - props.dash: draw
      - Positioned at the BOTTOM of the card, RIGHT of center.
      - At least 16 px from bottom and right card edges.
      - Same height as left button.
      - Small horizontal gap between left and right buttons.

      Button label inside:
      - type: text
      - Centered inside the button shape.
      - Text content: Play or Next
      - props.size: s or m
      - props.font: draw
      - props.textAlign: middle

LAYOUT RELATIONSHIPS (STRICT)

1. Decide the card x, y, w, h first. The card should be TALL (vertical orientation).
2. For every inner shape, enforce:
   - card.x + 16 is less than or equal to shape.x
   - shape.x + shape.w is less than or equal to card.x + card.w - 16
   - card.y + 16 is less than or equal to shape.y
   - shape.y + shape.h is less than or equal to card.y + card.h - 16
3. Horizontal alignment:
   - Album artwork is CENTERED horizontally within the card.
   - All text labels are CENTERED horizontally within the card.
   - Progress bar is CENTERED horizontally within the card.
   - The two buttons together are CENTERED as a row (equal space on left and right).
4. Vertical order INSIDE the card (from top to bottom):
   1. Album artwork (circle)
   2. NOW PLAYING label
   3. Song title
   4. Artist name
   5. Progress bar
   6. Button row (two buttons side by side)

TEXT AND FONT SETTINGS

For all text shapes:
-  props.autoSize: true
-  props.font: draw (hand-drawn style)
-  props.textAlign: middle (everything is centered in this layout)

OUTPUT FORMAT

-  Return ONLY the JSON array of shapes.
-  Do not include any explanation, comments, or schema definitions.
-  Ensure every object strictly follows geoShapeSchema or textShapeSchema.

## Output Format
Generate exactly ONE refined mockup. Position it to the right of the original:
- offset: { x: ${(selectionBounds.width + 60).toFixed(0)}, y: 0 }


Selection: x=${selectionBounds.x.toFixed(0)}, y=${selectionBounds.y.toFixed(0)}, ${selectionBounds.width.toFixed(0)}×${selectionBounds.height.toFixed(0)}`;

    const userPrompt = `follow the instructions exactly
`;

    const result = await generateObject({
      model: gateway('anthropic/claude-sonnet-4.5'),
      schema: variantsResponseSchema,
      system: systemPrompt,
      prompt: userPrompt,
      maxRetries: 5
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
