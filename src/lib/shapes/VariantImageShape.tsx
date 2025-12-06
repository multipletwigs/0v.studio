import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T, useEditor, useValue } from 'tldraw';
import type { TLBaseShape, RecordProps } from 'tldraw';
import { Check, X, Clock } from '@phosphor-icons/react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogoV0 } from '@/components/logov0';
import { eventEmitter } from '@/lib/utils/event-emitter';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';
import { toast } from 'sonner';
import { PreviewModal } from '@/components/preview-modal';

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
  const { w, h, imageUrl, description, variantIndex } = shape.props;
  // Check meta first (new), fallback to props (old persisted shapes)
  const pending = (shape.meta.pending ?? shape.props.pending) as boolean | undefined;

  // Get current page ID
  const currentPageId = useValue('currentPageId', () => editor.getCurrentPageId(), [editor]);

  const addToHistory = useUIGenerationHistory((state) => state.addToHistory);
  const history = useUIGenerationHistory((state) => state.history);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingUI, setIsGeneratingUI] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [chatUrl, setChatUrl] = useState<string>('');

  const cellIdentifier = `Variant ${variantIndex}`;
  const cellHistory = history.filter(
    (item) => item.cellIdentifier === cellIdentifier && item.pageId === currentPageId
  );
  const historyCount = cellHistory.length;

  const handleAccept = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Update this image as accepted
    editor.updateShape({
      id: shape.id,
      type: 'variant-image',
      meta: { pending: false },
    });

    // Find the parent grid-cell by variantIndex
    const allShapes = editor.getCurrentPageShapes();

    const parentGridCell = allShapes.find((s) => {
      if (s.type !== 'grid-cell') return false;
      const cellProps = s.props as { cellType?: string; cellIndex?: number };
      return cellProps?.cellType === 'variant' && cellProps?.cellIndex === variantIndex;
    });

    // Update the grid cell to stop generating and mark as accepted
    if (parentGridCell) {
      console.log('[handleAccept] Updating grid cell', parentGridCell.id, 'to isGenerating: false');
      editor.updateShape({
        id: parentGridCell.id,
        type: 'grid-cell',
        meta: { isGenerating: false },
      });
      const updated = editor.getShape(parentGridCell.id);
      console.log('[handleAccept] After update, meta:', updated?.meta);
    } else {
      console.log('[handleAccept] Could not find parent grid cell for variantIndex:', variantIndex);
    }
  };

  const handleDecline = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Find and delete the associated grid cell
    const allShapes = editor.getCurrentPageShapes();

    const parentGridCell = allShapes.find((s) => {
      if (s.type !== 'grid-cell') return false;
      const cellProps = s.props as { cellType?: string; cellIndex?: number };
      return cellProps?.cellType === 'variant' && cellProps?.cellIndex === variantIndex;
    });

    // Delete both the image and the grid cell
    const shapesToDelete = [shape.id];
    if (parentGridCell) {
      shapesToDelete.push(parentGridCell.id);
    }
    editor.deleteShapes(shapesToDelete);
  };

  const handleGenerateUIClick = async (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setIsGeneratingUI(true);
    setPreviewUrl('');
    setChatUrl('');

    const toastId = toast.loading(`Generating UI ${cellIdentifier}`, {
      position: 'bottom-right',
    });

    try {
      // Get the blob URL and context from meta (stored during variant generation)
      const blobUrl = shape.meta.blobUrl as string | undefined;
      const seedContext = shape.meta.seedContext as string | undefined;
      const variantDescription = shape.props.description;

      if (!blobUrl) {
        throw new Error('No blob URL found for this variant');
      }

      const response = await fetch('/api/generate-ui', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: blobUrl,
          seedContext,
          variantDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate UI');
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate UI');
      }

      const { chatId, chatUrl: resultChatUrl, previewUrl: resultPreviewUrl, chatDetail } = result.data;

      setPreviewUrl(resultPreviewUrl);
      setChatUrl(resultChatUrl || '');

      addToHistory({
        files: [],
        previewUrl: resultPreviewUrl,
        chatId,
        chatUrl: resultChatUrl,
        chatDetail: chatDetail,
        cellIdentifier: cellIdentifier,
        variantDescription: variantDescription,
        seedContext: seedContext,
        pageId: currentPageId,
      });

      toast.dismiss(toastId);
      toast.success('UI generated successfully!', {
        position: 'bottom-right',
      });

      setIsModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate UI';
      toast.dismiss(toastId);
      toast.error(errorMessage, {
        position: 'bottom-right',
      });
      console.error('[VariantImage] Error generating UI:', err);
    } finally {
      setIsGeneratingUI(false);
    }
  };

  const handleHistoryClick = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[VariantImage] Emitting open-history event:', cellIdentifier, currentPageId);
    eventEmitter.emit('open-history', { cellIdentifier, pageId: currentPageId });
  };

  return (
    <HTMLContainer
      style={{
        width: w,
        height: h,
        pointerEvents: 'all',
        overflow: 'visible',
      }}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Buttons positioned above the image */}
        <div
          style={{
            position: 'absolute',
            top: '-48px',
            right: '0',
            display: 'flex',
            gap: '8px',
            zIndex: 1000,
          }}
        >
          {pending ? (
            <>
              <Button
                type="button"
                onPointerDown={handleAccept}
                className="bg-white/90 text-green-600 hover:bg-green-50 border border-green-200"
              >
                <Check size={16} weight="bold" />
                Accept
              </Button>
              <Button
                type="button"
                onPointerDown={handleDecline}
                className="bg-white/90 text-red-600 hover:bg-red-50 border border-red-200"
              >
                <X size={16} weight="bold" />
                Decline
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                onPointerDown={handleGenerateUIClick}
                disabled={isGeneratingUI}
                className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 flex items-center gap-1"
              >
                <span>Generate with</span>
                <LogoV0 />
              </Button>
              <div style={{ position: 'relative' }}>
                <Button
                  type="button"
                  variant="outline"
                  onPointerDown={handleHistoryClick}
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
            </>
          )}
        </div>

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

        {/* Preview Modal */}
        <PreviewModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          previewUrl={previewUrl}
          chatUrl={chatUrl}
        />
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
