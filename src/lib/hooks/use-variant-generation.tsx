'use client';

import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useEffect,
  type ReactNode,
} from 'react';
import { Editor, createShapeId, toRichText, type TLShapeId } from 'tldraw';
import type {
  VariantGenerationState,
  GenerateVariantsResponse,
  SerializedShape,
} from '@/lib/types/variant-state';
import type { Variant } from '@/lib/schemas/shape-variants';
import { variantReducer, initialState } from './variant-reducer';
import { exportSelection } from '@/lib/utils/export-selection';

interface VariantContextValue {
  state: VariantGenerationState;
  generateVariants: (editor: Editor) => Promise<void>;
  acceptVariant: (editor: Editor, variantId: string) => void;
  declineVariant: (editor: Editor, variantId: string) => void;
  declineAllVariants: (editor: Editor) => void;
  reset: (editor: Editor) => void;
}

const VariantContext = createContext<VariantContextValue | null>(null);

export function VariantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(variantReducer, initialState);

  // Auto-dismiss errors after 3 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        dispatch({ type: 'CLEAR_ERROR' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Convert AI response shapes to tldraw shapes
  // Transforms 'text' prop to 'richText' format expected by tldraw v4
  const createPreviewShapes = useCallback(
    (editor: Editor, variant: Variant, opacity: number = 0.5): TLShapeId[] => {
      const shapeIds: TLShapeId[] = [];

      for (const shapeData of variant.shapes) {
        const shapeId = createShapeId();
        shapeIds.push(shapeId);

        // Transform props: convert text -> richText
        const transformedProps = { ...shapeData.props } as Record<string, unknown>;
        if ('text' in transformedProps && typeof transformedProps.text === 'string') {
          transformedProps.richText = toRichText(transformedProps.text);
          delete transformedProps.text;
        }

        editor.createShape({
          id: shapeId,
          type: shapeData.type,
          x: shapeData.x + variant.offset.x,
          y: shapeData.y + variant.offset.y,
          rotation: shapeData.rotation,
          opacity: opacity,
          props: transformedProps,
          meta: {
            isVariantPreview: true,
            variantId: variant.id,
          },
        });
      }

      return shapeIds;
    },
    []
  );

  // Generate variants from selected shapes
  const generateVariants = useCallback(
    async (editor: Editor) => {
      const selectedIds = editor.getSelectedShapeIds();
      if (selectedIds.length === 0) {
        dispatch({ type: 'GENERATION_ERROR', error: 'No shapes selected' });
        return;
      }

      const bounds = editor.getSelectionPageBounds();
      if (!bounds) {
        dispatch({
          type: 'GENERATION_ERROR',
          error: 'Could not get selection bounds',
        });
        return;
      }

      dispatch({
        type: 'START_GENERATION',
        sourceShapeIds: [...selectedIds],
        bounds: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
        },
      });

      try {
        // Export selection as PNG and SVG
        const { imageBase64, svgString } = await exportSelection(editor);

        // Serialize existing shapes for context
        const existingShapes: SerializedShape[] = selectedIds.reduce<SerializedShape[]>((acc, id) => {
          const shape = editor.getShape(id);
          if (!shape) return acc;
          acc.push({
            id: shape.id,
            type: shape.type,
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation,
            opacity: shape.opacity,
            props: shape.props as Record<string, unknown>,
          });
          return acc;
        }, []);

        const response = await fetch('/api/generate-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            svgString,
            selectionBounds: {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
            },
            existingShapes,
          }),
        });

        const result: GenerateVariantsResponse = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Unknown error');
        }

        const variants = result.data.variants;
        dispatch({ type: 'GENERATION_SUCCESS', variants });

        // Create preview shapes for each variant
        for (const variant of variants) {
          const previewIds = createPreviewShapes(editor, variant, 0.5);
          dispatch({
            type: 'SET_PREVIEW_SHAPE_IDS',
            variantId: variant.id,
            shapeIds: previewIds,
          });
        }
      } catch (error) {
        dispatch({
          type: 'GENERATION_ERROR',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
    [createPreviewShapes]
  );

  // Accept a variant - make shapes permanent
  const acceptVariant = useCallback(
    (editor: Editor, variantId: string) => {
      const variantState = state.variants.find((v) => v.id === variantId);
      if (!variantState) return;

      for (const shapeId of variantState.previewShapeIds) {
        const shape = editor.getShape(shapeId);
        if (!shape) continue;

        editor.updateShape({
          id: shapeId,
          type: shape.type,
          opacity: 1,
          meta: {
            isVariantPreview: false,
          },
        });
      }

      dispatch({ type: 'SET_VARIANT_STATUS', variantId, status: 'accepted' });
    },
    [state.variants]
  );

  // Decline a variant - remove preview shapes
  const declineVariant = useCallback(
    (editor: Editor, variantId: string) => {
      const variantState = state.variants.find((v) => v.id === variantId);
      if (!variantState) return;

      editor.deleteShapes(variantState.previewShapeIds);
      dispatch({ type: 'SET_VARIANT_STATUS', variantId, status: 'declined' });
    },
    [state.variants]
  );

  // Decline all pending variants
  const declineAllVariants = useCallback(
    (editor: Editor) => {
      for (const variant of state.variants) {
        if (variant.status === 'pending') {
          editor.deleteShapes(variant.previewShapeIds);
          dispatch({
            type: 'SET_VARIANT_STATUS',
            variantId: variant.id,
            status: 'declined',
          });
        }
      }
    },
    [state.variants]
  );

  // Reset state and cleanup
  const reset = useCallback(
    (editor: Editor) => {
      for (const variant of state.variants) {
        if (variant.status === 'pending') {
          editor.deleteShapes(variant.previewShapeIds);
        }
      }
      dispatch({ type: 'RESET' });
    },
    [state.variants]
  );

  return (
    <VariantContext.Provider
      value={{
        state,
        generateVariants,
        acceptVariant,
        declineVariant,
        declineAllVariants,
        reset,
      }}
    >
      {children}
    </VariantContext.Provider>
  );
}

export function useVariantGeneration() {
  const context = useContext(VariantContext);
  if (!context) {
    throw new Error(
      'useVariantGeneration must be used within VariantProvider'
    );
  }
  return context;
}
