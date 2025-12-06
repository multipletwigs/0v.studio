'use client';

import { useEditor, useValue } from 'tldraw';
import { useGridCanvas } from '@/lib/hooks/use-grid-canvas';

export function GridVariantImages() {
  const editor = useEditor();
  const { state } = useGridCanvas();

  // Listen to camera changes to update positions
  const camera = useValue('camera', () => editor.getCamera(), [editor]);

  // Get variant cells with images
  const variantsWithImages = state.cells.filter(
    (cell) => cell.type === 'variant' && cell.imageUrl
  );

  if (variantsWithImages.length === 0) return null;

  return (
    <>
      {variantsWithImages.map((cell) => {
        // Convert page coordinates to screen coordinates
        const screenPoint = editor.pageToScreen({
          x: cell.bounds.x,
          y: cell.bounds.y,
        });

        const zoom = camera.z;
        const width = cell.bounds.w * zoom;
        const height = cell.bounds.h * zoom;

        return (
          <div
            key={cell.id}
            className="absolute pointer-events-none"
            style={{
              left: screenPoint.x,
              top: screenPoint.y,
              width,
              height,
              padding: `${20 * zoom}px`,
            }}
          >
            <img
              src={cell.imageUrl}
              alt={`Variant ${cell.index}`}
              className="w-full h-full object-contain"
              style={{
                imageRendering: 'auto',
              }}
            />
          </div>
        );
      })}
    </>
  );
}
