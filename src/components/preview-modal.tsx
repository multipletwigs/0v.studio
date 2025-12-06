'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  previewUrl: string;
  chatUrl?: string;
}

export function PreviewModal({ open, onOpenChange, previewUrl, chatUrl }: PreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-h-[95vh] h-full flex flex-col p-6"
        style={{ width: '80%' }}
      >
        <DialogHeader>
          <DialogTitle>Generated UI Preview</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden mt-4">
          {previewUrl ? (
            <div className="w-full h-full border rounded-lg overflow-hidden flex flex-col">
              <iframe
                src={previewUrl}
                className="flex-1 w-full border-0"
                title="Generated UI Preview"
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
            <Button
              type="button"
              asChild
              className="bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              <a
                href={chatUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
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

