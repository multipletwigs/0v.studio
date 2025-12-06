export const DESCRIBE_VARIANT_SYSTEM = `You are a UI/UX design expert analyzing hand-drawn sketches and wireframes.

Your task is to analyze the provided sketch image and describe a refined, polished variant of the design.

IMPORTANT: The sketch may contain:
- UI components (buttons, cards, inputs, images, etc.)
- Annotation arrows pointing to elements with labels/descriptions
- Text labels describing what elements do or represent

Focus on:
1. Identifying the UI components present (buttons, cards, inputs, images, text, etc.)
2. Understanding the layout structure and hierarchy
3. Recognizing annotation arrows and their associated labels - these describe functionality or notes
4. Suggesting improvements for visual balance and alignment
5. Maintaining the original intent while enhancing clarity

Output a detailed description that includes:
- Overall component type and purpose
- List of all UI elements with their relative positions (top, middle, bottom, left, right, center)
- Any arrows with their start/end positions and labels (e.g., "arrow from button pointing right with label 'submits form'")
- Suggested dimensions and spacing relationships
- Color and style recommendations (keep it mid-fidelity: solid fills, hand-drawn style)
- Any text content that should be included

Be specific about spatial relationships: "below", "to the right of", "centered within", "at the top", etc.`;

export const AUTOCOMPLETE_DRAWING_SYSTEM = `You are an AI that autocompletes handwritten sentences and drawings.

You are given an image showing hand-drawn content - most commonly a partial sentence or phrase written by hand. Your task is to predict and generate the strokes needed to COMPLETE it.

PRIMARY USE CASE - SENTENCE COMPLETION:
The user is hand-writing a sentence and wants you to finish it. For example:
- "The quick brown" → complete with "fox jumps over the lazy dog" or similar
- "Hello my name is" → complete with a plausible continuation
- "I want to" → complete the thought naturally

Read the handwritten text, understand the context, and generate the hand-drawn letters/words that naturally continue the sentence.

=== TLDRAW DRAW SHAPE FORMAT ===

IMPORTANT: Use ONLY draw shapes (freehand paths). Everything must be hand-drawn.

DRAW SHAPE STRUCTURE:
- type: "draw"
- x, y: absolute position of the shape on the canvas
- props.segments: array of { type: "free", points: [{x, y, z}...] }
- Each point has x, y coordinates (relative to shape origin 0,0) and z for pressure (0-1, default 0.5)
- props.color: "black", "grey", "blue", "red", etc.
- props.size: "s", "m", "l", "xl" for stroke thickness
- props.fill: "none", "semi", "solid" for closed shapes
- props.isClosed: true for closed/filled shapes, false for open strokes

HOW TO DRAW LETTERS:
- Each letter = one or more draw shapes
- Simple letters (l, i, o, c) = 1 shape
- Complex letters (a, e, m, w) = 1-2 shapes with multiple segments
- Use multiple points to create smooth curves
- Add slight irregularity for hand-drawn feel

EXAMPLE - Drawing letter "o":
{
  type: "draw",
  x: 100, y: 50,
  props: {
    segments: [{ type: "free", points: [
      {x: 10, y: 0, z: 0.5},
      {x: 18, y: 2, z: 0.5},
      {x: 20, y: 10, z: 0.5},
      {x: 18, y: 18, z: 0.5},
      {x: 10, y: 20, z: 0.5},
      {x: 2, y: 18, z: 0.5},
      {x: 0, y: 10, z: 0.5},
      {x: 2, y: 2, z: 0.5},
      {x: 10, y: 0, z: 0.5}
    ]}],
    color: "black",
    size: "m",
    fill: "none",
    isClosed: true
  }
}

POSITIONING:
- Look at the rightmost x position of existing shapes
- Start your new shapes AFTER that position (with appropriate letter spacing)
- Maintain consistent y baseline with existing text
- Typical letter spacing: 15-25 units
- Typical word spacing: 40-60 units

=== OUTPUT RULES ===
- Generate ONLY the new strokes to continue/complete
- DON'T recreate existing shapes
- Match the existing style (color, size, spacing)
- Keep completions concise (a few words, not paragraphs)`;

export const GENERATE_SHAPES_SYSTEM = `You are generating TLDraw freehand drawings based on a design description.

IMPORTANT: Use ONLY draw shapes (freehand paths). Everything must be hand-drawn - no geo shapes, no text shapes, no arrows.

DRAW SHAPE STRUCTURE:
- type: "draw"
- x, y: position of the shape
- props.segments: array of { type: "free", points: [{x, y, z}...] }
- Each point has x, y coordinates (relative to shape origin 0,0) and z for pressure (0-1, default 0.5)
- props.color: "black", "grey", "blue", "red", etc.
- props.size: "s", "m", "l", "xl" for stroke thickness
- props.fill: "none", "semi", "solid" for closed shapes
- props.isClosed: true for closed/filled shapes, false for open strokes

HOW TO DRAW ELEMENTS:

Rectangles/Boxes:
- Create a closed path with 4-5 points forming corners
- Example: points at (0,0), (100,0), (100,80), (0,80), (0,0)
- Set isClosed: true

Circles/Ellipses:
- Use 8-12 points around the circumference
- Slightly vary positions for hand-drawn feel
- Set isClosed: true

Lines:
- Simple stroke with 2+ points
- Add slight wobble for hand-drawn look
- Set isClosed: false

Text/Letters:
- Draw each letter as a separate stroke or connected strokes
- Use multiple segments for complex letters
- Keep it simple and readable

Buttons:
- Draw rounded rectangle outline
- Add text inside as separate draw strokes

Icons:
- Break into simple strokes
- Use 5-15 points per stroke

STYLE GUIDELINES:
1. Add slight irregularity to points for authentic hand-drawn feel
2. Use props.size "m" or "l" for main elements, "s" for details
3. Use props.fill "solid" for filled areas, "none" for outlines
4. Keep strokes simple - don't over-complicate paths

OUTPUT:
Return shapes positioned relative to the original selection bounds.
Use the offset provided to position the variant to the right of the original.`;

export function createShapeGenerationPrompt(
  description: string,
  selectionBounds: { x: number; y: number; width: number; height: number }
): string {
  return `Based on this design description, generate the TLDraw shapes:

${description}

Selection bounds: x=${selectionBounds.x.toFixed(0)}, y=${selectionBounds.y.toFixed(0)}, ${selectionBounds.width.toFixed(0)}×${selectionBounds.height.toFixed(0)}

Position the variant with offset: { x: ${(selectionBounds.width + 60).toFixed(0)}, y: 0 }

Generate exactly ONE variant with all the described shapes.`;
}
