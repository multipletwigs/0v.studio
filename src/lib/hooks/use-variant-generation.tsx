'use client';

import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  type ReactNode,
} from 'react';
import { Editor, createShapeId, toRichText, type TLShapeId, type TLShapePartial } from 'tldraw';
import type {
  VariantGenerationState,
  VariantStatus,
  SerializedShape,
  GenerateVariantsResponse,
} from '@/lib/types/variant-state';
import type { Variant } from '@/lib/schemas/shape-variants';

// Action types
type VariantAction =
  | {
      type: 'START_GENERATION';
      sourceShapeIds: TLShapeId[];
      bounds: { x: number; y: number; width: number; height: number };
    }
  | { type: 'GENERATION_SUCCESS'; variants: Variant[] }
  | { type: 'GENERATION_ERROR'; error: string }
  | { type: 'SET_VARIANT_STATUS'; variantId: string; status: VariantStatus }
  | { type: 'SET_PREVIEW_SHAPE_IDS'; variantId: string; shapeIds: TLShapeId[] }
  | { type: 'RESET' };

const initialState: VariantGenerationState = {
  isGenerating: false,
  error: null,
  sourceShapeIds: [],
  sourceSelectionBounds: null,
  variants: [],
};

function variantReducer(
  state: VariantGenerationState,
  action: VariantAction
): VariantGenerationState {
  switch (action.type) {
    case 'START_GENERATION':
      return {
        ...state,
        isGenerating: true,
        error: null,
        sourceShapeIds: action.sourceShapeIds,
        sourceSelectionBounds: action.bounds,
        variants: [],
      };

    case 'GENERATION_SUCCESS':
      return {
        ...state,
        isGenerating: false,
        variants: action.variants.map((variant) => ({
          id: variant.id,
          variant,
          status: 'pending' as VariantStatus,
          previewShapeIds: [],
        })),
      };

    case 'GENERATION_ERROR':
      return {
        ...state,
        isGenerating: false,
        error: action.error,
      };

    case 'SET_VARIANT_STATUS':
      return {
        ...state,
        variants: state.variants.map((v) =>
          v.id === action.variantId ? { ...v, status: action.status } : v
        ),
      };

    case 'SET_PREVIEW_SHAPE_IDS':
      return {
        ...state,
        variants: state.variants.map((v) =>
          v.id === action.variantId
            ? { ...v, previewShapeIds: action.shapeIds }
            : v
        ),
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

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

  // Serialize shapes for API - only geo and text shapes
  const serializeShapes = useCallback(
    (editor: Editor, shapeIds: TLShapeId[]): SerializedShape[] => {
      const serialized: SerializedShape[] = [];
      for (const id of shapeIds) {
        const shape = editor.getShape(id);
        if (!shape) continue;
        // Only include geo and text shapes
        if (shape.type !== 'geo' && shape.type !== 'text') continue;
        serialized.push({
          id: shape.id as string,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          rotation: shape.rotation,
          opacity: shape.opacity,
          props: shape.props as Record<string, unknown>,
        });
      }
      return serialized;
    },
    []
  );

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
        const serializedShapes = serializeShapes(editor, [...selectedIds]);

        if (serializedShapes.length === 0) {
          dispatch({
            type: 'GENERATION_ERROR',
            error: 'No supported shapes selected (geo or text only)',
          });
          return;
        }

        const response = await fetch('/api/generate-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            shapes: serializedShapes,
            selectionBounds: {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
            },
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
    [serializeShapes, createPreviewShapes]
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
