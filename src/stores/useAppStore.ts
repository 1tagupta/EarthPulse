import { create } from 'zustand';

export type AppStatePhase = 'landing' | 'transition' | 'workspace';

interface AppState {
  phase: AppStatePhase;
  setPhase: (phase: AppStatePhase) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  phase: 'landing',
  setPhase: (phase) => set({ phase }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));
