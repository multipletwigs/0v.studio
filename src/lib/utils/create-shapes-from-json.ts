import type { Editor, TLShapeId } from 'tldraw';
import { createShapeId, toRichText } from 'tldraw';

export interface ShapeDefinition {
  id?: string;
  type: 'geo' | 'text' | 'draw' | 'arrow';
  x: number;
  y: number;
  rotation?: number;
  props: Record<string, unknown>;
}

export interface ShapesJSON {
  shapes: ShapeDefinition[];
}

/**
 * Creates tldraw shapes from a JSON definition
 */
export function createShapesFromJSON(editor: Editor, json: ShapesJSON): string[] {
  const createdShapeIds: TLShapeId[] = [];

  for (const shapeDef of json.shapes) {
    const shapeId = shapeDef.id as TLShapeId || createShapeId();

    // Transform props: convert text -> richText for geo shapes
    const transformedProps = { ...shapeDef.props } as Record<string, unknown>;
    if ('text' in transformedProps && typeof transformedProps.text === 'string') {
      transformedProps.richText = toRichText(transformedProps.text);
      delete transformedProps.text;
    }

    editor.createShape({
      id: shapeId,
      type: shapeDef.type,
      x: shapeDef.x,
      y: shapeDef.y,
      rotation: shapeDef.rotation ?? 0,
      props: transformedProps,
    });

    createdShapeIds.push(shapeId);
  }

  // Select all created shapes
  if (createdShapeIds.length > 0) {
    editor.setSelectedShapes(createdShapeIds);
  }

  return createdShapeIds;
}

/**
 * Example usage with the provided JSON structure
 */
export const exampleShapesJSON: ShapesJSON = {
  shapes: [
    {
      id: 'shape:outer-rectangle',
      type: 'geo',
      x: 100,
      y: 100,
      props: {
        w: 600,
        h: 800,
        geo: 'rectangle',
        color: 'black',
        fill: 'none',
        dash: 'draw',
        size: 'm',
      },
    },
    {
      id: 'shape:oval',
      type: 'geo',
      x: 250,
      y: 220,
      props: {
        w: 400,
        h: 280,
        geo: 'ellipse',
        color: 'black',
        fill: 'none',
        dash: 'draw',
        size: 'm',
      },
    },
    {
      id: 'shape:text-box',
      type: 'geo',
      x: 220,
      y: 680,
      props: {
        w: 460,
        h: 100,
        geo: 'rectangle',
        color: 'black',
        fill: 'none',
        dash: 'draw',
        size: 'm',
        text: 'YOU',
      },
    },
  ],
};

