import { useProjectStore } from '@/stores/useProjectStore';

/**
 * Lightweight, native CSV parser.
 * Splits by rows and commas, mapping strings to numbers/nulls where appropriate.
 */
function parseCSV(text: string): Record<string, any>[] {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
    
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const entry: Record<string, any> = {};
    
    for (let j = 0; j < headers.length; j++) {
      const val = values[j];
      if (val === '' || val === undefined) {
        entry[headers[j]] = null;
      } else {
        const num = Number(val);
        entry[headers[j]] = isNaN(num) ? val : num;
      }
    }
    data.push(entry);
  }
  
  return data;
}

export class ProjectLoader {
  /**
   * Load the generated project outputs from the root project_output directory.
   */
  static async loadProject(): Promise<boolean> {
    const store = useProjectStore.getState();
    
    store.setProjectData({
      isLoading: true,
      loadingProgress: 10,
      loadingStep: 'Connecting to Data Repository...',
      error: null
    });

    try {
      // Step 1: Connecting to data folder
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      // Step 2: Fetch and validate metadata.json
      store.setProjectData({ loadingProgress: 25, loadingStep: 'Reading Metadata...' });
      const metadataRes = await fetch('/project_output/metadata.json');
      if (!metadataRes.ok) {
        throw new Error('Project metadata (metadata.json) not found in project_output/');
      }
      const metadata = await metadataRes.json();
      
      // Basic validation
      if (!metadata.location_name || !metadata.center || !metadata.bounds) {
        throw new Error('Invalid metadata.json format: missing location, center, or bounding coordinates.');
      }

      // Step 3: Fetch geometry.geojson
      store.setProjectData({ loadingProgress: 45, loadingStep: 'Loading Geometry...' });
      const geomRes = await fetch('/project_output/geometry.geojson');
      if (!geomRes.ok) {
        throw new Error('Project boundary geometry (geometry.geojson) not found.');
      }
      const geometry = await geomRes.json();

      // Step 4: Fetch and parse weekly_data.csv, timeline.json, climatology.json
      store.setProjectData({ loadingProgress: 65, loadingStep: 'Preparing Hydrological Observations...' });
      
      const [csvRes, timelineRes, climatologyRes] = await Promise.all([
        fetch('/project_output/weekly_data.csv'),
        fetch('/project_output/timeline.json'),
        fetch('/project_output/climatology.json')
      ]);

      if (!csvRes.ok || !timelineRes.ok || !climatologyRes.ok) {
        throw new Error('Timeseries, timeline, or climatology files not found.');
      }

      const csvText = await csvRes.text();
      const weeklyData = parseCSV(csvText);
      const timeline = await timelineRes.json();
      const climatology = await climatologyRes.json();

      // Step 5: Fetch analytics.json, events.json, insights.json
      store.setProjectData({ loadingProgress: 85, loadingStep: 'Analyzing Anomalies & Trends...' });
      
      const [analyticsRes, eventsRes, insightsRes, qualityRes] = await Promise.all([
        fetch('/project_output/analytics.json'),
        fetch('/project_output/events.json'),
        fetch('/project_output/insights.json'),
        fetch('/project_output/quality.json').catch(() => null) // Optional
      ]);

      if (!analyticsRes.ok || !eventsRes.ok || !insightsRes.ok) {
        throw new Error('Analytics, events, or insights files not found.');
      }

      const analytics = await analyticsRes.json();
      const events = await eventsRes.json();
      const insights = await insightsRes.json();
      const quality = qualityRes && qualityRes.ok ? await qualityRes.json() : null;

      // Complete loading
      store.setProjectData({
        metadata,
        geometry,
        weeklyData,
        timeline,
        climatology,
        analytics,
        events,
        insights,
        quality,
        isLoading: false,
        loadingProgress: 100,
        loadingStep: 'Generating Workspace...'
      });

      return true;
    } catch (err: any) {
      console.error(err);
      store.setProjectData({
        isLoading: false,
        loadingProgress: 0,
        loadingStep: '',
        error: err.message || 'An error occurred while loading the dataset.'
      });
      return false;
    }
  }
}
