import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T, useEditor, useValue } from 'tldraw';
import type { TLBaseShape, RecordProps } from 'tldraw';
import { useState } from 'react';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';
import { PreviewModal } from '@/components/preview-modal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Clock } from '@phosphor-icons/react';
import { eventEmitter } from '@/lib/utils/event-emitter';
import { LogoV0 } from '@/components/logov0';

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
  const editor = useEditor();
  const { w, h, cellType, label } = shape.props;

  // Use useValue to reactively track meta changes
  const isGenerating = useValue(
    'isGenerating',
    () => editor.getShape(shape.id)?.meta.isGenerating as boolean | undefined,
    [editor, shape.id]
  );

  // Check if there's an accepted variant image in this cell
  const hasAcceptedVariant = useValue(
    'hasAcceptedVariant',
    () => {
      if (cellType !== 'variant') return false;

      const cellIndex = shape.props.cellIndex;
      const allShapes = editor.getCurrentPageShapes();

      // Find variant-image shapes with matching variantIndex
      const variantImages = allShapes.filter((s) => {
        if (s.type !== 'variant-image') return false;
        const variantIndex = (s.props as { variantIndex?: number }).variantIndex;
        return variantIndex === cellIndex;
      });

      // Check if any variant image is accepted (not pending)
      return variantImages.some((img) => {
        const pending = (img.meta.pending ?? (img.props as { pending?: boolean }).pending) as boolean | undefined;
        return pending === false; // Accepted means pending is explicitly false
      });
    },
    [editor, shape.id, cellType]
  );

  // Check if there are any variant images (pending or accepted) - hide grid when variants exist
  const hasAnyVariants = useValue(
    'hasAnyVariants',
    () => {
      const allShapes = editor.getCurrentPageShapes();
      return allShapes.some((s) => s.type === 'variant-image');
    },
    [editor]
  );


  const addToHistory = useUIGenerationHistory((state) => state.addToHistory);
  const history = useUIGenerationHistory((state) => state.history);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingUI, setIsGeneratingUI] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [chatUrl, setChatUrl] = useState<string>('');

  const handleGenerateUIClick = async (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    console.log('[GridCell] Generate UI button clicked');

    setIsGeneratingUI(true);
    setPreviewUrl('');
    setChatUrl('');

    // Show loading toast with cell index (consistent identifier)
    const cellIdentifier = shape.props.cellType === 'variant'
      ? `Variant ${shape.props.cellIndex}`
      : `Seed`;
    const toastId = toast.loading(`Generating UI ${cellIdentifier}`, {
      position: 'bottom-right',
    });

    try {
      console.log('[GridCell] Starting UI generation...');
      // Get all shapes inside this grid cell (excluding the grid-cell itself)
      const cellBounds = editor.getShapePageBounds(shape.id);
      if (!cellBounds) {
        throw new Error('Could not get cell bounds');
      }

      const allShapes = editor.getCurrentPageShapes();
      console.log('[GridCell] Total shapes on page:', allShapes.length);
      console.log('[GridCell] Cell bounds:', cellBounds);

      const shapesInCell = allShapes.filter((s) => {
        // Skip grid-cell shapes
        if (s.type === 'grid-cell') return false;

        const shapeBounds = editor.getShapePageBounds(s.id);
        if (!shapeBounds) return false;

        // Check if shape is inside the grid cell
        const isInside =
          shapeBounds.x >= cellBounds.x &&
          shapeBounds.y >= cellBounds.y &&
          shapeBounds.x + shapeBounds.width <= cellBounds.x + cellBounds.width &&
          shapeBounds.y + shapeBounds.height <= cellBounds.y + cellBounds.height;

        if (isInside) {
          console.log('[GridCell] Found shape in cell:', s.type, s.id);
        }

        return isInside;
      });

      console.log('[GridCell] Shapes in cell:', shapesInCell.length);

      if (shapesInCell.length === 0) {
        throw new Error('No shapes found in this cell');
      }

      const shapeIds = shapesInCell.map((s) => s.id);

      // Export shapes as image
      const imageResult = await editor.toImage(shapeIds, {
        format: 'png',
        background: true,
        padding: 20,
      });

      if (!imageResult?.blob) {
        throw new Error('Failed to export image');
      }

      // Convert blob to base64
      const imageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageResult.blob);
      });

      // Call API route to generate UI (upload and chat creation happen server-side)
      console.log('[generate-ui] Calling generate-ui API route...');
      const response = await fetch('/api/generate-ui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate UI');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate UI');
      }

      const { chatId, chatUrl, previewUrl, chatDetail } = result.data;

      setPreviewUrl(previewUrl);
      setChatUrl(chatUrl || '');

      // Save to history with cellIdentifier
      addToHistory({
        files: [],
        previewUrl,
        chatId,
        chatUrl,
        chatDetail: chatDetail,
        cellIdentifier: cellIdentifier,
      });

      console.log('[generate-ui] Saved to history:', {
        chatId,
        chatUrl,
        previewUrl,
      });

      // Dismiss loading toast and show success
      toast.dismiss(toastId);
      toast.success('UI generated successfully!', {
        position: 'bottom-right',
      });

      setIsModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate UI';

      // Dismiss loading toast and show error
      toast.dismiss(toastId);
      toast.error(errorMessage, {
        position: 'bottom-right',
      });

      console.error('[GridCell] Error generating UI:', err);
      if (err instanceof Error) {
        console.error('[GridCell] Error stack:', err.stack);
      }
    } finally {
      setIsGeneratingUI(false);
    }
  };

  const cellIdentifier = shape.props.cellType === 'variant' 
  ? `Variant ${shape.props.cellIndex}` 
  : `Seed`;
  
  const cellHistory = history.filter(
    (item) => item.cellIdentifier === cellIdentifier
  );

  const hasHistory = cellHistory.length > 0;

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
        opacity: hasAnyVariants ? 0 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <style>
        {`
          @keyframes borderPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
          @keyframes sparkle {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.5); }
          }
          @keyframes shimmer {
            0% { background-position: -1000px 0; }
            100% { background-position: 1000px 0; }
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 5px rgba(139, 92, 246, 0.4), 0 0 10px rgba(139, 92, 246, 0.2); }
            50% { box-shadow: 0 0 6px rgba(139, 92, 246, 0.6), 0 0 12px rgba(139, 92, 246, 0.4); }
          }
        `}
      </style>
      {/* Generate UI Button and History Button - hidden when generating */}
        <div style={{
          position: 'absolute',
          top: '-48px',
          right: '0',
          display: 'flex',
          gap: '8px',
          zIndex: 1000,
        }}>
          {cellType === 'variant' && hasAcceptedVariant && (() => {
            return (
                <Button
                  type="button"
                  onPointerDown={handleGenerateUIClick}
                  disabled={isGeneratingUI}
                  className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 flex items-center gap-1"
                >
                  <span>Generate with</span>
                  <LogoV0 />
                </Button>
            );
          })()}
          {cellType === 'variant' && !isGenerating && (() => {
            const cellIdentifier = shape.props.cellType === 'variant'
              ? `Variant ${shape.props.cellIndex}`
              : `Seed`;
            const cellHistory = history.filter(
              (item) => item.cellIdentifier === cellIdentifier
            );
            const historyCount = cellHistory.length;

            return (
              <div style={{ position: 'relative' }}>
                <Button
                  type="button"
                  variant="outline"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    console.log('[GridCell] Emitting open-history event:', cellIdentifier);
                    eventEmitter.emit('open-history', cellIdentifier);
                  }}
                >
                  <Clock size={16} weight="regular" />
                </Button>
                {historyCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-6px',
                      right: '-6px',
                      backgroundColor: '#16a34a',
                      color: 'white',
                      borderRadius: '50%',
                      width: '18px',
                      height: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '600',
                      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                    }}
                  >
                    {historyCount > 9 ? '9+' : historyCount}
                  </span>
                )}
              </div>
            );
          })()}
        </div>
      {/* Border element - separate so only it animates */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: cellType === 'seed'
            ? '2px solid black'
            : isGenerating
              ? '2px dashed #9ca3af'
              : '1px solid #e5e7eb',
          borderRadius: '12px',
          pointerEvents: 'none',
          animation: isGenerating ? 'borderPulse 1.5s ease-in-out infinite' : undefined,
        }}
      />
      {/* Label - hide when UI is generating or when Generate UI button is visible to avoid overlap */}
      {!isGeneratingUI && !(cellType === 'variant' && hasAcceptedVariant) && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: cellType !== 'seed' && isGenerating ? '12%' : '21%',
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
          {isGenerating ? '✨ Generating...' : label}
        </div>
      )}

      {/* Preview Modal */}
      <PreviewModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        previewUrl={previewUrl}
        chatUrl={chatUrl}
      />


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

  // Only seed cell cannot be deleted
  canDelete(shape: GridCellShape) {
    return shape.props.cellType !== 'seed';
  }

  // Allow editing (unlocking to move/resize)
  canEdit() {
    return true;
  }
}
