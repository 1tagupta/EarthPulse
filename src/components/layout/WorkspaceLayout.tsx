import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';
import { useLocationStore } from '@/stores/useLocationStore';

export default function WorkspaceLayout() {
  const appState = useAppStore((state) => state.phase);
  const location = useLocationStore((state) => state.currentLocation);

  return (
    <AnimatePresence>
      {appState === 'workspace' && (
        <motion.div 
          className="absolute inset-0 z-10 pointer-events-none flex"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 1.5, ease: 'easeOut' } }}
        >
          {/* Left Sidebar Spacer (For Mini Globe) */}
          <div className="w-[400px] h-full relative pointer-events-auto flex flex-col justify-end p-8">
            <div className="bg-black/30 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-2xl">
              <h2 className="text-xl font-light text-white mb-2">{location?.name || 'Selected Region'}</h2>
              <p className="text-sm text-gray-400 mb-4">{location?.country || 'Global'}</p>
              
              <div className="space-y-3 text-xs text-gray-500 font-mono">
                <div className="flex justify-between">
                  <span>AREA</span>
                  <span className="text-gray-300">{(location?.metadata?.sizeKm2 || 12500).toLocaleString()} km²</span>
                </div>
                <div className="flex justify-between">
                  <span>COORDINATES</span>
                  <span className="text-gray-300">{location?.coordinates.lat.toFixed(2)}°, {location?.coordinates.lon.toFixed(2)}°</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 h-full overflow-y-auto pointer-events-auto p-8 pt-12 pr-12 pb-32">
            
            <div className="mb-12">
              <h1 className="text-4xl font-light tracking-wide text-white drop-shadow-lg mb-2">Hydrological Intelligence</h1>
              <p className="text-gray-400">Current conditions and historical trends based on NASA GRACE & SMAP telemetry.</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
              {/* Health Index Hero Placeholder */}
              <div className="col-span-1 xl:col-span-2 h-[350px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 to-blue-900/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-xl font-light text-white mb-4 relative z-10">Hydrological Health Index</h3>
                <p className="text-gray-400 text-sm max-w-md relative z-10">This module will display a high-level summary of groundwater stress and surface moisture saturation for the study area.</p>
              </div>

              {/* Satellite Preview Placeholder */}
              <div className="col-span-1 h-[350px] bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-green-900/20 to-emerald-900/10 opacity-50 group-hover:opacity-100 transition-opacity" />
                <h3 className="text-xl font-light text-white mb-4 relative z-10">Satellite Preview</h3>
                <p className="text-gray-400 text-sm relative z-10">This module will render a static satellite image or NDVI map of the selected bounding box.</p>
              </div>
            </div>

            {/* Scientific Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <ModuleCard title="Historical Timeline" desc="The flagship interactive history of droughts, floods, and water storage anomalies from 2015 to present." />
              <ModuleCard title="Recharge Lag Explorer" desc="Drag soil moisture waveforms over groundwater waveforms to visually calculate the aquifer recharge delay." />
              <ModuleCard title="Seasonal Wheel" desc="A circular calendar showing historical 'normal' water levels for any given week of the year." />
              <ModuleCard title="AI Insights" desc="Automated scientific narrative describing trend analysis, extreme events, and cross-correlation findings." />
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Temporary internal component
function ModuleCard({ title, desc }: { title: string, desc: string }) {
  return (
    <div className="h-[280px] bg-black/30 backdrop-blur-lg border border-white/5 rounded-3xl p-8 hover:bg-black/50 hover:border-white/20 transition-all cursor-pointer group">
      <h3 className="text-lg font-light text-gray-200 group-hover:text-cyan-400 transition-colors mb-3">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      
      <div className="mt-8 flex items-center justify-center h-24 border border-dashed border-gray-700/50 rounded-xl">
        <span className="text-gray-600 text-xs font-mono uppercase tracking-widest">Future Module Slot</span>
      </div>
    </div>
  );
}
