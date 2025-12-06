'use client';

import { useState } from 'react';
import { useEditor, useValue } from 'tldraw';
import { Download } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { exportShapesToJSONString } from '@/lib/utils/export-shapes-to-json';

export function ExportShapesButton() {
  const editor = useEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  
  const hasSelection = useValue(
    'hasSelection',
    () => editor.getSelectedShapeIds().length > 0,
    [editor]
  );

  const handleExport = () => {
    const json = exportShapesToJSONString(editor);
    if (json) {
      setJsonOutput(json);
      setIsModalOpen(true);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonOutput);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tldraw-shapes.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!hasSelection) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleExport}
        title="Export Selected Shapes as JSON"
      >
        <Download className="w-4 h-4" weight="fill" />
        Export Shapes
      </Button>
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Export Shapes as JSON</DialogTitle>
            <DialogDescription>
              Copy or download the tldraw JSON for the selected shapes.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <textarea
              value={jsonOutput}
              readOnly
              className="flex-1 w-full p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              style={{ minHeight: '300px' }}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCopy}
            >
              Copy to Clipboard
            </Button>
            <Button
              type="button"
              onClick={handleDownload}
            >
              Download JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

