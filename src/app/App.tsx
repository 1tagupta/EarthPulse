import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Earth from '@/components/earth/Earth';
import LandingUI from '@/components/search/LandingUI';
import { useAppStore } from '@/stores/useAppStore';
import { ErrorBoundary } from './ErrorBoundary';

export default function App() {
  const appState = useAppStore((state) => state.phase);

  return (
    <div className="w-full h-screen bg-space relative overflow-hidden text-white font-body">
      <ErrorBoundary>
        {/* 3D WebGL Canvas Layer */}
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <Suspense fallback={null}>
              <Earth />
            </Suspense>
          </Canvas>
        </div>

        {/* 2D UI Overlay Layer */}
        <LandingUI />
      </ErrorBoundary>
    </div>
  );
}
