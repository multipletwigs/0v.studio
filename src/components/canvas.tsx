'use client';

import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';
import { VariantProvider } from '@/lib/hooks/use-variant-generation';
import { VariantControls } from './variant-controls';
import { GenerateVariantsButton } from './generate-variants-button';

function CanvasInner() {
  return (
    <div className="relative w-full h-screen">
      <Tldraw>
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
