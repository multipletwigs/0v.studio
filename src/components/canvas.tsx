'use client';

import { useEffect } from 'react';
import { Cursor, PencilSimple, Eraser, ArrowCounterClockwise, ArrowClockwise, Camera, Square, Circle, TextT, Sparkle } from '@phosphor-icons/react';
import {
  Tldraw,
  useEditor,
  useValue,
  createShapeId,
  DefaultStylePanel,
  DefaultStylePanelContent,
  useRelevantStyles,
  TldrawUiButton,
  TldrawUiButtonIcon,
  DefaultSizeStyle,
} from 'tldraw';
import 'tldraw/tldraw.css';
import { VariantProvider } from '@/lib/hooks/use-variant-generation';
import { GridProvider, useGridCanvas } from '@/lib/hooks/use-grid-canvas';
import { VariantControls } from './variant-controls';
import { Sidebar } from './sidebar';
import { downloadCanvas } from '@/lib/utils/export-canvas';
import { GridCellShapeUtil } from '@/lib/shapes/GridCellShape';
import { VariantImageShapeUtil } from '@/lib/shapes/VariantImageShape';

function GridInitializer() {
  const editor = useEditor();
  const { initializeGrid } = useGridCanvas();

  // Track current page to re-initialize grid when page changes
  const currentPageId = useValue('currentPageId', () => editor.getCurrentPageId(), [editor]);

  useEffect(() => {
    initializeGrid(editor);
    // Set default draw size to small
    editor.setStyleForNextShapes(DefaultSizeStyle, 's');
  }, [editor, initializeGrid, currentPageId]);

  return null;
}

function CanvasInner() {
  return (
    <div className="h-screen w-full relative">
      <Sidebar />
      <div className="h-full w-full">
        <Tldraw
          persistenceKey='a'
          licenseKey='tldraw-2026-03-16/WyJybFViaVJlMiIsWyIqIl0sMTYsIjIwMjYtMDMtMTYiXQ.cVnbg08UUamCi+6259s8/WrMR1WXyXjKFyApluCPEa0NexWO6V6CbfTqyCACn7ApofShT48ZphxFonuNDYIgEA'
          shapeUtils={[GridCellShapeUtil, VariantImageShapeUtil]}
          components={{
            ContextMenu: null,
            HelpMenu: null,
            ZoomMenu: null,
            MainMenu: null,
            Toolbar: null,
            // PageMenu: null,
            NavigationPanel: null,
            // DebugPanel: null,
            // DebugMenu: null,
            // SharePanel: null,
            // MenuPanel: null,
            // TopPanel: null,
            StylePanel: null,
          }}
        >
          <GridInitializer />
          <CanvasUI />
        </Tldraw>
      </div>
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
    { id: 'text', icon: TextT, label: 'Text' },
  ];

  const shapes = [
    { type: 'geo' as const, geo: 'rectangle' as const, icon: Square, label: 'Rectangle' },
    { type: 'geo' as const, geo: 'ellipse' as const, icon: Circle, label: 'Circle' },
  ];

  const createShape = (type: 'geo', geo: string) => {
    const viewport = editor.getViewportPageBounds();
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    const shapeId = createShapeId();

    editor.createShape({
      id: shapeId,
      type,
      x: centerX - 50, // Center the shape
      y: centerY - 50,
      props: {
        w: 100,
        h: 100,
        geo,
        color: 'black',
        fill: 'none',
        dash: 'solid',
        size: 'm',
      },
    });

    // Select the newly created shape
    editor.setSelectedShapes([shapeId]);
  };

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-3">
      <GenerateGridButton />
      <div className="flex flex-col gap-2 bg-white rounded-lg shadow-lg p-2">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
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
        {shapes.map((shape) => (
          <button
            key={shape.geo}
            type="button"
            onClick={() => createShape(shape.type, shape.geo)}
            className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            title={shape.label}
          >
            <shape.icon size={20} />
          </button>
        ))}
        <div className="w-full h-px bg-gray-200 my-1" />
        <button
          type="button"
          onClick={async () => {
            try {
              await downloadCanvas(editor);
            } catch (error) {
              console.error('Failed to download canvas:', error);
              alert('Failed to take screenshot. Make sure there are shapes on the canvas.');
            }
          }}
          className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          title="Take Screenshot"
        >
          <Camera size={20} />
        </button>
      </div>
    </div>
  );
}

function GenerateGridButton() {
  const editor = useEditor();
  const { generateVariants, state } = useGridCanvas();

  return (
    <div className="bg-white rounded-lg shadow-lg p-2">
      <button
        type="button"
        onClick={() => generateVariants(editor)}
        disabled={state.isGenerating}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        title={state.isGenerating ? 'Generating...' : 'Generate Variants'}
      >
        <Sparkle
          size={20}
          weight="fill"
          className={state.isGenerating ? 'animate-spin' : ''}
          style={{
            background: 'linear-gradient(to right, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        />
      </button>
    </div>
  );
}


function CanvasUI() {
  return (
    <>
      <Toolbar />
      <VariantControls />
    </>
  );
}

export function Canvas() {
  return (
    <GridProvider>
      <VariantProvider>
        <CanvasInner />
      </VariantProvider>
    </GridProvider>
  );
}
