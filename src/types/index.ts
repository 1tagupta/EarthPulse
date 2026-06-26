export interface Location {
  id: string;
  name: string;
  country: string;
  coordinates: {
    lat: number;
    lon: number;
    // 3D globe coordinates
    x: number;
    y: number;
    z: number;
  };
  metadata?: {
    sizeKm2: number;
    climateClass: string;
    population: number;
  };
}

export interface TimelinePoint {
  date: string;
  surfaceMoistureAnomaly: number;
  rootZoneAnomaly: number;
  groundwaterAnomaly: number;
  precipitation?: number;
}

export interface Insight {
  id: string;
  title: string;
  description: string;
  type: 'drought' | 'recharge' | 'trend' | 'anomaly';
  severity: 'low' | 'medium' | 'high' | 'extreme';
}

export interface AnalyticsSummary {
  hydrologicalHealthIndex: number;
  surfaceMoisturePercentile: number;
  rootZonePercentile: number;
  groundwaterTrend: 'recovering' | 'stable' | 'declining';
  rechargeDelayWeeks: number;
}
