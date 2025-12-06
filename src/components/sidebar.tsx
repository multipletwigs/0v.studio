'use client';

import { useState } from 'react';
import { CaretLeft, CaretRight, Clock, Trash, CaretDown, CaretRight as CaretRightIcon, File } from '@phosphor-icons/react';
import { useUIGenerationHistory } from '@/lib/stores/ui-generation-history';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { history, clearHistory, removeFromHistory } = useUIGenerationHistory();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatShortDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
              {history.map((item) => {
                const isExpanded = expandedItems.has(item.id);
                
                return (
                  <Collapsible
                    key={item.id}
                    open={isExpanded}
                    onOpenChange={() => toggleItem(item.id)}
                  >
                    <div className="border-b">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            {isExpanded ? (
                              <CaretDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                            ) : (
                              <CaretRightIcon className="w-3 h-3 shrink-0 text-muted-foreground" />
                            )}
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
                                {formatShortDate(item.timestamp)} • {item.files.length} file{item.files.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromHistory(item.id);
                            }}
                          >
                            <Trash className="w-3 h-3" />
                          </Button>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <div className="pl-8 pr-3 pb-3 space-y-1">
                          {item.files.map((file) => (
                            <button
                              key={file.name}
                              type="button"
                              className="w-full flex items-center gap-2 p-2 hover:bg-muted/50 rounded text-left transition-colors"
                              onClick={() => handleCopy(file.content)}
                              title="Click to copy"
                            >
                              <File className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs font-mono truncate flex-1">{file.name}</span>
                            </button>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

