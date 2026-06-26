import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '@/stores/useAppStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { 
  Calendar, Layers, Database, Clock, Compass, 
  Activity, ArrowUpRight, ArrowDownRight, LogOut, ChevronDown 
} from 'lucide-react';

export default function WorkspaceLayout() {
  const appState = useAppStore((state) => state.phase);
  const setAppState = useAppStore((state) => state.setPhase);
  
  const { 
    metadata, timeline, analytics, events, quality, 
    activeDate, activeDateData, setActiveDate, clearProjectData 
  } = useProjectStore();

  const [sliderIndex, setSliderIndex] = useState(0);
  const [showMetadata, setShowMetadata] = useState(true);
  const [activeLayers, setActiveLayers] = useState({
    boundary: true,
    satellite: true,
    telemetry: false,
    terrain: false
  });

  // Keep slider index in sync with activeDate changes
  useEffect(() => {
    if (timeline && activeDate) {
      const idx = timeline.findIndex(pt => pt.date === activeDate);
      if (idx !== -1) {
        setSliderIndex(idx);
      }
    }
  }, [activeDate, timeline]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value);
    setSliderIndex(idx);
    if (timeline && timeline[idx]) {
      setActiveDate(timeline[idx].date);
    }
  };

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers(prev => {
      const updated = { ...prev, [layer]: !prev[layer] };
      // Save user preference
      localStorage.setItem('earthpulse_layers', JSON.stringify(updated));
      return updated;
    });
  };

  // Load layer preferences
  useEffect(() => {
    const saved = localStorage.getItem('earthpulse_layers');
    if (saved) {
      try {
        setActiveLayers(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading layer preferences:', e);
      }
    }
  }, []);

  const handleLogOut = () => {
    clearProjectData();
    setAppState('landing');
  };

  if (appState !== 'workspace' || !metadata || !activeDateData) return null;

  // Format date helper
  const formatDateString = (str: string) => {
    const d = new Date(str);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Format anomaly text
  const getAnomalyText = (zScore: number) => {
    if (zScore < -1.5) return 'Severe Deficit';
    if (zScore < -0.8) return 'Moderate Deficit';
    if (zScore > 1.5) return 'Severe Surplus';
    if (zScore > 0.8) return 'Moderate Surplus';
    return 'Normal Conditions';
  };

  // Hydrological Health Gauge computation
  const hhi = analytics?.hydrologicalHealthIndex ?? 5.0;
  
  const hhiColorClass = hhi < 4.0 
    ? 'stroke-red-500 text-red-400 shadow-red-500/20' 
    : (hhi < 6.0 ? 'stroke-amber-500 text-amber-400 shadow-amber-500/20' : 'stroke-cyan-400 text-cyan-400 shadow-cyan-400/20');

  return (
    <motion.div 
      className="absolute inset-0 z-10 pointer-events-none flex font-body"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 1.0 } }}
    >
      {/* Left Sidebar Panel (Overlay for Mini Globe and Location Info) */}
      <div className="w-[380px] h-full relative pointer-events-auto flex flex-col justify-between p-6 shrink-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent">
        
        {/* Top Header - Back Button */}
        <button 
          onClick={handleLogOut}
          className="self-start flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-gray-400 hover:text-white transition-colors"
        >
          <LogOut size={12} /> Exit Workspace
        </button>

        {/* Floating Globe Widget Spacer */}
        <div className="h-[280px]" />

        {/* Location metadata card */}
        <div className="bg-black/60 backdrop-blur-2xl rounded-2xl p-5 border border-white/10 shadow-2xl space-y-4">
          <div>
            <span className="text-[9px] uppercase font-mono tracking-widest text-cyan-400">Selected Basin / Boundary</span>
            <h2 className="text-xl font-light text-white truncate mt-1">{metadata.location_name}</h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">CENTROID: {metadata.center[0].toFixed(4)}°, {metadata.center[1].toFixed(4)}°</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-white/5 pt-3">
            <div>
              <span className="text-gray-500 block">TOTAL AREA</span>
              <span className="text-gray-200 text-sm font-semibold">{(metadata.area_sqkm).toLocaleString()} km²</span>
            </div>
            <div>
              <span className="text-gray-500 block">CLIMATE ZONE</span>
              <span className="text-gray-200 text-sm font-semibold">Humid Subtropical</span>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono border-t border-white/5 pt-3 space-y-1">
            <div className="flex justify-between">
              <span>STUDY START</span>
              <span className="text-gray-300">{metadata.start_date}</span>
            </div>
            <div className="flex justify-between">
              <span>STUDY END</span>
              <span className="text-gray-300">{metadata.end_date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Scientific Content Area */}
      <div className="flex-1 h-full overflow-y-auto pointer-events-auto p-8 pt-10 pr-10 pb-36">
        
        {/* Workspace Title */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <h1 className="text-4xl font-light tracking-wide text-white drop-shadow-lg">Hydrological Intelligence Terminal</h1>
            <p className="text-gray-400 text-sm mt-1">Satellite soil moisture telemetry & gravity anomaly analyses.</p>
          </div>
          
          {/* Active Date Panel */}
          <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 border border-white/10 rounded-2xl">
            <Calendar size={14} className="text-cyan-400" />
            <div className="text-right">
              <span className="text-[9px] font-mono text-gray-500 block">ACTIVE ANALYSIS DATE</span>
              <span className="text-xs font-semibold font-mono text-cyan-300">{formatDateString(activeDateData.date)}</span>
            </div>
          </div>
        </div>

        {/* Primary Dash Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
          
          {/* Health Index Arc Gauge Card */}
          <div className="col-span-1 xl:col-span-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-[360px] group">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-950/20 to-blue-950/10 opacity-30 group-hover:opacity-65 transition-opacity" />
            
            <div className="relative z-10 flex justify-between items-center">
              <h3 className="text-sm font-mono tracking-wider uppercase text-cyan-400 flex items-center gap-2">
                <Activity size={14} /> Hydrological Health Index
              </h3>
              <span className="text-[10px] bg-white/5 border border-white/10 rounded-full px-2 py-0.5 text-gray-400 font-mono">
                COMPOSITE MODEL v1.0
              </span>
            </div>

            <div className="relative z-10 grid grid-cols-5 gap-6 items-center">
              {/* Arc SVG Gauge */}
              <div className="col-span-2 flex flex-col items-center justify-center relative">
                <svg className="w-40 h-24" viewBox="0 0 100 60">
                  {/* Gauge Arc Track */}
                  <path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    stroke="#1e293b" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                  />
                  {/* Filled Arc */}
                  <motion.path 
                    d="M 10 50 A 40 40 0 0 1 90 50" 
                    fill="none" 
                    className={hhiColorClass} 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    strokeDasharray="126" // circumference of arc
                    initial={{ strokeDashoffset: 126 }}
                    animate={{ strokeDashoffset: 126 - (126 * (hhi / 10)) }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </svg>
                
                <div className="absolute top-10 flex flex-col items-center">
                  <span className="text-3xl font-light text-white tracking-tighter">{hhi}</span>
                  <span className="text-[10px] text-gray-500 font-mono tracking-widest uppercase">Score</span>
                </div>
              </div>

              {/* Status Explanation */}
              <div className="col-span-3 space-y-3">
                <div>
                  <span className="text-xs text-gray-500 font-mono">STATUS</span>
                  <div className={`text-xl font-light uppercase tracking-wide mt-0.5 ${
                    hhi < 4.0 ? 'text-red-400' : (hhi < 6.0 ? 'text-amber-400' : 'text-cyan-400')
                  }`}>
                    {analytics?.hydrologicalHealthCategory || 'Normal'}
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-light">
                  {analytics?.hydrologicalHealthExplanation || 'Loading indices...'}
                </p>
              </div>
            </div>

            {/* Micro details */}
            <div className="relative z-10 flex justify-between border-t border-white/5 pt-4 text-[10px] font-mono text-gray-500">
              <span>CONFIDENCE: {((quality?.confidenceScore || 0.95) * 100).toFixed(0)}%</span>
              <span className="text-right">CALCULATED DYNAMICALLY FROM PROJECT IMAGES</span>
            </div>
          </div>

          {/* Mini Satellite Preview / Grid Scanner Card */}
          <div className="col-span-1 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between h-[360px] group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/20 to-teal-950/10 opacity-30 group-hover:opacity-65 transition-opacity" />
            
            <div className="relative z-10 flex justify-between items-center">
              <h3 className="text-sm font-mono tracking-wider uppercase text-cyan-400 flex items-center gap-2">
                <Compass size={14} /> Coordinates Boundary
              </h3>
            </div>

            {/* Radar Coordinates Scanner Grid */}
            <div className="relative z-10 h-36 border border-white/5 rounded-xl bg-black/50 flex flex-col items-center justify-center overflow-hidden">
              {/* Radar Sweeper lines */}
              <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 opacity-10">
                {Array.from({ length: 36 }).map((_, i) => (
                  <div key={i} className="border border-white/40" />
                ))}
              </div>
              
              {/* Boundary Rectangle visualization */}
              <div className="w-24 h-20 border-2 border-cyan-400/40 bg-cyan-500/5 relative rounded shadow-[0_0_15px_rgba(6,182,212,0.1)] flex items-center justify-center">
                <span className="text-[8px] font-mono text-cyan-400">BIHAR</span>
              </div>
              
              {/* Compass Indicator */}
              <div className="absolute right-3 top-3 text-gray-600 font-mono text-[9px] flex flex-col items-center">
                <Compass size={12} className="text-gray-500 animate-pulse" />
                <span>N</span>
              </div>

              {/* Coordinates bounds text overlay */}
              <div className="absolute bottom-2 left-2 text-[8px] font-mono text-gray-500 leading-tight">
                W: {metadata.bounds[0].toFixed(1)}° / E: {metadata.bounds[2].toFixed(1)}° <br/>
                S: {metadata.bounds[1].toFixed(1)}° / N: {metadata.bounds[3].toFixed(1)}°
              </div>
            </div>

            {/* Layer toggler manager (Opacity Controller) */}
            <div className="relative z-10 border-t border-white/5 pt-4">
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-400 mb-2">
                <span>ACTIVE INTERFACE LAYERS</span>
                <Layers size={10} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <button 
                  onClick={() => toggleLayer('boundary')}
                  className={`py-1.5 px-3 rounded-lg border text-center transition-colors ${
                    activeLayers.boundary ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-transparent border-white/5 text-gray-500'
                  }`}
                >
                  Boundary
                </button>
                <button 
                  onClick={() => toggleLayer('satellite')}
                  className={`py-1.5 px-3 rounded-lg border text-center transition-colors ${
                    activeLayers.satellite ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-transparent border-white/5 text-gray-500'
                  }`}
                >
                  Night Lights
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Current Observations Module (Current Conditions) */}
        <div className="mb-8 bg-black/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-950/10 to-transparent opacity-30" />
          
          <div className="relative z-10 flex justify-between items-center mb-6">
            <h3 className="text-sm font-mono tracking-wider uppercase text-cyan-400 flex items-center gap-2">
              <Layers size={14} /> Telemetry Observations
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">
              WEEKLY SAMPLING TIME INTERVALS
            </span>
          </div>

          {/* Metric Grid Cards */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            
            {/* Surface Soil Moisture */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Surface Soil Moisture</span>
                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5 rounded font-mono">NASA SMAP</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-light text-white font-mono">{activeDateData.surfaceMoisture.toFixed(3)}</span>
                <span className="text-[10px] text-gray-400 ml-1 font-mono">m³/m³</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                <span className="text-gray-500">ANOMALY Z-SCORE</span>
                <span className={activeDateData.surfaceZScore < -0.8 ? 'text-amber-400' : 'text-green-400'}>
                  {activeDateData.surfaceZScore.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Root Zone Moisture */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Root-Zone Moisture</span>
                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5 rounded font-mono">NASA SMAP</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-light text-white font-mono">{activeDateData.rootZoneMoisture.toFixed(3)}</span>
                <span className="text-[10px] text-gray-400 ml-1 font-mono">m³/m³</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                <span className="text-gray-500">ANOMALY STATUS</span>
                <span className={activeDateData.rootZoneZScore < -0.8 ? 'text-amber-400' : 'text-green-400'}>
                  {getAnomalyText(activeDateData.rootZoneZScore)}
                </span>
              </div>
            </div>

            {/* Groundwater Anomaly */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Aquifer Anomaly</span>
                <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-400/20 px-1.5 py-0.5 rounded font-mono">NASA GRACE</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-light text-white font-mono">{activeDateData.groundwaterAnomaly.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 ml-1 font-mono">cm EWT</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                <span className="text-gray-500">TREND WINDOW</span>
                <span className="text-cyan-400 flex items-center gap-1">
                  {analytics?.groundwaterTrend === 'declining' ? (
                    <>Declining <ArrowDownRight size={10} /></>
                  ) : (
                    <>Stable <ArrowUpRight size={10} /></>
                  )}
                </span>
              </div>
            </div>

            {/* CHIRPS Precipitation */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between h-[120px]">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">Rainfall (CHIRPS)</span>
                <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-400/20 px-1.5 py-0.5 rounded font-mono">CHIRPS v2.0</span>
              </div>
              <div className="my-2">
                <span className="text-2xl font-light text-white font-mono">{activeDateData.precipitation.toFixed(1)}</span>
                <span className="text-[10px] text-gray-400 ml-1 font-mono">mm/wk</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-white/5 pt-2">
                <span className="text-gray-500">RESPONSE DELAY</span>
                <span className="text-gray-300 font-mono">{analytics?.rechargeDelayWeeks || 8} weeks lag</span>
              </div>
            </div>

          </div>
        </div>

        {/* Collapsible Dataset Information & Citations Panel */}
        <div className="bg-black/40 backdrop-blur-lg border border-white/5 rounded-xl p-4 font-mono text-xs text-gray-500 space-y-2">
          <div 
            className="flex justify-between items-center cursor-pointer text-gray-400 hover:text-white transition-colors"
            onClick={() => setShowMetadata(!showMetadata)}
          >
            <span className="flex items-center gap-2 uppercase tracking-widest text-[10px]">
              <Database size={12} /> Ingested Dataset Information
            </span>
            <ChevronDown size={14} className={`transition-transform ${showMetadata ? 'rotate-180' : ''}`} />
          </div>
          
          {showMetadata && (
            <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-white/5 mt-2 leading-relaxed">
              <div className="space-y-1">
                <div><span className="text-gray-400">SMAP TELEMETRY</span>: Spl4Smgp v8, 10km grid resolution, daily observations.</div>
                <div><span className="text-gray-400">GRACE TELEMETRY</span>: JPL Mascons CRI V04, monthly gravity fields.</div>
                <div><span className="text-gray-400">RAINFALL TELEMETRY</span>: CHIRPS v2.0, 0.05° grid rainfall resolution.</div>
              </div>
              <div className="space-y-1">
                <div><span className="text-gray-400">GEE CITATION</span>: {metadata.citation}</div>
                <div><span className="text-gray-400">ANALYSIS RANGE</span>: {metadata.start_date} to {metadata.end_date} (Complete historical envelope).</div>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Global Bottom Time Selector Slider */}
      {timeline && timeline.length > 0 && (
        <div className="absolute bottom-0 left-[380px] right-0 z-30 pointer-events-auto bg-gradient-to-t from-black via-black/90 to-transparent p-6 pt-10">
          <div className="max-w-5xl mx-auto flex flex-col gap-3">
            
            <div className="flex justify-between items-center text-xs font-mono text-gray-400">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-cyan-400" /> TIMELINE ENVELOPE
              </span>
              <div className="flex items-center gap-4">
                <span>{timeline[0].date}</span>
                <span className="text-cyan-400 font-bold bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                  {timeline[sliderIndex].date}
                </span>
                <span>{timeline[timeline.length - 1].date}</span>
              </div>
            </div>

            {/* Drag Slider */}
            <div className="w-full relative flex items-center group">
              <input 
                type="range"
                min="0"
                max={timeline.length - 1}
                value={sliderIndex}
                onChange={handleSliderChange}
                className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer focus:outline-none accent-cyan-400 transition-colors group-hover:bg-gray-700"
              />
            </div>
            
            {/* Dynamic Event Mark tick bars under the slider */}
            <div className="relative w-full h-2">
              {events && events.map((ev, i) => {
                const idx = timeline.findIndex(pt => pt.date === ev.start);
                if (idx === -1) return null;
                const percent = (idx / timeline.length) * 100;
                const color = ev.type === 'drought' ? 'bg-amber-500' : 'bg-blue-500';
                return (
                  <div 
                    key={i}
                    title={`${ev.type.toUpperCase()}: ${ev.start} - ${ev.end}`}
                    className={`absolute w-1 h-3 rounded-full ${color} opacity-40 hover:opacity-100 hover:scale-y-150 transition-all cursor-pointer`}
                    style={{ left: `${percent}%`, top: '-4px' }}
                    onClick={() => {
                      setSliderIndex(idx);
                      setActiveDate(ev.start);
                    }}
                  />
                );
              })}
            </div>

          </div>
        </div>
      )}

    </motion.div>
  );
}
