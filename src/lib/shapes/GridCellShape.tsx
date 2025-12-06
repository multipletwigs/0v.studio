import { BaseBoxShapeUtil, HTMLContainer, Rectangle2d, T, useEditor, useValue } from 'tldraw';
import type { TLBaseShape, RecordProps } from 'tldraw';
import { Sparkle } from '@phosphor-icons/react';
import { useState } from 'react';
import { createClient, type ChatDetail } from 'v0-sdk';
import { put } from '@vercel/blob';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';
import { PreviewModal } from '@/components/preview-modal';

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


  const addToHistory = useUIGenerationHistory((state) => state.addToHistory);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingUI, setIsGeneratingUI] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [chatUrl, setChatUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Create v0 client
  const client = createClient({
    apiKey: process.env.NEXT_PUBLIC_V0_API_KEY || process.env.V0_API_KEY,
  });

  const handleGenerateUIClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    setIsGeneratingUI(true);
    setError(null);
    setPreviewUrl('');
    setChatUrl('');

    try {
      // Get all shapes inside this grid cell (excluding the grid-cell itself)
      const cellBounds = editor.getShapePageBounds(shape.id);
      if (!cellBounds) {
        throw new Error('Could not get cell bounds');
      }

      const allShapes = editor.getCurrentPageShapes();
      const shapesInCell = allShapes.filter((s) => {
        // Skip grid-cell shapes
        if (s.type === 'grid-cell') return false;

        const shapeBounds = editor.getShapePageBounds(s.id);
        if (!shapeBounds) return false;

        // Check if shape is inside the grid cell
        return (
          shapeBounds.x >= cellBounds.x &&
          shapeBounds.y >= cellBounds.y &&
          shapeBounds.x + shapeBounds.width <= cellBounds.x + cellBounds.width &&
          shapeBounds.y + shapeBounds.height <= cellBounds.y + cellBounds.height
        );
      });

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

      // Convert base64 to Blob
      const byteCharacters = atob(imageBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });

      // Upload to Vercel Blob storage
      console.log('[generate-ui] Uploading image to Vercel Blob...');
      const { url } = await put(`tldraw-${Date.now()}.png`, blob, {
        access: 'public',
        token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
      });
      console.log('[generate-ui] Image uploaded to Vercel Blob:', url);

      // Create a chat with v0 SDK using the image URL
      console.log('[generate-ui] Creating v0 chat with image...');

      const chat = await client.chats.create({
        message: 'Build a React TypeScript app based on this design',
        system: `
          You are an expert React developer who builds the most beautiful UI in the world. 
          You will receive a mockup of a component. You will need to build a complete version of it, following the mockup.
          Generate clean, production-ready code with Tailwind CSS and shadcn/ui components.
          It should be production ready, can be competing with any other app in the market.
        `,
        responseMode: 'sync',
        attachments: [
          {
            url: url,
          },
        ],
        modelConfiguration: {
          modelId: 'v0-1.5-md',
          imageGenerations: false,
        },
      });

      // Type guard to ensure we have a ChatDetail and not a stream
      if (chat instanceof ReadableStream) {
        throw new Error('Unexpected streaming response');
      }

      const chatDetail = chat as ChatDetail;
      console.log('[generate-ui] Chat created:', chatDetail.id);
      console.log('[generate-ui] Full chatDetail:', JSON.stringify(chatDetail, null, 2));
      console.log('[generate-ui] Initial chat state:', {
        hasLatestVersion: !!chatDetail.latestVersion,
        files: chatDetail.latestVersion?.files?.length || 0,
        demoUrl: chatDetail.latestVersion?.demoUrl,
      });

      // Wait for preview URL to be available
      let previewUrl = chatDetail.latestVersion?.demoUrl || '';

      if (!previewUrl) {
        // Poll for preview URL if not immediately available
        let attempts = 0;
        const maxAttempts = 300;
        const delayMs = 2000;

        console.log('[generate-ui] Preview URL not immediately available, polling...');

        while (attempts < maxAttempts && !previewUrl) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempts++;

          try {
            const updatedChat = await client.chats.getById({ chatId: chatDetail.id });
            console.log(`[generate-ui] Poll attempt ${attempts}:`, {
              hasLatestVersion: !!updatedChat.latestVersion,
              demoUrl: updatedChat.latestVersion?.demoUrl,
            });

            if (updatedChat.latestVersion?.demoUrl) {
              previewUrl = updatedChat.latestVersion.demoUrl;
              console.log('[generate-ui] Preview URL found after polling');
              break;
            }
          } catch (pollError) {
            console.error(`[generate-ui] Error polling attempt ${attempts}:`, pollError);
          }
        }
      }

      if (!previewUrl) {
        console.error('[generate-ui] No preview URL generated after polling');
        throw new Error(
          `Preview generation is taking longer than expected. Chat ID: ${chatDetail.id}. ` +
            `You can check the chat status manually. Please try again later.`
        );
      }

      setPreviewUrl(previewUrl);
      setChatUrl(chatDetail.webUrl || '');

      // Save to history
      addToHistory({
        files: [],
        previewUrl,
        chatId: chatDetail.id,
        chatUrl: chatDetail.webUrl,
        chatDetail: chatDetail,
      });

      console.log('[generate-ui] Saved to history:', {
        chatId: chatDetail.id,
        chatUrl: chatDetail.webUrl,
        previewUrl,
      });

      setIsModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate UI';
      setError(errorMessage);
      console.error('Error generating UI:', err);
    } finally {
      setIsGeneratingUI(false);
    }
  };

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
          @keyframes sparkle {
            0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
            50% { transform: scale(1.2) rotate(180deg); opacity: 0.8; }
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
      {/* Generate UI Button - fancy magic button for accepted variants */}
      {/* Button persists once variant is accepted, until next generateVariants call */}
      {cellType === 'variant' && hasAcceptedVariant && (
        <button
          type="button"
          onClick={handleGenerateUIClick}
          disabled={isGeneratingUI}
          style={{
            position: 'absolute',
            top: '-48px',
            right: '0',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
            backgroundSize: '200% 200%',
            animation: 'shimmer 3s ease infinite, glow 2s ease-in-out infinite',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            zIndex: 30,
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)',
            pointerEvents: 'all',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            letterSpacing: '0.5px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            transform: 'translateZ(0)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(139, 92, 246, 0.6), 0 6px 16px rgba(0, 0, 0, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(139, 92, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)';
          }}
        >
          <Sparkle
            size={18}
            weight="fill"
            style={{
              animation: isGeneratingUI ? 'sparkle 0.5s ease-in-out infinite' : 'sparkle 2s ease-in-out infinite',
            }}
          />
          <span>{isGeneratingUI ? 'Generating...' : '✨ Generate UI'}</span>
        </button>
      )}
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
      {/* Label */}
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

      {/* Preview Modal */}
      <PreviewModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        previewUrl={previewUrl}
        chatUrl={chatUrl}
      />

      {/* Error Display */}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px 16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          <span style={{ fontSize: '14px', color: '#991b1b' }}>{error}</span>
        </div>
      )}
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
  canDelete() {
    return false;
  }

  // Allow editing (unlocking to move/resize)
  canEdit() {
    return true;
  }
}
