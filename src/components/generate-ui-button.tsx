'use client';

import { useState } from 'react';
import { useEditor, useValue } from 'tldraw';
import { Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { PreviewModal } from './preview-modal';
import { createClient, type ChatDetail } from 'v0-sdk';
import { exportSelection } from '@/lib/utils/export-selection';
import { put } from '@vercel/blob';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';

// Create v0 client with API key from environment variable
// For client-side, use NEXT_PUBLIC_V0_API_KEY
const client = createClient({
  apiKey: process.env.NEXT_PUBLIC_V0_API_KEY || process.env.V0_API_KEY,
});

export function GenerateUIButton() {
  const editor = useEditor();
  const addToHistory = useUIGenerationHistory((state) => state.addToHistory);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [chatUrl, setChatUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Get selected shapes and their bounds
  const selectionData = useValue(
    'selectionData',
    () => {
      const selectedIds = editor.getSelectedShapeIds();
      if (selectedIds.length === 0) return null;

      const bounds = editor.getSelectionPageBounds();
      if (!bounds) return null;

      const screenPoint = editor.pageToScreen({
        x: bounds.x + bounds.width,
        y: bounds.y + bounds.height / 2,
      });

      return {
        selectedIds,
        bounds,
        screenX: screenPoint.x + 10,
        screenY: screenPoint.y,
      };
    },
    [editor]
  );

  const handleGenerate = async () => {
    if (!selectionData) return;

    setIsGenerating(true);
    setError(null);
    setPreviewUrl('');

    try {
      // Export selection as image
      const { imageBase64 } = await exportSelection(editor);

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
      const { url } = await put(`tldraw-${Date.now()}.png`, blob, { access: 'public', token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN });
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
      
      // Save to history (with empty files array since we don't need code)
      addToHistory({
        files: [],
        previewUrl,
        chatId: chatDetail.id,
        chatUrl: chatDetail.webUrl,
        chatDetail: chatDetail, // Store full chatDetail for debugging
      });
      
      console.log('[generate-ui] Saved to history with chatDetail:', {
        chatId: chatDetail.id,
        chatUrl: chatDetail.webUrl,
        previewUrl,
        chatDetailKeys: Object.keys(chatDetail),
      });
      
      setIsModalOpen(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate UI';
      setError(errorMessage);
      console.error('Error generating UI:', err);
    } finally {
      setIsGenerating(false);
    }
  };


  if (!selectionData) return null;

  return (
    <>
      <div
        className="fixed z-50"
        style={{
          left: selectionData.screenX,
          top: selectionData.screenY,
          transform: 'translateY(-50%)',
        }}
      >
        <Button
          type="button"
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="shadow-lg"
        >
          {isGenerating ? (
            <>
              <Sparkle className="w-4 h-4 animate-spin" weight="fill" />
              Generating...
            </>
          ) : (
            <>
              <Sparkle className="w-4 h-4" weight="fill" />
              Generate UI
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      <PreviewModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        previewUrl={previewUrl}
        chatUrl={chatUrl}
      />
    </>
  );
}

