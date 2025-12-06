import type { TLShapeId } from 'tldraw';
import type { Variant } from '@/lib/schemas/shape-variants';

export type VariantStatus = 'pending' | 'accepted' | 'declined';

export interface VariantState {
  id: string;
  variant: Variant;
  status: VariantStatus;
  previewShapeIds: TLShapeId[];
}

export interface VariantGenerationState {
  isGenerating: boolean;
  error: string | null;
  sourceShapeIds: TLShapeId[];
  sourceSelectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  variants: VariantState[];
}

export interface SerializedShape {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: number;
  opacity: number;
  props: Record<string, unknown>;
}

export interface GenerateVariantsRequest {
  imageBase64: string;
  svgString?: string;
  selectionBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  context?: string;
}

export interface GenerateVariantsResponse {
  success: boolean;
  data?: {
    variants: Variant[];
  };
  error?: string;
}
