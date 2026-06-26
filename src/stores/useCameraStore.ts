import { create } from 'zustand';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface CameraState {
  target: Vector3 | null;
  setTarget: (target: Vector3 | null) => void;
  isFlying: boolean;
  setIsFlying: (isFlying: boolean) => void;
}

export const useCameraStore = create<CameraState>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
  isFlying: false,
  setIsFlying: (isFlying) => set({ isFlying }),
}));
