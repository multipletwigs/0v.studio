'use client';

import { useEditor, useValue, Box } from 'tldraw';
import { useVariantGeneration } from '@/lib/hooks/use-variant-generation';
import { Check, X, SpinnerGap } from '@phosphor-icons/react';

export function VariantControls() {
  const editor = useEditor();
  const { state, acceptVariant, declineVariant, declineAllVariants } =
    useVariantGeneration();

  // Calculate screen positions for variant controls
  const variantPositions = useValue(
    'variantPositions',
    () => {
      return state.variants
        .filter((v) => v.status === 'pending' && v.previewShapeIds.length > 0)
        .map((variantState) => {
          const shapes = variantState.previewShapeIds
            .map((id) => editor.getShape(id))
            .filter(Boolean);

          if (shapes.length === 0) return null;

          const allBounds = shapes
            .map((s) => editor.getShapePageBounds(s!.id))
            .filter((b): b is Box => b !== null);

          if (allBounds.length === 0) return null;

          const combinedBounds = Box.Common(allBounds);

          const screenPoint = editor.pageToScreen({
            x: combinedBounds.x + combinedBounds.width / 2,
            y: combinedBounds.y - 10,
          });

          return {
            variantId: variantState.id,
            variantName: variantState.variant.name,
            screenX: screenPoint.x,
            screenY: screenPoint.y,
          };
        })
        .filter(Boolean);
    },
    [editor, state.variants]
  );

  if (state.isGenerating) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-2 border border-zinc-200">
          <SpinnerGap className="w-4 h-4 animate-spin text-indigo-500" weight="bold" />
          <span className="text-sm font-medium text-zinc-700">
            Refining mockup...
          </span>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <span className="text-sm text-red-600">{state.error}</span>
        </div>
      </div>
    );
  }

  const pendingCount = state.variants.filter((v) => v.status === 'pending').length;

  return (
    <>
      {/* Global control bar */}
      {pendingCount > 0 && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center gap-4 border border-zinc-200">
            <span className="text-sm font-medium text-zinc-700">
              Refined mockup ready
            </span>
            <button
              onClick={() => declineAllVariants(editor)}
              className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Per-variant controls - positioned near each variant */}
      {variantPositions.map((pos) => {
        if (!pos) return null;

        return (
          <div
            key={pos.variantId}
            className="fixed z-50 transform -translate-x-1/2 -translate-y-full"
            style={{
              left: pos.screenX,
              top: pos.screenY - 8,
            }}
          >
            <div className="bg-white rounded-lg shadow-lg border border-zinc-200 p-1 flex items-center gap-1">
              <span className="text-xs font-medium px-2 text-zinc-600">
                {pos.variantName}
              </span>
              <button
                onClick={() => acceptVariant(editor, pos.variantId)}
                className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                title="Accept variant"
              >
                <Check className="w-4 h-4" weight="bold" />
              </button>
              <button
                onClick={() => declineVariant(editor, pos.variantId)}
                className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                title="Decline variant"
              >
                <X className="w-4 h-4" weight="bold" />
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
