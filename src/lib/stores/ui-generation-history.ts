import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GeneratedFile {
  name: string;
  content: string;
}

export interface UIGenerationHistoryItem {
  id: string;
  timestamp: number;
  files: GeneratedFile[];
  previewUrl: string;
  chatId?: string;
  chatUrl?: string;
  chatDetail?: unknown; // Store full chatDetail for debugging
  cellIdentifier?: string; // e.g., "Variant 1", "Variant 2", "Seed"
}

interface UIGenerationHistoryStore {
  history: UIGenerationHistoryItem[];
  addToHistory: (item: Omit<UIGenerationHistoryItem, 'id' | 'timestamp'> & { chatId: string }) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
}

export const useUIGenerationHistory = create<UIGenerationHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (item) =>
        set((state) => {
          // Use chatId as the id, or generate one if chatId is not available
          const id = item.chatId || `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          // Check if item with this chatId already exists, if so, update it instead of adding duplicate
          const existingIndex = state.history.findIndex((h) => h.chatId === item.chatId);
          
          const newItem = {
            ...item,
            id,
            timestamp: Date.now(),
          };
          
          if (existingIndex >= 0) {
            // Update existing item
            const updatedHistory = [...state.history];
            updatedHistory[existingIndex] = newItem;
            return { history: updatedHistory };
          } else {
            // Add new item at the beginning
            return {
              history: [newItem, ...state.history],
            };
          }
        }),
      clearHistory: () => set({ history: [] }),
      removeFromHistory: (id) =>
        set((state) => ({
          history: state.history.filter((item) => item.id !== id),
        })),
    }),
    {
      name: 'ui-generation-history-storage', // unique name for localStorage key
    }
  )
);

