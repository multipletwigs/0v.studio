import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T, useEditor, useValue } from 'tldraw';
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

// Component for rendering the shape
function GridCellComponent({ shape }: { shape: GridCellShape }) {
  const { w, h, cellType, label } = shape.props;
  const isGenerating = shape.meta.isGenerating as boolean | undefined;

  return (
    <HTMLContainer
      style={{
        width: w,
        height: h,
        borderRadius: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        overflow: 'visible',
        pointerEvents: 'all',
        position: 'relative',
      }}
    >
      <style>
        {`
          @keyframes borderPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>
      {/* Border element - separate so only it animates */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: cellType === 'seed'
            ? '2px solid black'
            : isGenerating
              ? '2px dashed #a855f7'
              : '1px solid #e5e7eb',
          borderRadius: '12px',
          pointerEvents: 'none',
          animation: isGenerating ? 'borderPulse 1.5s ease-in-out infinite' : undefined,
        }}
      />
      {/* Label */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '21%',
          transform: 'translateX(-50%)',
          backgroundColor: cellType === 'seed' ? '#3b82f6' : isGenerating ? '#a855f7' : '#6b7280',
          color: 'white',
          padding: '4px 12px',
          borderRadius: '9999px',
          fontSize: '11px',
          fontWeight: '600',
          zIndex: 10,
        }}
      >
        {isGenerating ? '✨ Generating...' : label}
      </div>
    </HTMLContainer>
  );
}

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
      label: '✏️ DRAW YOUR LO-FI MOCKUP HERE!!',
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
    return <GridCellComponent shape={shape} />;
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
