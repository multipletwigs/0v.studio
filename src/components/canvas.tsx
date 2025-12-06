'use client';

import { Cursor, PencilSimple, Eraser, ArrowCounterClockwise, ArrowClockwise } from '@phosphor-icons/react';
import { Tldraw, useEditor, useValue } from 'tldraw';
import 'tldraw/tldraw.css';
import { VariantProvider } from '@/lib/hooks/use-variant-generation';
import { VariantControls } from './variant-controls';
import { GenerateVariantsButton } from './generate-variants-button';

function CanvasInner() {
  return (
    <div className="relative w-full h-screen">
      <Tldraw hideUi>
        <CanvasUI />
      </Tldraw>
    </div>
  );
}

function Toolbar() {
  const editor = useEditor();
  const currentToolId = useValue('current tool', () => editor.getCurrentToolId(), [editor]);
  const canUndo = useValue('can undo', () => editor.getCanUndo(), [editor]);
  const canRedo = useValue('can redo', () => editor.getCanRedo(), [editor]);

  const tools = [
    { id: 'select', icon: Cursor, label: 'Select' },
    { id: 'draw', icon: PencilSimple, label: 'Draw' },
    { id: 'eraser', icon: Eraser, label: 'Erase' },
  ];

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => editor.setCurrentTool(tool.id)}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors ${currentToolId === tool.id
              ? 'bg-blue-100 text-blue-600'
              : 'hover:bg-gray-100'
            }`}
          title={tool.label}
        >
          <tool.icon size={20} />
        </button>
      ))}
      <div className="w-full h-px bg-gray-200 my-1" />
      <button
        onClick={() => editor.undo()}
        disabled={!canUndo}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Undo"
      >
        <ArrowCounterClockwise size={20} />
      </button>
      <button
        onClick={() => editor.redo()}
        disabled={!canRedo}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Redo"
      >
        <ArrowClockwise size={20} />
      </button>
    </div>
  );
}

function CanvasUI() {
  return (
    <>
      <Toolbar />
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
