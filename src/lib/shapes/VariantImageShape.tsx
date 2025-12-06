import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T } from 'tldraw';
import type { TLBaseShape, RecordProps } from 'tldraw';

// Type definition
export type VariantImageShape = TLBaseShape<
  'variant-image',
  {
    w: number;
    h: number;
    imageUrl: string;
    variantIndex: number;
    description?: string;
  }
>;

// ShapeUtil class
export class VariantImageShapeUtil extends BaseBoxShapeUtil<VariantImageShape> {
  static override type = 'variant-image' as const;

  static override props: RecordProps<VariantImageShape> = {
    w: T.number,
    h: T.number,
    imageUrl: T.string,
    variantIndex: T.number,
    description: T.string.optional(),
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
    const { w, h, imageUrl, description } = shape.props;

    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          pointerEvents: 'all',
        }}
      >
        <img
          src={imageUrl}
          alt={description || 'Variant'}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '8px',
          }}
        />
      </HTMLContainer>
    );
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
