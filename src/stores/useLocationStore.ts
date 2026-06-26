import { create } from 'zustand';
import { Location } from '@/types';

interface LocationState {
  currentLocation: Location | null;
  setCurrentLocation: (location: Location | null) => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  currentLocation: null,
  setCurrentLocation: (location) => set({ currentLocation: location }),
}));
