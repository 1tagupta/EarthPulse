import { Location } from '@/types';

export class SearchService {
  /**
   * Search for locations by text query using OpenStreetMap Nominatim API.
   * Returns a list of matching locations with full geocoded details.
   */
  static async query(searchTerm: string): Promise<Location[]> {
    if (!searchTerm.trim()) return [];

    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        searchTerm
      )}&format=json&addressdetails=1&limit=5`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'EarthPulse Hydrology Analytics Engine'
        }
      });
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const results = await response.json();

      return results.map((item: any) => {
        const lat = parseFloat(item.lat);
        const lon = parseFloat(item.lon);

        // Convert spherical coords to 3D Cartesian coords for camera positioning
        // Radius of 4.5 gives a good height above the Earth sphere of radius 2
        const radius = 4.5;
        const phi = (lat * Math.PI) / 180;
        const theta = (lon * Math.PI) / 180;
        const x = -radius * Math.cos(phi) * Math.sin(theta);
        const y = radius * Math.sin(phi);
        const z = radius * Math.cos(phi) * Math.cos(theta);

        // Parse bounding box: Nominatim returns [minlat, maxlat, minlon, maxlon]
        const bbox = item.boundingbox 
          ? [parseFloat(item.boundingbox[0]), parseFloat(item.boundingbox[1]), parseFloat(item.boundingbox[2]), parseFloat(item.boundingbox[3])] as [number, number, number, number]
          : [lat - 0.5, lat + 0.5, lon - 0.5, lon + 0.5] as [number, number, number, number];

        // Determine name and administrative level
        const addr = item.address || {};
        const name = addr.city || addr.town || addr.municipality || addr.state || addr.country || item.display_name.split(',')[0];
        const country = addr.country || 'Global';
        const adminLevel = item.type || item.class || 'administrative';

        return {
          id: String(item.place_id),
          name,
          country,
          coordinates: { lat, lon, x, y, z },
          boundingBox: bbox,
          adminLevel,
          displayName: item.display_name
        };
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      return [];
    }
  }
}
