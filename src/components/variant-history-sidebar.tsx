'use client';

import { useState } from 'react';
import { useUIGenerationHistory, type UIGenerationHistoryItem } from '@/lib/stores/ui-generation-history';
import { Button } from '@/components/ui/button';
import { X, Trash } from '@phosphor-icons/react';
import { PreviewModal } from './preview-modal';
import dayjs from 'dayjs';

interface VariantHistorySidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cellIdentifier: string;
}

export function VariantHistorySidebar({ open, onOpenChange, cellIdentifier }: VariantHistorySidebarProps) {
  const { history, removeFromHistory } = useUIGenerationHistory();
  const [selectedItem, setSelectedItem] = useState<UIGenerationHistoryItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const filteredHistory = history.filter(
    (item) => item.cellIdentifier === cellIdentifier
  );

  const handleSelectItem = (item: UIGenerationHistoryItem) => {
    setSelectedItem(item);
    if (item.previewUrl) {
      setIsPreviewModalOpen(true);
    }
  };

  const formatShortDate = (timestamp: number) => {
    return dayjs(timestamp).format('MMM D h:mm A');
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        className="fixed inset-0 bg-black/20 z-40 border-0 p-0 cursor-pointer"
        onClick={() => onOpenChange(false)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            onOpenChange(false);
          }
        }}
        aria-label="Close sidebar"
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[600px] bg-white border-l shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">History: {cellIdentifier}</h2>
            <p className="text-sm text-muted-foreground">{filteredHistory.length} generation{filteredHistory.length !== 1 ? 's' : ''}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* History list */}
          <div className="w-64 border-r overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No history for {cellIdentifier}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredHistory.map((item) => (
                    <div key={item.id} className="border-b relative">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => handleSelectItem(item)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Preview Image */}
                          {item.previewUrl ? (
                            <div className="w-16 h-12 border rounded overflow-hidden shrink-0 bg-muted relative flex items-center justify-center">
                              <iframe
                                src={item.previewUrl}
                                className="absolute border-0 pointer-events-none"
                                style={{
                                  width: '640px',
                                  height: '480px',
                                  transform: 'scale(0.1)',
                                  transformOrigin: 'center center',
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
                              {item.chatId ? `${item.chatId} • ` : ''}
                              {formatShortDate(item.timestamp)}
                            </p>
                          </div>
                        </div>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 shrink-0 absolute right-3 top-1/2 -translate-y-1/2"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.id);
                          if (selectedItem?.id === item.id) {
                            setSelectedItem(null);
                          }
                        }}
                      >
                        <Trash className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedItem ? (
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Chat ID</h3>
                    <p className="text-xs text-muted-foreground">{selectedItem.chatId || 'N/A'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2">Generated</h3>
                    <p className="text-xs text-muted-foreground">{formatShortDate(selectedItem.timestamp)}</p>
                  </div>
                  {selectedItem.chatUrl && (
                    <div>
                      <Button
                        type="button"
                        asChild
                        className="w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
                      >
                        <a
                          href={selectedItem.chatUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-4 h-4"
                            aria-label="v0 logo"
                          >
                            <title>v0</title>
                            <path
                              d="M8 0L10.5 5.5L16 8L10.5 10.5L8 16L5.5 10.5L0 8L5.5 5.5L8 0Z"
                              fill="currentColor"
                            />
                          </svg>
                          <span>Open in v0.dev</span>
                        </a>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-muted-foreground text-sm">Select an item to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedItem && (
        <PreviewModal
          open={isPreviewModalOpen}
          onOpenChange={setIsPreviewModalOpen}
          previewUrl={selectedItem.previewUrl}
          chatUrl={selectedItem.chatUrl}
        />
      )}
    </>
  );
}

