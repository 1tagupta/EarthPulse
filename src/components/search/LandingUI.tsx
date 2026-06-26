import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { SearchService } from '@/services/SearchService';
import { ANIMATIONS } from '@/constants/animations';

export default function LandingUI() {
  const [query, setQuery] = useState('');
  const appState = useAppStore((state) => state.phase);
  const setAppState = useAppStore((state) => state.setPhase);
  const setCameraTarget = useCameraStore((state) => state.setTarget);
  const setSelectedLocation = useLocationStore((state) => state.setCurrentLocation);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Trigger SearchService
    const target = await SearchService.query(query);

    if (target) {
      setSelectedLocation(target);
      setCameraTarget({ x: target.coordinates.x, y: target.coordinates.y, z: target.coordinates.z });
      setAppState('transition');
    }
  };

  return (
    <AnimatePresence>
      {appState === 'landing' && (
        <motion.div 
          className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none"
          variants={ANIMATIONS.slowFade}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          
          <motion.div 
            className="flex flex-col items-center gap-8 pointer-events-auto"
            variants={ANIMATIONS.slideUpFade}
            initial="initial"
            animate="animate"
          >
            <h1 className="text-3xl md:text-5xl text-white font-light tracking-wide text-center drop-shadow-2xl opacity-90">
              Where on Earth would you like to explore water?
            </h1>

            <form onSubmit={handleSearch} className="w-full max-w-lg relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={20} className="text-gray-400" />
              </div>
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any country, basin, state, or coordinate..."
                className="w-full bg-black/40 backdrop-blur-md border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 shadow-[0_0_40px_rgba(0,0,0,0.8)] transition-all"
                autoFocus
              />
            </form>
          </motion.div>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
