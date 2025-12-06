'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Tldraw, Editor } from 'tldraw';
import 'tldraw/tldraw.css';
import {
  VariantProvider,
  useVariantGeneration,
} from '@/lib/hooks/use-variant-generation';
import { VariantControls } from './variant-controls';
import { GenerateVariantsButton } from './generate-variants-button';

function CanvasInner() {
  const { generateVariants, reset } = useVariantGeneration();
  const editorRef = useRef<Editor | null>(null);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;
  }, []);

  // Register keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!editorRef.current) return;

      // Cmd/Ctrl + Shift + G to generate variants
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        generateVariants(editorRef.current);
      }

      // Escape to dismiss pending variants
      if (e.key === 'Escape') {
        reset(editorRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [generateVariants, reset]);

  return (
    <div className="relative w-full h-screen">
      <Tldraw onMount={handleMount}>
        <CanvasUI />
      </Tldraw>
    </div>
  );
}

function CanvasUI() {
  return (
    <>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
        <GenerateVariantsButton />
      </div>
      <VariantControls />
    </>
  );
}

export function Canvas() {
  return (
    <VariantProvider>
      <CanvasInner />
    </VariantProvider>
  );
}
