'use client';

import { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from 'react';
import { createShapeId, type Editor, type TLShapeId, type TLPageId } from 'tldraw';

export interface GridCell {
  id: string;
  index: number;
  type: 'seed' | 'variant';
  bounds: { x: number; y: number; w: number; h: number };
  frameId?: TLShapeId;
  imageShapeId?: TLShapeId;
  imageUrl?: string;
  isGenerating?: boolean;
}


interface GridState {
  cells: GridCell[];
  columns: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  gap: number;
  isGenerating: boolean;
  initialized: boolean;
}

type GridAction =
  | { type: 'INIT_GRID'; cells: GridCell[] }
  | { type: 'SET_GRID_SIZE'; columns: number; rows: number }
  | { type: 'START_GENERATION' }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'GENERATION_ERROR' }
  | { type: 'CLEAR_VARIANT'; cellId: string }
  | { type: 'CLEAR_ALL_VARIANTS' };

const CELL_WIDTH = 600;
const CELL_HEIGHT = 600;
const GAP = 60;

// Layout: Seed on left (x=0), variants to the right (positive x)
function calculateCellBounds(
  index: number,
  cellWidth: number,
  cellHeight: number,
  gap: number
) {
  // Seed is at index 0, positioned at x=0
  // Variants are to the right with positive x values
  const x = index * (cellWidth + gap);
  return {
    x,
    y: 0,
    w: cellWidth,
    h: cellHeight,
  };
}

function createGridCells(variantCount: number): GridCell[] {
  const cells: GridCell[] = [];

  // Seed cell at index 0 (x=0)
  cells.push({
    id: 'seed',
    index: 0,
    type: 'seed',
    bounds: calculateCellBounds(0, CELL_WIDTH, CELL_HEIGHT, GAP),
  });

  // Variant cells to the left (negative x)
  for (let i = 1; i <= variantCount; i++) {
    cells.push({
      id: `variant-${i}`,
      index: i,
      type: 'variant',
      bounds: calculateCellBounds(i, CELL_WIDTH, CELL_HEIGHT, GAP),
    });
  }

  return cells;
}

const VARIANT_COUNT = 3;

const initialState: GridState = {
  cells: createGridCells(VARIANT_COUNT),
  columns: VARIANT_COUNT + 1, // seed + variants
  rows: 1,
  cellWidth: CELL_WIDTH,
  cellHeight: CELL_HEIGHT,
  gap: GAP,
  isGenerating: false,
  initialized: false,
};

function gridReducer(state: GridState, action: GridAction): GridState {
  switch (action.type) {
    case 'INIT_GRID':
      return { ...state, cells: action.cells, initialized: true };

    case 'SET_GRID_SIZE': {
      const newCells = createGridCells(VARIANT_COUNT);
      return {
        ...state,
        columns: VARIANT_COUNT + 1,
        rows: 1,
        cells: newCells,
        initialized: false,
      };
    }

    case 'START_GENERATION':
      return {
        ...state,
        isGenerating: true,
        cells: state.cells.map((cell) =>
          cell.type === 'variant' ? { ...cell, isGenerating: true } : cell
        ),
      };

    case 'GENERATION_COMPLETE':
      return {
        ...state,
        isGenerating: false,
        cells: state.cells.map((cell) => ({ ...cell, isGenerating: false })),
      };

    case 'GENERATION_ERROR':
      return {
        ...state,
        isGenerating: false,
        cells: state.cells.map((cell) => ({ ...cell, isGenerating: false })),
      };

    case 'CLEAR_VARIANT':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.id === action.cellId ? { ...cell, imageUrl: undefined, imageShapeId: undefined } : cell
        ),
      };

    case 'CLEAR_ALL_VARIANTS':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.type === 'variant' ? { ...cell, imageUrl: undefined, imageShapeId: undefined } : cell
        ),
      };

    default:
      return state;
  }
}

interface GridContextValue {
  state: GridState;
  initializeGrid: (editor: Editor) => void;
  createNewPage: (editor: Editor) => void;
  generateVariants: (editor: Editor) => Promise<void>;
  clearVariant: (cellId: string, editor: Editor) => void;
  clearAllVariants: (editor: Editor) => void;
}

const GridContext = createContext<GridContextValue | null>(null);

export function GridProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gridReducer, initialState);
  const initializedPagesRef = useRef<Set<TLPageId>>(new Set());
  const pageCountRef = useRef(1);

  const initializeGridOnPage = useCallback(
    (editor: Editor) => {
      const currentPageId = editor.getCurrentPageId();

      // Skip if this page is already initialized
      if (initializedPagesRef.current.has(currentPageId)) return;

      // Only create the seed cell shape
      const seedCell = state.cells.find((c) => c.type === 'seed');
      if (seedCell) {
        const frameId = createShapeId();
        editor.createShape({
          id: frameId,
          type: 'grid-cell',
          x: seedCell.bounds.x,
          y: seedCell.bounds.y,
          isLocked: true,
          props: {
            w: seedCell.bounds.w,
            h: seedCell.bounds.h,
            cellType: 'seed',
            cellIndex: 0,
            label: '✏️ DRAW YOUR LOFI MOCKUP HERE!!',
          },
        });

        // Center camera on the seed cell
        const centerX = seedCell.bounds.x + seedCell.bounds.w / 2;
        const centerY = seedCell.bounds.y + seedCell.bounds.h / 2;
        editor.centerOnPoint({ x: centerX, y: centerY }, { animation: { duration: 0 } });
      }

      initializedPagesRef.current.add(currentPageId);
      dispatch({ type: 'INIT_GRID', cells: state.cells });
    },
    [state.cells]
  );

  const initializeGrid = useCallback(
    (editor: Editor) => {
      initializeGridOnPage(editor);
    },
    [initializeGridOnPage]
  );

  const createNewPage = useCallback(
    (editor: Editor) => {
      pageCountRef.current += 1;
      const newPageId = `page:page-${pageCountRef.current}` as TLPageId;

      // Create a new page
      editor.createPage({ id: newPageId, name: `Grid ${pageCountRef.current}` });

      // Switch to the new page
      editor.setCurrentPage(newPageId);

      // Reset state for the new page
      dispatch({ type: 'SET_GRID_SIZE', columns: VARIANT_COUNT + 1, rows: 1 });

      // Initialize grid on the new page after a tick
      setTimeout(() => {
        initializeGridOnPage(editor);
      }, 0);
    },
    [initializeGridOnPage]
  );

  const generateVariants = useCallback(
    async (editor: Editor) => {
      const seedCell = state.cells.find((c) => c.type === 'seed');
      if (!seedCell) return;

      // Get shapes inside the seed cell bounds (excluding grid-cell shapes)
      const allShapes = editor.getCurrentPageShapes();
      const seedShapes = allShapes.filter((shape) => {
        // Skip grid-cell and variant-image shapes
        if (shape.type === 'grid-cell' || shape.type === 'variant-image') return false;

        // Check if shape bounds overlap with seed cell
        const shapeBounds = editor.getShapePageBounds(shape.id);
        if (!shapeBounds) return false;
        return (
          shapeBounds.x >= seedCell.bounds.x &&
          shapeBounds.y >= seedCell.bounds.y &&
          shapeBounds.x + shapeBounds.w <= seedCell.bounds.x + seedCell.bounds.w &&
          shapeBounds.y + shapeBounds.h <= seedCell.bounds.y + seedCell.bounds.h
        );
      });

      if (seedShapes.length === 0) {
        alert('Draw something in the seed card first!');
        return;
      }

      dispatch({ type: 'START_GENERATION' });

      // Create placeholder variant cell shapes with generating state
      const variantCells = state.cells.filter((c) => c.type === 'variant');
      const variantCellShapeIds: Record<string, ReturnType<typeof createShapeId>> = {};

      for (const cell of variantCells) {
        const cellShapeId = createShapeId();
        variantCellShapeIds[cell.id] = cellShapeId;
        editor.createShape({
          id: cellShapeId,
          type: 'grid-cell',
          x: cell.bounds.x,
          y: cell.bounds.y,
          isLocked: true,
          props: {
            w: cell.bounds.w,
            h: cell.bounds.h,
            cellType: 'variant',
            cellIndex: cell.index,
            label: `Variant ${cell.index}`,
          },
          meta: {
            isGenerating: true,
          },
        });
      }

      try {
        const shapeIds = seedShapes.map((s) => s.id);
        const svgResult = await editor.getSvgString(shapeIds, {
          background: true,
          padding: 20,
        });

        if (!svgResult) {
          throw new Error('Failed to export seed canvas');
        }

        const blob = await editor.toImage(shapeIds, {
          format: 'png',
          background: true,
          padding: 20,
        });

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob.blob);
        });

        const response = await fetch('/api/generate-grid-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: base64,
            svg: svgResult.svg,
            variantCount: variantCells.length,
            cellWidth: state.cellWidth,
            cellHeight: state.cellHeight,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate variants');
        }

        const data = await response.json();

        // Create variant images immediately as pending shapes
        for (let i = 0; i < data.variants.length && i < variantCells.length; i++) {
          const variant = data.variants[i];
          const cell = variantCells[i];
          const padding = 20;

          const imageShapeId = createShapeId();
          editor.createShape({
            id: imageShapeId,
            type: 'variant-image',
            x: cell.bounds.x + padding,
            y: cell.bounds.y + padding + 40,
            props: {
              w: cell.bounds.w - padding * 2,
              h: cell.bounds.h - padding * 2 - 40,
              imageUrl: variant.imageUrl,
              variantIndex: cell.index,
              description: variant.description,
            },
            meta: {
              pending: true,
            },
          });
        }

        // Update variant cell shapes to remove generating state
        for (const cell of variantCells) {
          const cellShapeId = variantCellShapeIds[cell.id];
          if (cellShapeId) {
            editor.updateShape({
              id: cellShapeId,
              type: 'grid-cell',
              meta: { isGenerating: false },
            });
          }
        }

        // Center camera on all content (seed + variants)
        const allCells = state.cells;
        const minX = Math.min(...allCells.map((c) => c.bounds.x));
        const maxX = Math.max(...allCells.map((c) => c.bounds.x + c.bounds.w));
        const centerX = (minX + maxX) / 2;
        const centerY = seedCell.bounds.y + seedCell.bounds.h / 2;
        editor.centerOnPoint({ x: centerX, y: centerY }, { animation: { duration: 500 } });

        dispatch({ type: 'GENERATION_COMPLETE' });
      } catch (error) {
        console.error('Generation error:', error);
        // Remove placeholder variant cells on error
        const shapeIdsToDelete = Object.values(variantCellShapeIds);
        if (shapeIdsToDelete.length > 0) {
          editor.deleteShapes(shapeIdsToDelete);
        }
        dispatch({ type: 'GENERATION_ERROR' });
        alert('Failed to generate variants. Please try again.');
      }
    },
    [state.cells, state.cellWidth, state.cellHeight]
  );

  const clearVariant = useCallback(
    (cellId: string, editor: Editor) => {
      const cell = state.cells.find((c) => c.id === cellId);
      if (cell?.imageShapeId) {
        editor.deleteShapes([cell.imageShapeId]); // Delete the image shape
      }
      dispatch({ type: 'CLEAR_VARIANT', cellId });
    },
    [state.cells]
  );

  const clearAllVariants = useCallback(
    (editor: Editor) => {
      const imageShapeIds = state.cells
        .filter((cell) => cell.type === 'variant' && cell.imageShapeId)
        .map((cell) => cell.imageShapeId!);

      if (imageShapeIds.length > 0) {
        editor.deleteShapes(imageShapeIds); // Delete all variant image shapes
      }

      dispatch({ type: 'CLEAR_ALL_VARIANTS' });
    },
    [state.cells]
  );

  return (
    <GridContext.Provider
      value={{
        state,
        initializeGrid,
        createNewPage,
        generateVariants,
        clearVariant,
        clearAllVariants,
      }}
    >
      {children}
    </GridContext.Provider>
  );
}

export function useGridCanvas() {
  const context = useContext(GridContext);
  if (!context) {
    throw new Error('useGridCanvas must be used within a GridProvider');
  }
  return context;
}
