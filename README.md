# 🌍 EarthPulse: Planetary Hydrological Intelligence

*An immersive digital twin and scientific analysis platform for Earth's water systems.*

EarthPulse is a next-generation hydrological analysis platform that transforms complex satellite and gravity telemetry into actionable planetary water intelligence. Inspired by NASA Eyes and Google Earth, it is designed for researchers, hydrologists, policy makers, and educators to explore and analyze groundwater depletion, soil moisture dynamics, and climate-driven anomalies.

Unlike traditional static dashboards, EarthPulse utilizes a **question-first, cinematic user experience** that guides the user from global-scale visual exploration directly into localized, publication-quality scientific research workflows.

---

## 🚀 The Vision: A Bloomberg Terminal for Hydrology

Our goal is to build the open-source equivalent of a Bloomberg Terminal for hydrology. By pointing the application at any watershed on Earth, researchers should be able to immediately answer critical questions that currently require Google Earth Engine scripts, Python notebooks, GIS software, and manual statistical analysis:
1. *How dry is this region today compared to its 30-year historical baseline?*
2. *How has underground groundwater storage changed over the last decade?*
3. *What is the lag time between rainfall events and aquifer replenishment?*
4. *Are the observed trends statistically significant, or are they seasonal noise?*

---

## 🏗️ What Has Been Built So Far (Milestones 1 & 2)

We are building this platform using a modular, feature-first structure. The first two development milestones established the front-end rendering engines, the cinematic transition architecture, and the spatial querying interface.

```
src/
├── app/          # App entrypoint, global wrappers, error boundaries
├── components/   # Modular component folders (layout, earth, search, loading, etc.)
├── hooks/        # Reusable custom React hooks
├── services/     # API, data loaders, search, and storage services
├── stores/       # Zustand state management stores
├── styles/       # CSS styles and global stylesheets
├── types/        # TypeScript interfaces and type definitions
└── utils/        # Mathematical and utility functions
```

### 1. Immersive 3D Space-Earth-Water Environment
*   **Three.js & React Three Fiber Engine**: Renders a true 3D digital model of the Earth at 60fps, supporting real-time camera manipulation and transitions.
*   **Atmospheric Physics**: Simulates directional solar lighting. The day side of the planet is fully illuminated, while the night side falls into dark shadow, revealing glowing city lights.
*   **Dynamic Weather Layer**: A translucent cloud layer orbits the globe independently of the Earth's rotation to create a sense of life.
*   **Atmospheric Ray-Glow**: An outer additive-blended sphere produces the soft blue scattering effect of the atmosphere.
*   **Starfield Parallax Background**: Renders a field of moving stars in deep space, conveying spatial depth.

### 2. Autocomplete Search & Selection
*   **Fuzzy Search Engine**: Supports administrative levels (Country, State, Province, District, City), hydrological features (River Basins, Watersheds, Catchments), coordinates (Latitude/Longitude), and bounding boxes.
*   **Flexible Geometry Inputs**: Allows researchers to search, select, or upload custom GeoJSON boundaries to define their study area.

### 3. Cinematic Transition Workflow
*   **Camera Fly-ins**: On searching and selecting a study area, the UI fades out, and the Three.js camera calculates a spatial trajectory to fly directly to the target location coordinates.
*   **Simulated Sonar Scan & Loading Sequence**: Mounts a terminal-style sequence showing simulated data acquisition logs (e.g. `Loading metadata.json`, `Ingesting weekly_data.csv`) while scanning the region.
*   **Mini Globe Transition**: When loading completes, the Canvas smoothly shrinks and slides into the top-left corner, serving as a live navigation widget while the primary workspace fades in.
*   **Glassmorphic Workspace Layout**: The central workspace renders as floating glass panels over the deep space background. The shell includes headers for coordinates, area, and bounding boxes, alongside placeholder slots for future scientific modules.

### 4. Data Extraction Pipeline (`hydro_dataset_generator.py`)
*   A standalone Python data harvester that authenticates with **Google Earth Engine (GEE)**.
*   Extracts and aggregates massive planetary datasets:
    1.  **NASA SMAP (Soil Moisture Active Passive)**: Measures surface and root-zone soil saturation (10km scale).
    2.  **NASA GRACE Mascons (Gravity Recovery and Climate Experiment)**: Measures monthly equivalent water thickness anomalies, capturing changes in deep aquifers.
    3.  **CHIRPS (Climate Hazards Group InfraRed Precipitation with Station)**: High-resolution daily rainfall estimates.
*   Generates a standard **Project Package** in a folder named `project_output/`, ensuring the front-end has pre-packaged, zero-computation datasets.

---

## 🔬 Milestone 3 Backend: Scientific Analytics Engine

The Scientific Analytics Engine is a pure-python calculation pipeline designed to compute publication-quality hydrological metrics. To maintain high performance and enforce a separation of concerns, **all scientific analytics must be computed before the UI renders**. The React front-end is strictly a visualizer and must never perform raw calculations.

### Ingested Inputs
The engine consumes the raw datasets extracted by the harvester:
*   `weekly_data.csv`: Date-indexed rows of surface soil moisture, root zone moisture, and groundwater storage anomalies.
*   `metadata.json`: Geographic metadata, coordinate centroid, bounds, and date ranges.
*   `geometry.geojson`: Boundary polygon of the study area.
*   `timeline.json`: Date-indexed array of historical anomalies.
*   `climatology.json`: Historical averages grouped by week and month.

### Computed Outputs
The engine outputs structured, typed JSON files ready for immediate UI rendering:
*   `analytics.json`: Rolling metrics, trends, anomaly indices, and correlation coefficients.
*   `insights.json`: Structured AI-ready findings containing anomalies and trends.
*   `events.json`: Detected hydrological extreme events (floods, droughts, dry/wet spells).
*   `statistics.json`: Probability distributions, standard deviations, and percentiles.
*   `comparison.json`: Cross-year comparisons and analogue score cards.
*   `quality.json`: Completeness, sensor gaps, and dataset reliability metrics.

### Technical Analysis Specifications

#### 1. Core Climatology & Anomalies
*   **Climatological Baselines**: Compute weekly, monthly, and annual baseline normals across the entire period.
*   **Rolling Statistics**: Compute rolling averages, moving medians, and running standard deviations (using user-defined windows like 4-week, 12-week, and 52-week spans).
*   **Anomaly Indices**:
    *   *Absolute Anomaly*: $X_t - \mu_{week}$ (difference from the weekly historical mean).
    *   *Standardized Anomaly*: $(X_t - \mu_{week}) / \sigma_{week}$ (Z-score normalized to represent deviation magnitude in standard deviations).
*   **Percentile Rankings**: Rank every observation against the historical distribution for its corresponding calendar week (0 to 100th percentile).

#### 2. Non-Parametric Trend Analysis
*   **Linear Regression**: Compute ordinary least squares (OLS) slopes and intercepts.
*   **Polynomial Fit**: Compute quadratic/cubic curves to detect trend acceleration or deceleration.
*   **Mann-Kendall Trend Test**: A non-parametric test to determine if a monotonic upward or downward trend exists:
    $$S = \sum_{i=1}^{n-1} \sum_{j=i+1}^{n} \text{sign}(x_j - x_i)$$
    Compute the $p$-value to assess trend significance (threshold at $p < 0.05$).
*   **Sen's Slope Estimator**: Calculate the median of all slopes between pairs of data points:
    $$\beta = \text{median} \left( \frac{x_j - x_i}{j - i} \right) \quad \forall j > i$$
*   **Trend Classification**: Automatically classify the trend into one of the following classes:
    *   `Strong Increase`: Significant positive trend ($p < 0.05$, steep slope)
    *   `Moderate Increase`: Significant positive trend ($p < 0.05$, shallow slope)
    *   `Stable`: No significant trend ($p \ge 0.05$)
    *   `Moderate Decline`: Significant negative trend ($p < 0.05$, shallow slope)
    *   `Strong Decline`: Significant negative trend ($p < 0.05$, steep slope)

#### 3. Aquifer Recharge & Lag Analytics
*   **Cross-Correlation Analysis**: Calculate the correlation between precipitation (CHIRPS) or surface moisture (SMAP) and groundwater anomaly (GRACE) across multiple temporal lags (0 to 52 weeks):
    $$R(k) = \frac{\sum (x_t - \bar{x})(y_{t+k} - \bar{y})}{\sqrt{\sum(x_t - \bar{x})^2 \sum(y_{t+k} - \bar{y})^2}}$$
*   **Best Recharge Lag**: Find the lag $k$ that maximizes correlation $R(k)$, representing the groundwater response delay.
*   **Correlation Coefficients**: Compute Pearson (linear) and Spearman (rank-order) correlations for soil moisture vs. groundwater.
*   **Recharge Persistence**: Measure how long groundwater levels remain elevated following a major recharge event (using autocorrelation decay curves).

#### 4. Extreme Event Detection
Identify droughts, floods, rapid recharge, and rapid depletion events using standardized thresholds:
*   **Drought**: Standardized soil moisture anomaly falls below $-1.5$ or groundwater falls below the 10th percentile for a continuous period of at least 8 weeks.
*   **Flood**: Surface soil moisture anomaly exceeds $+1.5$ or groundwater exceeds the 90th percentile for at least 3 consecutive weeks.
*   **Groundwater Collapse**: A rapid depletion event where groundwater drops by $>2.5$ standard deviations within a 26-week window.
*   **Event Attributes**: For each event, output the start date, end date, duration (weeks), peak intensity (maximum anomaly reached), return period (estimated frequency in years), and overall severity score.

#### 5. Similarity & Analogue Year Detection
*   **Cross-Year Distance Metric**: Compute similarity between any two water years using dynamic time warping (DTW) or Euclidean distance of normalized anomaly trajectories.
*   **Similarity Score**: Normalize distance into a percentage (e.g. `94% similarity`).
*   **Analogue Identification**: Identify the closest historical analogue year for the current year. Include a structured explanation of contributing factors (e.g. "Both years had similar dry-season duration and delayed monsoon recharge").

#### 6. Hydrological Health Index (HHI)
Compute a composite score from $0.0$ (extreme stress) to $10.0$ (optimal hydrological health):
*   **Inputs**: Weighted combination of:
    *   Surface Moisture (Percentile rank) [Weight: 20%]
    *   Groundwater Storage (Trend and Anomaly rank) [Weight: 40%]
    *   Recharge Efficiency [Weight: 15%]
    *   Variability and Anomaly magnitude [Weight: 15%]
    *   Data Quality / Completeness [Weight: 10%]
*   **Output**: Composite score, index category (e.g., `Severely Stressed`, `Normal`, `Surplus`), explanation list of contributing factors, and statistical confidence.

#### 7. AI-Ready Structured Insights
To prevent non-deterministic language generation, the engine must never write paragraphs. Instead, it generates structured observations for consumption by a future AI translation layer:
```json
{
  "type": "groundwater_decline",
  "confidence": 0.94,
  "value": -2.3,
  "unit": "cm/year",
  "period": "2018-2024",
  "significance": 0.012
}
```

---

## 🎨 Milestone 3 Frontend: Data Integration & Current Status

This phase focuses on connecting the workspace shell to real data, replacing all mock placeholder text with live numbers, gauges, and spatial previews. 

### Module State Management
To ensure a robust user experience, every front-end module must support **5 standard UI states**:
1.  **Loading**: Glassmorphic shimmer or loading spinner.
2.  **Ready**: Populated with styled data and animations.
3.  **Empty**: Faded visual state with an instruction message (e.g., "Select a study area to initialize statistics").
4.  **Offline**: Indicates connection loss while preserving cached data.
5.  **Error**: Displays a graceful error boundary message with raw debug details collapsibly available.

### Components to Implement

#### 1. ProjectLoader Service
*   Acts as a singleton state controller.
*   Fetches, parses, and validates the GEE output files: `metadata.json`, `geometry.geojson`, `weekly_data.csv`, `timeline.json`, and `analytics.json`.
*   Caches parsed data structures in memory to avoid redundant network requests.
*   Supports instant project switching without reloading the page.

#### 2. Current Conditions Module
Replaces the placeholder metrics card with interactive data readouts:
*   Displays Surface Soil Moisture, Root Zone Soil Moisture, Groundwater Anomaly, and Rainfall.
*   For each metric, display:
    *   **Current Value** (with appropriate scientific units like $m^3/m^3$ or equivalent water thickness in $cm$).
    *   **Units & Historical Percentile** (colored by wetness/dryness).
    *   **Trend Indicator** (arrow indicating rising, stable, or falling).
    *   **Confidence score** and data source citation.
*   Uses **animated count-up animations** when numbers load or update.

#### 3. Hydrological Health Index Gauge
*   Renders the composite score on a custom circular arc gauge.
*   Avoids generic dashboard-style designs. Renders a thin, neon cyan-to-blue glow ring with a floating indicator dot, dynamic category text, and a list of key contributing factors (e.g. "Low monsoon rainfall", "Stable deep aquifer trend").

#### 4. Expanded Study Area Card
*   Renders geographical parameters: location name, bounding area ($km^2$), perimeter length, elevation profile, climate zone classification, active river basin, and estimated population inside the boundary.
*   Contains a grid of available layers and satellite data coverage metrics.
*   Applies a staggered entrance animation (e.g., sliding up and fading in element-by-element).

#### 5. Mini Satellite Preview
*   Renders a static satellite map crop of the active bounding box.
*   Draws the GeoJSON study boundary as a glowing cyan outline over the imagery.
*   Includes a dynamic scale bar and a clean, minimalist North Arrow indicator.

#### 6. Collapsible Dataset Information Panel
*   Displays metadata: SMAP Version, GRACE Mascon Version, CHIRPS version, spatial/temporal resolutions, processing date, execution duration, and reference citations.
*   Enables researchers to verify the academic credibility of the source telemetry.

#### 7. Layer Manager (Opacity Controller)
*   A panel containing toggles and range sliders for: `Boundary`, `Satellite (Base)`, `Surface Moisture (Overlay)`, `Groundwater (Overlay)`, `Rainfall Heatmap`, and `Terrain (Shaded Relief)`.
*   Toggling or fading layers executes smooth canvas visual state updates.
*   Stores user layer preferences in `localStorage`.

#### 8. Global Time Selector
*   A timeline slider at the bottom of the workspace.
*   Allows the user to select specific points in time (e.g., specific weeks, months, or years) or snap back to "Latest".
*   Updating the time slider triggers a reactive state update, propagating the selected date across all dashboard modules (updating current values, percentiles, and satellite layers).

---

## 📈 Future Flagship: The Hydrological Timeline (Milestone 4)

Once the data integration is complete, the centerpiece of EarthPulse will be built: **The Hydrological Timeline**.
Rather than rendering simple charts, the timeline will act as a scientific storytelling engine:
*   **Dual-Axis Zoomable Time-Series**: Plots surface moisture, root-zone moisture, and groundwater anomalies on a single time axis from 2015 to the present.
*   **Interactive Annotations**: Extreme events (droughts, floods, groundwater collapse) are automatically annotated as colored background blocks. Hovering or clicking an event opens a detail popover and updates the main workspace date.
*   **Bi-directional Scrubbing**: Brushing a range on the timeline zoom-filters the dataset, while hovering a single date updates the mini globe, active conditions, and indices.
*   **Vector Export**: Provides one-click exporting of the chart state as publication-ready vector SVGs or high-res PNG files for academic papers.
