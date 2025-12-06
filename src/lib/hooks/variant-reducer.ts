import type { TLShapeId } from 'tldraw';
import type { VariantGenerationState, VariantStatus } from '@/lib/types/variant-state';
import type { Variant } from '@/lib/schemas/shape-variants';

export type VariantAction =
  | {
      type: 'START_GENERATION';
      sourceShapeIds: TLShapeId[];
      bounds: { x: number; y: number; width: number; height: number };
    }
  | { type: 'GENERATION_SUCCESS'; variants: Variant[] }
  | { type: 'GENERATION_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_VARIANT_STATUS'; variantId: string; status: VariantStatus }
  | { type: 'SET_PREVIEW_SHAPE_IDS'; variantId: string; shapeIds: TLShapeId[] }
  | { type: 'RESET' };

export const initialState: VariantGenerationState = {
  isGenerating: false,
  error: null,
  sourceShapeIds: [],
  sourceSelectionBounds: null,
  variants: [],
};

export function variantReducer(
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

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
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
