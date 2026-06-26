import { create } from 'zustand';

export interface ProjectMetadata {
  location_name: string;
  center: [number, number];
  area_sqkm: number;
  bounds: [number, number, number, number];
  start_date: string;
  end_date: string;
  available_datasets: string[];
  citation: string;
}

export interface ProjectAnalytics {
  hydrologicalHealthIndex: number;
  hydrologicalHealthCategory: string;
  hydrologicalHealthExplanation: string;
  surfaceMoisturePercentile: number;
  rootZonePercentile: number;
  groundwaterTrend: 'stable' | 'recovering' | 'declining' | 'strong increase' | 'moderate increase' | 'strong decline' | 'moderate decline';
  groundwaterTrendAnnualRateCm: number;
  groundwaterTrendPValue: number;
  rechargeDelayWeeks: number;
  rechargeDelayCorrelation: number;
  rechargeLagCurve: number[];
}

export interface HydrologicalEvent {
  type: 'drought' | 'flood' | 'rapid recharge' | 'rapid depletion' | 'groundwater collapse';
  start: string;
  end: string;
  duration: number;
  peakIntensity: number;
  severity: 'low' | 'medium' | 'high' | 'extreme';
  confidence: number;
}

export interface AIInsight {
  type: string;
  confidence: number;
  value: number;
  unit: string;
  period: string;
  significance?: string;
  mechanism?: string;
}

export interface DatasetQuality {
  missingDataPercentage: number;
  sensorCoverage: number;
  temporalCompleteness: number;
  gapStatistics: string;
  datasetReliabilityScore: number;
  confidenceScore: number;
}

interface ProjectState {
  metadata: ProjectMetadata | null;
  geometry: any | null;
  weeklyData: any[] | null;
  timeline: any[] | null;
  climatology: any[] | null;
  analytics: ProjectAnalytics | null;
  events: HydrologicalEvent[] | null;
  insights: AIInsight[] | null;
  quality: DatasetQuality | null;
  
  isLoading: boolean;
  loadingProgress: number;
  loadingStep: string;
  error: string | null;
  
  // Date selection state
  activeDate: string | null;
  activeDateData: any | null;
  
  setProjectData: (data: Partial<ProjectState>) => void;
  clearProjectData: () => void;
  setActiveDate: (date: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  metadata: null,
  geometry: null,
  weeklyData: null,
  timeline: null,
  climatology: null,
  analytics: null,
  events: null,
  insights: null,
  quality: null,
  
  isLoading: false,
  loadingProgress: 0,
  loadingStep: '',
  error: null,
  
  activeDate: null,
  activeDateData: null,
  
  setProjectData: (data) => {
    set(data as any);
    
    // Auto-initialize activeDate to the latest available record if not set
    if (data.timeline && data.timeline.length > 0 && !get().activeDate) {
      const latestPoint = data.timeline[data.timeline.length - 1];
      set({ 
        activeDate: latestPoint.date,
        activeDateData: latestPoint
      });
    }
  },
  
  clearProjectData: () => set({
    metadata: null,
    geometry: null,
    weeklyData: null,
    timeline: null,
    climatology: null,
    analytics: null,
    events: null,
    insights: null,
    quality: null,
    activeDate: null,
    activeDateData: null,
    error: null
  }),
  
  setActiveDate: (date) => {
    if (!date) {
      set({ activeDate: null, activeDateData: null });
      return;
    }
    
    const timeline = get().timeline;
    if (!timeline) return;
    
    // Find closest timeline record
    const match = timeline.find(pt => pt.date === date) || timeline[timeline.length - 1];
    set({ 
      activeDate: date,
      activeDateData: match
    });
  }
}));
