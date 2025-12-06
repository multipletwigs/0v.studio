'use client';

import { useState } from 'react';
import { CaretLeft, CaretRight, Clock, Trash } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';
import { Button } from '@/components/ui/button';
import { PreviewModal } from './preview-modal';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { history, clearHistory, removeFromHistory } = useUIGenerationHistory();
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string>('');
  const [selectedChatUrl, setSelectedChatUrl] = useState<string>('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handleItemClick = (item: { previewUrl: string; chatUrl?: string }) => {
    if (item.previewUrl) {
      setSelectedPreviewUrl(item.previewUrl);
      setSelectedChatUrl(item.chatUrl || '');
      setIsPreviewModalOpen(true);
    }
  };

  const formatShortDate = (timestamp: number) => {
    return dayjs(timestamp).format('MMM D h:mm A');
  };

  if (isCollapsed) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <Button
          type="button"
          size="sm"
          onClick={() => setIsCollapsed(false)}
          className="shadow-lg"
        >
          <CaretRight className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-80 bg-white border-r shadow-sm flex flex-col">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Sidebar</h2>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsCollapsed(true)}
        >
          <CaretLeft className="w-4 h-4" />
        </Button>
      </div>

      {/* History Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <h3 className="text-sm font-medium">History ({history.length})</h3>
          </div>
          {history.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="h-6 w-6 p-0"
            >
              <Trash className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {history.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">No generation history yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {history.map((item) => (
                <div key={item.id} className="border-b">
                  <div className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                    <button
                      type="button"
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Preview Image */}
                      {item.previewUrl ? (
                        <div className="w-16 h-12 border rounded overflow-hidden shrink-0 bg-muted relative">
                          <iframe
                            src={item.previewUrl}
                            className="absolute inset-0 w-full h-full border-0 pointer-events-none"
                            style={{
                              transform: 'scale(0.1)',
                              transformOrigin: 'top left',
                              width: '640px',
                              height: '480px',
                            }}
                            title="Preview"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-12 border rounded shrink-0 bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No preview</span>
                        </div>
                      )}
                      {/* Metadata */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">
                          {formatShortDate(item.timestamp)}
                        </p>
                      </div>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 shrink-0"
                      onClick={() => removeFromHistory(item.id)}
                    >
                      <Trash className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <PreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        previewUrl={selectedPreviewUrl}
        chatUrl={selectedChatUrl}
      />
    </div>
  );
}

