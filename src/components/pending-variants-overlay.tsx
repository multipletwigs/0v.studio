'use client';

import { useEditor, useValue } from 'tldraw';
import { useGridCanvas } from '@/lib/hooks/use-grid-canvas';
import { Check, X, CircleNotch } from '@phosphor-icons/react';

export function PendingVariantsOverlay() {
  const editor = useEditor();
  const { state, acceptVariant, rejectVariant } = useGridCanvas();

  // Listen to camera changes to update positions
  const camera = useValue('camera', () => editor.getCamera(), [editor]);

  // Get variant cells that are generating or have pending variants
  const variantCells = state.cells.filter((c) => c.type === 'variant');
  const hasContent = state.pendingVariants.length > 0 || state.isGenerating;

  // Debug logging
  if (state.pendingVariants.length > 0) {
    console.log('[PendingVariantsOverlay] Pending variants:', state.pendingVariants);
    console.log('[PendingVariantsOverlay] Variant cells:', variantCells.map(c => ({ id: c.id, hasImage: !!c.imageShapeId })));
  }

  if (!hasContent) return null;

  return (
    <>
      {variantCells.map((cell) => {
        // Check if this cell has a pending variant
        const pendingVariant = state.pendingVariants.find((v) => v.cellId === cell.id);

        // Skip if cell already has accepted image or no content
        if (cell.imageShapeId || (!pendingVariant && !cell.isGenerating)) {
          return null;
        }

        // Convert page coordinates to screen coordinates
        const screenPoint = editor.pageToScreen({
          x: cell.bounds.x,
          y: cell.bounds.y,
        });

        const zoom = camera.z;
        const width = cell.bounds.w * zoom;
        const height = cell.bounds.h * zoom;

        const padding = 20 * zoom;
        const labelHeight = 40 * zoom; // Height of the label area

        return (
          <div
            key={cell.id}
            className="absolute"
            style={{
              left: screenPoint.x + padding,
              top: screenPoint.y + padding + labelHeight,
              width: width - padding * 2,
              height: height - padding * 2 - labelHeight,
              pointerEvents: pendingVariant ? 'auto' : 'none',
            }}
          >
            {/* Loading State */}
            {cell.isGenerating && !pendingVariant && (
              <div className="relative w-full h-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <CircleNotch
                    size={48 * zoom}
                    weight="bold"
                    className="animate-spin text-purple-500"
                  />
                  <p
                    className="text-gray-600 font-medium"
                    style={{ fontSize: `${14 * zoom}px` }}
                  >
                    Generating...
                  </p>
                </div>
              </div>
            )}

            {/* Pending Variant with Accept/Decline */}
            {pendingVariant && (
              <div className="relative w-full h-full">
                <img
                  src={pendingVariant.imageUrl}
                  alt="Pending variant"
                  className="w-full h-full object-contain opacity-40"
                />

                {/* Accept/Decline Buttons */}
                <div className="absolute inset-0 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => acceptVariant(pendingVariant.cellId, editor)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-lg font-medium"
                    style={{
                      fontSize: `${14 * zoom}px`,
                    }}
                  >
                    <Check size={20 * zoom} weight="bold" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectVariant(pendingVariant.cellId)}
                    className="flex items-center justify-center px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-lg"
                    style={{
                      fontSize: `${14 * zoom}px`,
                    }}
                  >
                    <X size={20 * zoom} weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
