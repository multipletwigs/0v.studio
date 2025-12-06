import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T, useEditor } from 'tldraw';
import type { TLBaseShape, RecordProps } from 'tldraw';
import { Check, X } from '@phosphor-icons/react';

// Type definition
export type VariantImageShape = TLBaseShape<
  'variant-image',
  {
    w: number;
    h: number;
    imageUrl: string;
    variantIndex: number;
    description?: string;
    pending?: boolean; // deprecated, use meta.pending instead
  }
>;

// Component for rendering the shape (extracted to use hooks)
function VariantImageComponent({ shape }: { shape: VariantImageShape }) {
  const editor = useEditor();
  const { w, h, imageUrl, description } = shape.props;
  // Check meta first (new), fallback to props (old persisted shapes)
  const pending = (shape.meta.pending ?? shape.props.pending) as boolean | undefined;

  const handleAccept = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    editor.updateShape({
      id: shape.id,
      type: 'variant-image',
      meta: { pending: false },
    });

    // Find and select the parent grid-cell that contains this variant image
    // First try to match by variantIndex (more reliable)
    const variantIndex = shape.props.variantIndex;
    const allShapes = editor.getCurrentPageShapes();

    let parentGridCell = allShapes.find((s) => {
      if (s.type !== 'grid-cell') return false;
      const cellProps = s.props as { cellType?: string; cellIndex?: number };
      return cellProps?.cellType === 'variant' && cellProps?.cellIndex === variantIndex;
    });

    // Fallback: find by bounds if variantIndex doesn't match
    if (!parentGridCell) {
      const variantImageBounds = editor.getShapePageBounds(shape.id);
      if (variantImageBounds) {
        parentGridCell = allShapes.find((s) => {
          if (s.type !== 'grid-cell') return false;
          const cellProps = s.props as { cellType?: string; cellIndex?: number };
          if (cellProps?.cellType !== 'variant') return false;

          const cellBounds = editor.getShapePageBounds(s.id);
          if (!cellBounds) return false;

          // More lenient check: variant image center should be inside grid cell
          const imageCenterX = variantImageBounds.x + variantImageBounds.width / 2;
          const imageCenterY = variantImageBounds.y + variantImageBounds.height / 2;

          return (
            imageCenterX >= cellBounds.x &&
            imageCenterX <= cellBounds.x + cellBounds.width &&
            imageCenterY >= cellBounds.y &&
            imageCenterY <= cellBounds.y + cellBounds.height
          );
        });
      }
    }

    if (parentGridCell) {
      // Use requestAnimationFrame to ensure the shape update is processed first
      requestAnimationFrame(() => {
        // Select the parent grid-cell to show the Generate UI button
        editor.setSelectedShapes([parentGridCell.id]);

        // Force a re-render by updating the selection again after a small delay
        setTimeout(() => {
          const currentSelection = editor.getSelectedShapeIds();
          if (!Array.from(currentSelection).includes(parentGridCell.id)) {
            editor.setSelectedShapes([parentGridCell.id]);
          }
        }, 100);
      });
    }
  };

  const handleDecline = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    editor.deleteShape(shape.id);
  };

  return (
    <HTMLContainer
      style={{
        width: w,
        height: h,
        pointerEvents: 'all',
      }}
    >
      <div className="relative w-full h-full">
        <img
          draggable={false}
          src={imageUrl}
          alt={description || 'Variant'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
            opacity: pending ? 0.4 : 1,
            mixBlendMode: 'multiply',
            transition: 'opacity 0.2s ease',
          }}
        />
        {pending && (
          <div className="absolute top-2 right-2 flex gap-2">
            <button
              type="button"
              onPointerDown={handleAccept}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-green-600 rounded-md hover:bg-green-50 transition-colors shadow-sm text-sm font-medium border border-green-200"
            >
              <Check size={16} weight="bold" />
              Accept
            </button>
            <button
              type="button"
              onPointerDown={handleDecline}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 text-red-600 rounded-md hover:bg-red-50 transition-colors shadow-sm text-sm font-medium border border-red-200"
            >
              <X size={16} weight="bold" />
              Decline
            </button>
          </div>
        )}
      </div>
    </HTMLContainer>
  );
}

// ShapeUtil class
export class VariantImageShapeUtil extends BaseBoxShapeUtil<VariantImageShape> {
  static override type = 'variant-image' as const;

  static override props: RecordProps<VariantImageShape> = {
    w: T.number,
    h: T.number,
    imageUrl: T.string,
    variantIndex: T.number,
    description: T.string.optional(),
    // Keep for backwards compatibility with persisted shapes (we use meta.pending now)
    pending: T.boolean.optional(),
  };

  getDefaultProps(): VariantImageShape['props'] {
    return {
      w: 360,
      h: 360,
      imageUrl: '',
      variantIndex: 1,
    };
  }

  getGeometry(shape: VariantImageShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: VariantImageShape) {
    return <VariantImageComponent shape={shape} />;
  }

  indicator(shape: VariantImageShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }


  // Cannot be resized or dragged
  override canResize() {
    return false;
  }

}
