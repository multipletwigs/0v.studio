'use client';

import { useState } from 'react';
import { useEditor } from 'tldraw';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createShapesFromJSON, exampleShapesJSON, type ShapesJSON } from '@/lib/utils/create-shapes-from-json';

interface InsertShapesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InsertShapesModal({ isOpen, onClose }: InsertShapesModalProps) {
  const editor = useEditor();
  const [jsonInput, setJsonInput] = useState(JSON.stringify(exampleShapesJSON, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleInsert = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Parse JSON
      const parsed: ShapesJSON = JSON.parse(jsonInput);

      // Validate structure
      if (!parsed.shapes || !Array.isArray(parsed.shapes)) {
        throw new Error('Invalid JSON structure. Expected { "shapes": [...] }');
      }

      // Create shapes
      createShapesFromJSON(editor, parsed);
      
      // Close modal on success
      onClose();
      setJsonInput(JSON.stringify(exampleShapesJSON, null, 2)); // Reset to example
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadExample = () => {
    setJsonInput(JSON.stringify(exampleShapesJSON, null, 2));
    setError(null);
  };

  const handleClear = () => {
    setJsonInput('');
    setError(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Insert Shapes from JSON</DialogTitle>
          <DialogDescription>
            Paste your tldraw shapes JSON to create shapes on the canvas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLoadExample}
            >
              Load Example
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              Clear
            </Button>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => {
              setJsonInput(e.target.value);
              setError(null);
            }}
            placeholder='Paste your JSON here...\n\nExample:\n{\n  "shapes": [\n    {\n      "type": "geo",\n      "x": 100,\n      "y": 100,\n      "props": {\n        "w": 200,\n        "h": 200,\n        "geo": "rectangle",\n        "color": "black",\n        "fill": "none",\n        "dash": "draw",\n        "size": "m"\n      }\n    }\n  ]\n}'
            className="flex-1 w-full p-3 border rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ minHeight: '300px' }}
          />

          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInsert}
            disabled={isLoading || !jsonInput.trim()}
          >
            {isLoading ? 'Inserting...' : 'Insert Shapes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

