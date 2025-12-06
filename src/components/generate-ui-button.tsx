'use client';

import { useState } from 'react';
import { useEditor, useValue } from 'tldraw';
import { Sparkle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  const [generatedFiles, setGeneratedFiles] = useState<Array<{ name: string; content: string }>>([]);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

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
    setGeneratedFiles([]);
    setPreviewUrl('');
    setActiveTab('');

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
      console.log('[generate-ui] Initial chat state:', {
        hasLatestVersion: !!chatDetail.latestVersion,
        files: chatDetail.latestVersion?.files?.length || 0,
        demoUrl: chatDetail.latestVersion?.demoUrl,
      });

      // Check if files are already available
      let files: Array<{ name: string; content: string }> = [];
      let previewUrl = chatDetail.latestVersion?.demoUrl || '';
      
      if (chatDetail.latestVersion?.files && chatDetail.latestVersion.files.length > 0) {
        files = chatDetail.latestVersion.files.map((file) => ({
          name: file.name || 'unknown',
          content: file.content || '',
        }));
        previewUrl = chatDetail.latestVersion.demoUrl || previewUrl;
        console.log('[generate-ui] Files available immediately:', files.length);
      } else {
        // Wait a bit for code generation, then fetch the chat again to get the files
        // Sometimes the files aren't immediately available
        let attempts = 0;
        const maxAttempts = 300; // Increased from 10 to 20
        const delayMs = 2000; // Increased from 1000ms to 2000ms

        console.log('[generate-ui] Files not immediately available, polling...');
        
        while (attempts < maxAttempts && files.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempts++;
          
          try {
            const updatedChat = await client.chats.getById({ chatId: chatDetail.id });
            console.log(`[generate-ui] Poll attempt ${attempts}:`, {
              hasLatestVersion: !!updatedChat.latestVersion,
              files: updatedChat.latestVersion?.files?.length || 0,
              demoUrl: updatedChat.latestVersion?.demoUrl,
            });
            
            if (updatedChat.latestVersion?.files && updatedChat.latestVersion.files.length > 0) {
              files = updatedChat.latestVersion.files.map((file) => ({
                name: file.name || 'unknown',
                content: file.content || '',
              }));
              previewUrl = updatedChat.latestVersion.demoUrl || previewUrl;
              console.log('[generate-ui] Files found after polling:', files.length);
              break;
            }
          } catch (pollError) {
            console.error(`[generate-ui] Error polling attempt ${attempts}:`, pollError);
          }
        }
      }

      if (!files || files.length === 0) {
        console.error('[generate-ui] No files generated after polling');
        throw new Error(
          `Code generation is taking longer than expected. Chat ID: ${chatDetail.id}. ` +
          `You can check the chat status manually. Please try again later.`
        );
      }

      // Store files separately
      setGeneratedFiles(files);
      setPreviewUrl(previewUrl);
      setActiveTab(files[0]?.name || '');
      
      // Save to history
      addToHistory({
        files,
        previewUrl,
        chatId: chatDetail.id,
        chatUrl: chatDetail.webUrl,
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

  const handleCopy = async (content?: string) => {
    try {
      const textToCopy = content || generatedFiles.find(f => f.name === activeTab)?.content || '';
      await navigator.clipboard.writeText(textToCopy);
    } catch (err) {
      console.error('Failed to copy:', err);
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

      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent 
          className="max-h-[95vh] h-full flex flex-col p-6"
          style={{ width: 'calc(100% - 80px)' }}
        >
          <DialogHeader>
            <DialogTitle>Generated UI Code</DialogTitle>
            <DialogDescription>
              View the preview and generated React/Next.js code files.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 mt-4">
            {/* Preview on the left */}
            {previewUrl && (
              <div className="flex-1 border rounded-lg overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b bg-muted/50">
                  <h3 className="text-sm font-medium">Preview</h3>
                </div>
                <iframe
                  src={previewUrl}
                  className="flex-1 w-full border-0"
                  title="Generated UI Preview"
                />
              </div>
            )}

            {/* Code on the right */}
            <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
                <h3 className="text-sm font-medium">Generated Code</h3>
                {activeTab && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy()}
                  >
                    Copy Current File
                  </Button>
                )}
              </div>
              
              {generatedFiles.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                  <TabsList className="w-full justify-start rounded-none border-b px-4">
                    {generatedFiles.map((file) => (
                      <TabsTrigger
                        key={file.name}
                        value={file.name}
                        className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
                      >
                        {file.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  
                  {generatedFiles.map((file) => (
                    <TabsContent
                      key={file.name}
                      value={file.name}
                      className="flex-1 overflow-auto m-0 p-4"
                    >
                      <textarea
                        value={file.content}
                        readOnly
                        className="w-full h-full p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                        style={{ minHeight: '100%' }}
                      />
                    </TabsContent>
                  ))}
                </Tabs>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8">
                  <p className="text-muted-foreground">No code generated yet</p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Close
            </Button>
            {generatedFiles.length > 0 && (
              <Button
                type="button"
                onClick={() => handleCopy()}
              >
                Copy Current File
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

