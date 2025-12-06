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
    pending?: boolean;
  }
>;

// Component for rendering the shape (extracted to use hooks)
function VariantImageComponent({ shape }: { shape: VariantImageShape }) {
  const editor = useEditor();
  const { w, h, imageUrl, description, pending } = shape.props;

  const handleAccept = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    editor.updateShape({
      id: shape.id,
      type: 'variant-image',
      props: { pending: false },
    });
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
          src={imageUrl}
          alt={description || 'Variant'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
            opacity: pending ? 0.3 : 1,
            transition: 'opacity 0.2s ease',
          }}
        />
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center gap-2">
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
    pending: T.boolean.optional(),
  };

  getDefaultProps(): VariantImageShape['props'] {
    return {
      w: 360,
      h: 360,
      imageUrl: '',
      variantIndex: 1,
      pending: false,
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

  // Can be deleted
  override canDelete() {
    return true;
  }

  // Can be resized
  override canResize() {
    return true;
  }
}
