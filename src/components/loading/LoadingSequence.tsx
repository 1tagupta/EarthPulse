import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';

const LOADING_STEPS = [
  "Connecting to EarthPulse Dataset...",
  "Loading metadata.json...",
  "Loading geometry.geojson...",
  "Loading timeline.json...",
  "Loading climatology.json...",
  "Loading analytics.json...",
  "Preparing visualization engine...",
  "Initializing research workspace..."
];

export default function LoadingSequence() {
  const [currentStep, setCurrentStep] = useState(0);
  const appState = useAppStore((state) => state.phase);
  const setAppState = useAppStore((state) => state.setPhase);

  useEffect(() => {
    if (appState !== 'transition') return;

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= LOADING_STEPS.length) {
        clearInterval(interval);
        setTimeout(() => setAppState('workspace'), 800); // Wait briefly then enter workspace
      } else {
        setCurrentStep(step);
      }
    }, 400); // 400ms per simulated log

    return () => clearInterval(interval);
  }, [appState, setAppState]);

  return (
    <AnimatePresence>
      {appState === 'transition' && (
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1 } }}
        >
          <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-8 max-w-lg w-full shadow-2xl">
            <h3 className="text-cyan-400 font-mono text-sm tracking-widest uppercase mb-4 opacity-80">
              System Scan
            </h3>
            
            <div className="space-y-2 h-40 overflow-hidden font-mono text-xs md:text-sm">
              <AnimatePresence>
                {LOADING_STEPS.slice(0, currentStep + 1).map((text, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={idx === currentStep ? 'text-white' : 'text-gray-500'}
                  >
                    <span className="text-green-500 mr-2">✓</span>
                    {text}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            <div className="w-full h-1 bg-gray-800 rounded-full mt-6 overflow-hidden">
              <motion.div 
                className="h-full bg-cyan-500 shadow-[0_0_10px_#06b6d4]"
                initial={{ width: '0%' }}
                animate={{ width: `${((currentStep + 1) / LOADING_STEPS.length) * 100}%` }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
