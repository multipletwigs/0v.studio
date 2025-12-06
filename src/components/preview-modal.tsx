'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogoV0 } from './logov0';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  chatUrl?: string;
}

export function PreviewModal({ open, onOpenChange, previewUrl, chatUrl }: PreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[95vh] h-full flex flex-col p-6"
        style={{ minWidth: '80vw' }}
      >
        <DialogHeader>
          <DialogTitle>Generated UI Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4 relative">
          {previewUrl ? (
            <div key={previewUrl} className="w-full h-full border rounded-lg overflow-hidden flex flex-col relative">
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              )}
              <iframe
                src={previewUrl}
                className="flex-1 w-full border-0"
                title="Generated UI Preview"
                onLoad={() => setIsLoading(false)}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-8">
              <p className="text-muted-foreground">No preview available</p>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          {chatUrl && (
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                <span>Open in</span>
                <LogoV0 />
              </a>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

