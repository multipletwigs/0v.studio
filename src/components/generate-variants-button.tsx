'use client';

import { useEditor, useValue } from 'tldraw';
import { useVariantGeneration } from '@/lib/hooks/use-variant-generation';
import { SparkleIcon } from '@phosphor-icons/react';

export function GenerateVariantsButton() {
  const editor = useEditor();
  const { state, generateVariants } = useVariantGeneration();

  const hasSelection = useValue(
    'hasSelection',
    () => editor.getSelectedShapeIds().length > 0,
    [editor]
  );

  const handleClick = () => {
    generateVariants(editor);
  };

  // Hide when no selection or already generating
  if (!hasSelection || state.isGenerating) {
    return null;
  }

  // Hide when there are pending variants
  const hasPending = state.variants.some((v) => v.status === 'pending');
  if (hasPending) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition-colors shadow-md"
    >
      <SparkleIcon className="w-4 h-4" weight="fill" />
      Refine
    </button>
  );
}
