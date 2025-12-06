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

export interface PendingVariant {
  cellId: string;
  imageUrl: string;
  description: string;
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
  pendingVariants: PendingVariant[];
}

type GridAction =
  | { type: 'INIT_GRID'; cells: GridCell[] }
  | { type: 'SET_GRID_SIZE'; columns: number; rows: number }
  | { type: 'START_GENERATION' }
  | { type: 'SET_PENDING_VARIANTS'; variants: PendingVariant[] }
  | { type: 'ACCEPT_VARIANT'; cellId: string; imageUrl: string; imageShapeId: TLShapeId }
  | { type: 'REJECT_VARIANT'; cellId: string }
  | { type: 'GENERATION_COMPLETE' }
  | { type: 'GENERATION_ERROR' }
  | { type: 'CLEAR_VARIANT'; cellId: string }
  | { type: 'CLEAR_ALL_VARIANTS' };

const CELL_WIDTH = 600;
const CELL_HEIGHT = 600;
const GAP = 60;

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
  pendingVariants: [],
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

    case 'SET_PENDING_VARIANTS':
      return {
        ...state,
        pendingVariants: action.variants,
      };

    case 'ACCEPT_VARIANT':
      return {
        ...state,
        cells: state.cells.map((cell) =>
          cell.id === action.cellId
            ? { ...cell, imageUrl: action.imageUrl, imageShapeId: action.imageShapeId }
            : cell
        ),
        pendingVariants: state.pendingVariants.filter((v) => v.cellId !== action.cellId),
      };

    case 'REJECT_VARIANT':
      return {
        ...state,
        pendingVariants: state.pendingVariants.filter((v) => v.cellId !== action.cellId),
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
  acceptVariant: (cellId: string, editor: Editor) => void;
  rejectVariant: (cellId: string) => void;
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

      const newCells = state.cells.map((cell) => {
        const frameId = createShapeId();

        // Create a grid-cell shape for each cell
        editor.createShape({
          id: frameId,
          type: 'grid-cell',
          x: cell.bounds.x,
          y: cell.bounds.y,
          props: {
            w: cell.bounds.w,
            h: cell.bounds.h,
            cellType: cell.type,
            cellIndex: cell.index,
            label: cell.type === 'seed' ? '🌱 SEED' : `Variant ${cell.index}`,
          },
        });

        return { ...cell, frameId };
      });

      // Lock all grid cells so they can't be moved accidentally
      editor.updateShapes(
        newCells.map((cell) => ({
          id: cell.frameId!,
          type: 'grid-cell',
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

        // Store variants as pending for user approval
        const pendingVariants: PendingVariant[] = [];
        for (let i = 0; i < data.variants.length && i < variantCells.length; i++) {
          const variant = data.variants[i];
          const cell = variantCells[i];

          pendingVariants.push({
            cellId: cell.id,
            imageUrl: variant.imageUrl,
            description: variant.description,
          });
        }

        dispatch({ type: 'SET_PENDING_VARIANTS', variants: pendingVariants });
        dispatch({ type: 'GENERATION_COMPLETE' });
      } catch (error) {
        console.error('Generation error:', error);
        dispatch({ type: 'GENERATION_ERROR' });
        alert('Failed to generate variants. Please try again.');
      }
    },
    [state.cells, state.cellWidth, state.cellHeight]
  );

  const acceptVariant = useCallback(
    (cellId: string, editor: Editor) => {
      const pendingVariant = state.pendingVariants.find((v) => v.cellId === cellId);
      if (!pendingVariant) return;

      const cell = state.cells.find((c) => c.id === cellId);
      if (!cell) return;

      // Create VariantImageShape
      const imageShapeId = createShapeId();
      const padding = 20;

      editor.createShape({
        id: imageShapeId,
        type: 'variant-image',
        x: cell.bounds.x + padding,
        y: cell.bounds.y + padding + 40, // Extra padding for label
        props: {
          w: cell.bounds.w - padding * 2,
          h: cell.bounds.h - padding * 2 - 40, // Adjust for label
          imageUrl: pendingVariant.imageUrl,
          variantIndex: cell.index,
          description: pendingVariant.description,
        },
      });

      dispatch({
        type: 'ACCEPT_VARIANT',
        cellId,
        imageUrl: pendingVariant.imageUrl,
        imageShapeId,
      });
    },
    [state.pendingVariants, state.cells]
  );

  const rejectVariant = useCallback((cellId: string) => {
    dispatch({ type: 'REJECT_VARIANT', cellId });
  }, []);

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
        acceptVariant,
        rejectVariant,
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
