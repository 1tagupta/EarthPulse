import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Earth from '@/components/earth/Earth';
import { useAppStore } from '@/stores/useAppStore';
import { ErrorBoundary } from './ErrorBoundary';
import { motion } from 'framer-motion';
import LoadingSequence from '@/components/loading/LoadingSequence';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import LandingUI from '@/components/search/LandingUI';

export default function App() {
  const appState = useAppStore((state) => state.phase);

  return (
    <div className="w-full h-screen bg-space relative overflow-hidden text-white font-body">
      <ErrorBoundary>
        {/* 3D WebGL Canvas Layer - Transitions to Mini Globe */}
        <motion.div 
          className="absolute inset-0 z-0 pointer-events-auto"
          initial={false}
          animate={{
            // When in workspace, shrink to top-left corner
            width: appState === 'workspace' ? '350px' : '100%',
            height: appState === 'workspace' ? '350px' : '100%',
            top: appState === 'workspace' ? '40px' : '0px',
            left: appState === 'workspace' ? '40px' : '0px',
            borderRadius: appState === 'workspace' ? '50%' : '0%',
            boxShadow: appState === 'workspace' ? '0 0 40px rgba(0, 150, 255, 0.1)' : 'none',
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
            <Suspense fallback={null}>
              <Earth />
            </Suspense>
          </Canvas>
        </motion.div>

        {/* Cinematic Loading Sequence */}
        <LoadingSequence />

        {/* 2D Landing UI Overlay */}
        <LandingUI />

        {/* Research Workspace Shell */}
        <WorkspaceLayout />
      </ErrorBoundary>
    </div>
  );
}
