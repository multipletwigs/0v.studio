'use client';

import { useState, useEffect } from 'react';
import { CaretLeft, CaretRight, Clock, Trash } from '@phosphor-icons/react';
import dayjs from 'dayjs';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';
import { Button } from '@/components/ui/button';
import { PreviewModal } from './preview-modal';
import { eventEmitter } from '@/lib/utils/event-emitter';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed
  const [filterCellIdentifier, setFilterCellIdentifier] = useState<string | null>(null);
  const [filterPageId, setFilterPageId] = useState<string | null>(null);
  const { history, clearHistory, removeFromHistory } = useUIGenerationHistory();
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string>('');
  const [selectedChatUrl, setSelectedChatUrl] = useState<string>('');
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  useEffect(() => {
    const handleOpenHistory = (data?: string | { cellIdentifier?: string; pageId?: string }) => {
      // Handle both old format (string) and new format (object)
      const cellIdentifier = typeof data === 'string' ? data : data?.cellIdentifier;
      const pageId = typeof data === 'object' ? data?.pageId : undefined;
      
      console.log('[Sidebar] Received open-history event:', cellIdentifier, pageId);
      
      // Toggle: if sidebar is open and showing the same cellIdentifier and pageId, close it
      if (!isCollapsed && filterCellIdentifier === cellIdentifier && filterPageId === pageId) {
        setIsCollapsed(true);
        setFilterCellIdentifier(null);
        setFilterPageId(null);
      } else {
        // Otherwise, open sidebar with the new filter
        setFilterCellIdentifier(cellIdentifier || null);
        setFilterPageId(pageId || null);
        setIsCollapsed(false);
      }
    };

    console.log('[Sidebar] Setting up event listener for open-history');
    eventEmitter.on('open-history', handleOpenHistory);

    return () => {
      console.log('[Sidebar] Cleaning up event listener');
      eventEmitter.off('open-history', handleOpenHistory);
    };
  }, [isCollapsed, filterCellIdentifier, filterPageId]);

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

  // Filter history by cellIdentifier and pageId if provided
  // If filtering, show items that match both cellIdentifier and pageId
  // Include old items without pageId for backward compatibility
  const filteredHistory = filterCellIdentifier
    ? history.filter((item) => {
        const matchesCellIdentifier = item.cellIdentifier === filterCellIdentifier;
        const matchesPageId = !filterPageId || item.pageId === filterPageId || !item.pageId; // Include items without pageId for backward compatibility
        return matchesCellIdentifier && matchesPageId;
      })
    : history;

  return (
    <>
      {/* Toggle button - always visible */}
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="fixed top-4 z-10 w-10 h-10 flex items-center justify-center bg-white rounded-lg shadow-lg hover:bg-gray-100 transition-all duration-300"
        style={{
          right: isCollapsed ? '16px' : '352px',
        }}
        title={isCollapsed ? 'Open History' : 'Close History'}
      >
        {isCollapsed ? <CaretLeft size={20} /> : <CaretRight size={20} />}
      </button>

      {/* Sidebar panel */}
      <div
        className="fixed top-4 right-4 z-50 w-80 bg-white border rounded-lg shadow-lg flex flex-col transition-all duration-300 ease-in-out"
        style={{
          height: 'calc(100% - 32px)',
          transform: isCollapsed ? 'translateX(calc(100% + 16px))' : 'translateX(0)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
            {filterCellIdentifier}
            </h2>
          </div>
        </div>

      {/* History Section */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <h3 className="text-sm font-medium">
              History ({filteredHistory.length})
            </h3>
          </div>
          {filteredHistory.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (filterCellIdentifier) {
                  // Remove only filtered items
                  filteredHistory.forEach((item) => {
                    removeFromHistory(item.id);
                  });
                  setFilterCellIdentifier(null);
                } else {
                  clearHistory();
                }
              }}
              className="h-6 w-6 p-0"
            >
              <Trash className="w-3 h-3" />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <p className="text-sm">
                {filterCellIdentifier 
                  ? `No history for ${filterCellIdentifier}` 
                  : 'No generation history yet'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredHistory.map((item) => (
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
                          {item.chatId ? `${item.chatId} • ` : ''}
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
      </div>
      <PreviewModal
        open={isPreviewModalOpen}
        onOpenChange={setIsPreviewModalOpen}
        previewUrl={selectedPreviewUrl}
        chatUrl={selectedChatUrl}
      />
    </>
  );
}

