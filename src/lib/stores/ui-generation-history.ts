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
}

interface UIGenerationHistoryStore {
  history: UIGenerationHistoryItem[];
  addToHistory: (item: Omit<UIGenerationHistoryItem, 'id' | 'timestamp'>) => void;
  clearHistory: () => void;
  removeFromHistory: (id: string) => void;
}

export const useUIGenerationHistory = create<UIGenerationHistoryStore>()(
  persist(
    (set) => ({
      history: [],
      addToHistory: (item) =>
        set((state) => ({
          history: [
            {
              ...item,
              id: `gen-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              timestamp: Date.now(),
            },
            ...state.history,
          ],
        })),
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

