import type { Editor } from 'tldraw';
import type { ShapeDefinition } from './create-shapes-from-json';

export interface ShapesJSON {
  shapes: ShapeDefinition[];
}

/**
 * Exports selected shapes from tldraw to JSON format
 */
export function exportShapesToJSON(editor: Editor): ShapesJSON | null {
  const selectedIds = editor.getSelectedShapeIds();
  
  if (selectedIds.length === 0) {
    return null;
  }

  const shapes: ShapeDefinition[] = [];

  for (const shapeId of selectedIds) {
    const shape = editor.getShape(shapeId);
    if (!shape) continue;

    // Convert shape to JSON format
    const shapeDef: ShapeDefinition = {
      id: shape.id,
      type: shape.type as 'geo' | 'text' | 'draw' | 'arrow',
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation ?? 0,
      props: { ...shape.props } as Record<string, unknown>,
    };

    // Convert richText back to text for geo shapes (if present)
    if ('richText' in shapeDef.props && shapeDef.props.richText) {
      // Extract text from richText format (simplified - just get the text content)
      const richText = shapeDef.props.richText as { text?: string } | string;
      if (typeof richText === 'object' && richText.text) {
        shapeDef.props.text = richText.text;
      } else if (typeof richText === 'string') {
        shapeDef.props.text = richText;
      }
      delete shapeDef.props.richText;
    }

    shapes.push(shapeDef);
  }

  return { shapes };
}

/**
 * Exports selected shapes as a formatted JSON string
 */
export function exportShapesToJSONString(editor: Editor): string | null {
  const json = exportShapesToJSON(editor);
  if (!json) return null;
  return JSON.stringify(json, null, 2);
}

