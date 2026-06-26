import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Loader2, MapPin } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { SearchService } from '@/services/SearchService';
import { ANIMATIONS } from '@/constants/animations';
import { Location } from '@/types';
import GeometryUploader from './GeometryUploader';

export default function LandingUI() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Location[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const appState = useAppStore((state) => state.phase);
  const setAppState = useAppStore((state) => state.setPhase);
  const setCameraTarget = useCameraStore((state) => state.setTarget);
  const setSelectedLocation = useLocationStore((state) => state.setCurrentLocation);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced geocoding search
  useEffect(() => {
    if (query.trim().length <= 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await SearchService.query(query);
      setSuggestions(results);
      setShowDropdown(results.length > 0);
      setFocusedIndex(-1);
      setIsSearching(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectLocation = (target: Location) => {
    setSelectedLocation(target);
    setCameraTarget({ x: target.coordinates.x, y: target.coordinates.y, z: target.coordinates.z });
    setAppState('transition');
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusedIndex >= 0 && focusedIndex < suggestions.length) {
        handleSelectLocation(suggestions[focusedIndex]);
      } else {
        handleSelectLocation(suggestions[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (suggestions.length > 0) {
      handleSelectLocation(suggestions[focusedIndex >= 0 ? focusedIndex : 0]);
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
            className="flex flex-col items-center gap-8 pointer-events-auto w-full max-w-xl px-6"
            variants={ANIMATIONS.slideUpFade}
            initial="initial"
            animate="animate"
          >
            <h1 className="text-3xl md:text-5xl text-white font-light tracking-wide text-center drop-shadow-2xl opacity-90 leading-tight">
              Where on Earth would you like to explore water?
            </h1>

            <div className="w-full relative" ref={dropdownRef}>
              <form onSubmit={handleSubmit} className="w-full relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  {isSearching ? (
                    <Loader2 size={20} className="text-cyan-400 animate-spin" />
                  ) : (
                    <Search size={20} className="text-gray-400" />
                  )}
                </div>
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search city, region, state, basin, or coordinate..."
                  className="w-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-full py-4 pl-12 pr-6 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-all font-body text-base"
                  autoFocus
                />
              </form>

              {/* Suggestions Dropdown */}
              <AnimatePresence>
                {showDropdown && suggestions.length > 0 && (
                  <motion.div
                    className="absolute w-full mt-3 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.9)] z-50 pointer-events-auto"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ul className="divide-y divide-white/5 py-2 max-h-72 overflow-y-auto">
                      {suggestions.map((loc, idx) => (
                        <li 
                          key={loc.id}
                          onClick={() => handleSelectLocation(loc)}
                          onMouseEnter={() => setFocusedIndex(idx)}
                          className={`px-6 py-3 cursor-pointer flex items-center gap-3 transition-colors ${
                            idx === focusedIndex ? 'bg-cyan-500/10 text-cyan-400' : 'text-gray-300'
                          }`}
                        >
                          <MapPin size={16} className={idx === focusedIndex ? 'text-cyan-400' : 'text-gray-500'} />
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium text-sm truncate">{loc.name}</span>
                            <span className="text-xs text-gray-400 truncate font-light">{loc.displayName}</span>
                          </div>
                          <span className="text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">
                            {loc.adminLevel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <GeometryUploader />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
