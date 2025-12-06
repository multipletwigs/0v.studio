'use client';

import { createContext, useContext, useReducer, useCallback, useRef, type ReactNode } from 'react';
import { createShapeId, type Editor, type TLShapeId, type TLPageId } from 'tldraw';

export interface GridCell {
  id: string;
  index: number;
  type: 'seed' | 'variant';
  bounds: { x: number; y: number; w: number; h: number };
  frameId?: TLShapeId;
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
  | { type: 'GENERATION_SUCCESS'; cellId: string; imageUrl: string }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'GENERATION_ERROR' }
  | { type: 'CLEAR_VARIANT'; cellId: string }
  | { type: 'CLEAR_ALL_VARIANTS' };

const CELL_WIDTH = 400;
const CELL_HEIGHT = 400;
const GAP = 40;

function calculateCellBounds(
  index: number,
  columns: number,
  cellWidth: number,
  cellHeight: number,
  gap: number
) {
  const col = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: col * (cellWidth + gap),
    y: row * (cellHeight + gap),
    w: cellWidth,
    h: cellHeight,
  };
}

function createGridCells(columns: number, rows: number): GridCell[] {
  const cells: GridCell[] = [];
  const totalCells = columns * rows;

  for (let i = 0; i < totalCells; i++) {
    cells.push({
      id: i === 0 ? 'seed' : `variant-${i}`,
      index: i,
      type: i === 0 ? 'seed' : 'variant',
      bounds: calculateCellBounds(i, columns, CELL_WIDTH, CELL_HEIGHT, GAP),
    });
  }

  return cells;
}

const initialState: GridState = {
  cells: createGridCells(2, 2),
  columns: 2,
  rows: 2,
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
      const newCells = createGridCells(action.columns, action.rows);
      return {
        ...state,
        columns: action.columns,
        rows: action.rows,
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

    case 'GENERATION_SUCCESS':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.id === action.cellId
            ? { ...cell, imageUrl: action.imageUrl, isGenerating: false }
            : cell
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
          cell.id === action.cellId ? { ...cell, imageUrl: undefined } : cell
        ),
      };

    case 'CLEAR_ALL_VARIANTS':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.type === 'variant' ? { ...cell, imageUrl: undefined } : cell
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
  clearVariant: (cellId: string) => void;
  clearAllVariants: () => void;
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

      const newCells = state.cells.map((cell) => {
        const frameId = createShapeId();

        // Create a frame shape for each cell
        editor.createShape({
          id: frameId,
          type: 'frame',
          x: cell.bounds.x,
          y: cell.bounds.y,
          props: {
            w: cell.bounds.w,
            h: cell.bounds.h,
            name: cell.type === 'seed' ? '🌱 SEED' : `Variant ${cell.index}`,
          },
        });

        return { ...cell, frameId };
      });

      // Lock all frames so they can't be moved accidentally
      editor.updateShapes(
        newCells.map((cell) => ({
          id: cell.frameId!,
          type: 'frame',
          isLocked: true,
        }))
      );

      // Center the view on the grid
      const totalWidth = state.columns * (state.cellWidth + state.gap) - state.gap;
      const totalHeight = state.rows * (state.cellHeight + state.gap) - state.gap;
      editor.zoomToBounds(
        {
          x: -state.gap,
          y: -state.gap,
          w: totalWidth + state.gap * 2,
          h: totalHeight + state.gap * 2,
        },
        { animation: { duration: 0 } }
      );

      initializedPagesRef.current.add(currentPageId);
      dispatch({ type: 'INIT_GRID', cells: newCells });
    },
    [state.cells, state.columns, state.rows, state.cellWidth, state.cellHeight, state.gap]
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
      dispatch({ type: 'SET_GRID_SIZE', columns: 2, rows: 2 });

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
      if (!seedCell?.frameId) return;

      // Get shapes inside the seed frame
      const allShapes = editor.getCurrentPageShapes();
      const seedShapes = allShapes.filter((shape) => {
        if (shape.id === seedCell.frameId) return false;
        if (shape.parentId === seedCell.frameId) return true;
        // Also check if shape bounds overlap with seed cell
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

        const variantCells = state.cells.filter((c) => c.type === 'variant');

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

        // Store variant images in their respective cells
        for (let i = 0; i < data.variants.length && i < variantCells.length; i++) {
          const variant = data.variants[i];
          const cell = variantCells[i];

          dispatch({ type: 'GENERATION_SUCCESS', cellId: cell.id, imageUrl: variant.imageUrl });
        }

        dispatch({ type: 'GENERATION_COMPLETE' });
      } catch (error) {
        console.error('Generation error:', error);
        dispatch({ type: 'GENERATION_ERROR' });
        alert('Failed to generate variants. Please try again.');
      }
    },
    [state.cells, state.cellWidth, state.cellHeight]
  );

  const clearVariant = useCallback(
    (cellId: string) => {
      dispatch({ type: 'CLEAR_VARIANT', cellId });
    },
    []
  );

  const clearAllVariants = useCallback(
    () => {
      dispatch({ type: 'CLEAR_ALL_VARIANTS' });
    },
    []
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
