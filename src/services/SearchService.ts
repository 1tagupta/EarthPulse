import { Location } from '@/types';

// Mock database for now
const PREDEFINED_LOCATIONS: Record<string, Location> = {
  california: { id: 'us-ca', name: 'California', country: 'United States', coordinates: { lat: 36.77, lon: -119.41, x: -1.2, y: 1.5, z: 2.2 } },
  bihar: { id: 'in-br', name: 'Bihar', country: 'India', coordinates: { lat: 25.09, lon: 85.31, x: 1.8, y: 0.9, z: 1.8 } },
  nile: { id: 'eg-nile', name: 'Nile Basin', country: 'Egypt', coordinates: { lat: 30.04, lon: 31.23, x: 2.2, y: 1.1, z: -0.5 } },
  amazon: { id: 'br-amz', name: 'Amazon Rainforest', country: 'Brazil', coordinates: { lat: -3.46, lon: -62.21, x: -1.5, y: -0.2, z: 2.5 } },
};

export class SearchService {
  /**
   * Search for a location by text query.
   * In a future milestone, this will call a real geocoding API.
   */
  static async query(searchTerm: string): Promise<Location | null> {
    const normalized = searchTerm.toLowerCase().trim();
    const key = Object.keys(PREDEFINED_LOCATIONS).find((k) => normalized.includes(k));
    
    // Simulate network delay for loading states
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    if (key) {
      return PREDEFINED_LOCATIONS[key];
    }
    
    return PREDEFINED_LOCATIONS['california']; // Fallback for Milestone 1 behavior
  }
}
