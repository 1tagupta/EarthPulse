import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import Earth from '@/components/earth/Earth';
import { useAppStore } from '@/stores/useAppStore';
import { ErrorBoundary } from './ErrorBoundary';
import { motion } from 'framer-motion';
import LoadingSequence from '@/components/loading/LoadingSequence';
import WorkspaceLayout from '@/components/layout/WorkspaceLayout';
import LandingUI from '@/components/search/LandingUI';

import * as THREE from 'three';

export default function App() {
  const appState = useAppStore((state) => state.phase);

  return (
    <div className="w-full h-screen bg-space relative overflow-hidden text-white font-body">
      {/* 3D WebGL Canvas Layer - Transitions to Mini Globe */}
      <ErrorBoundary label="Canvas">
        <motion.div 
          className="absolute inset-0 z-0 pointer-events-auto"
          initial={false}
          animate={{
            width: appState === 'workspace' ? '350px' : '100%',
            height: appState === 'workspace' ? '350px' : '100%',
            top: appState === 'workspace' ? '40px' : '0px',
            left: appState === 'workspace' ? '40px' : '0px',
            borderRadius: appState === 'workspace' ? '50%' : '0%',
            boxShadow: appState === 'workspace' ? '0 0 40px rgba(0, 150, 255, 0.1)' : 'none',
          }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        >
          <Canvas 
            camera={{ position: [0, 0, 8], fov: 45 }}
            gl={{ 
              antialias: true, 
              alpha: false, 
              toneMapping: THREE.ACESFilmicToneMapping, 
              toneMappingExposure: 1.2 
            }}
          >
            <Suspense fallback={null}>
              <Earth />
            </Suspense>
          </Canvas>
        </motion.div>
      </ErrorBoundary>

      {/* Cinematic Loading Sequence */}
      <ErrorBoundary label="LoadingSequence">
        <LoadingSequence />
      </ErrorBoundary>

      {/* 2D Landing UI Overlay */}
      <ErrorBoundary label="LandingUI">
        <LandingUI />
      </ErrorBoundary>

      {/* Research Workspace Shell */}
      <ErrorBoundary label="WorkspaceLayout">
        <WorkspaceLayout />
      </ErrorBoundary>
    </div>
  );
}
