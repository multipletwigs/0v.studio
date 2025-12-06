import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T } from 'tldraw';
import type { TLBaseShape, RecordProps } from 'tldraw';

// Type definition
export type GridCellShape = TLBaseShape<
  'grid-cell',
  {
    w: number;
    h: number;
    cellType: 'seed' | 'variant';
    cellIndex: number;
    label: string;
  }
>;

// ShapeUtil class
export class GridCellShapeUtil extends BaseBoxShapeUtil<GridCellShape> {
  static override type = 'grid-cell' as const;

  static override props: RecordProps<GridCellShape> = {
    w: T.number,
    h: T.number,
    cellType: T.literalEnum('seed', 'variant'),
    cellIndex: T.number,
    label: T.string,
  };

  getDefaultProps(): GridCellShape['props'] {
    return {
      w: 400,
      h: 400,
      cellType: 'seed',
      cellIndex: 0,
      label: '🌱 SEED',
    };
  }

  getGeometry(shape: GridCellShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  component(shape: GridCellShape) {
    const { w, h, cellType, label } = shape.props;

    return (
      <HTMLContainer
        style={{
          width: w,
          height: h,
          border: cellType === 'seed' ? '2px solid #3b82f6' : '1px solid #e5e7eb',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.5)',
          overflow: 'visible',
          pointerEvents: 'all',
        }}
      >
        {/* Label */}
        <div
          style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: cellType === 'seed' ? '#3b82f6' : '#6b7280',
            color: 'white',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: '600',
            zIndex: 10,
          }}
        >
          {label}
        </div>
      </HTMLContainer>
    );
  }

  indicator(shape: GridCellShape) {
    return <rect width={shape.props.w} height={shape.props.h} />;
  }

  // Prevent deletion
  override canDelete() {
    return false;
  }

  // Allow editing (unlocking to move/resize)
  override canEdit() {
    return true;
  }
}
