'use client';

import { useState } from 'react';
import { useUIGenerationHistory, type UIGenerationHistoryItem } from '@/lib/stores/ui-generation-history';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash } from '@phosphor-icons/react';

interface UIGenerationHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UIGenerationHistoryModal({ open, onOpenChange }: UIGenerationHistoryModalProps) {
  const { history, clearHistory, removeFromHistory } = useUIGenerationHistory();
  const [selectedItem, setSelectedItem] = useState<UIGenerationHistoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>('');

  const handleSelectItem = (item: UIGenerationHistoryItem) => {
    setSelectedItem(item);
    setActiveTab(item.files[0]?.name || '');
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[95vw] w-[calc(100%-80px)] max-h-[95vh] h-full flex flex-col p-6"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>UI Generation History</DialogTitle>
              <DialogDescription>
                View and manage your previously generated UI code.
              </DialogDescription>
            </div>
            {history.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearHistory}
                className="flex items-center gap-2"
              >
                <Trash className="w-4 h-4" />
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4 mt-4">
          {/* History list on the left */}
          <div className="w-80 border rounded-lg overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b bg-muted/50">
              <h3 className="text-sm font-medium">
                History ({history.length})
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p className="text-sm">No generation history yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {history.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`w-full text-left p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedItem?.id === item.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleSelectItem(item)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.files[0]?.name || 'Untitled'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(item.timestamp)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.files.length} file{item.files.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
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
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected item details on the right */}
          <div className="flex-1 flex flex-col border rounded-lg overflow-hidden">
            {selectedItem ? (
              <>
                <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium">{selectedItem.files[0]?.name || 'Untitled'}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(selectedItem.timestamp)}
                    </p>
                  </div>
                  {activeTab && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(selectedItem.files.find(f => f.name === activeTab)?.content || '')}
                    >
                      Copy Current File
                    </Button>
                  )}
                </div>

                <div className="flex-1 overflow-hidden flex gap-4 p-4">
                  {/* Preview */}
                  {selectedItem.previewUrl && (
                    <div className="w-1/2 border rounded-lg overflow-hidden flex flex-col">
                      <div className="px-4 py-2 border-b bg-muted/50">
                        <h4 className="text-sm font-medium">Preview</h4>
                      </div>
                      <iframe
                        src={selectedItem.previewUrl}
                        className="flex-1 w-full border-0"
                        title="Generated UI Preview"
                      />
                    </div>
                  )}

                  {/* Code tabs */}
                  <div className={`${selectedItem.previewUrl ? 'w-1/2' : 'w-full'} flex flex-col`}>
                    <Tabs
                      value={activeTab}
                      onValueChange={setActiveTab}
                      className="flex-1 flex flex-col overflow-hidden"
                    >
                      <TabsList className="w-full justify-start rounded-none border-b px-4">
                        {selectedItem.files.map((file) => (
                          <TabsTrigger
                            key={file.name}
                            value={file.name}
                            className="data-[state=active]:border-b-2 data-[state=active]:border-primary"
                          >
                            {file.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>

                      {selectedItem.files.map((file) => (
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
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <p className="text-muted-foreground">Select an item from the history to view details</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

