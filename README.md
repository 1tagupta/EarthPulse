# 🌍 EarthPulse: Planetary Hydrological Intelligence

> *An immersive digital twin and scientific analysis platform for Earth's water systems.*

EarthPulse is a next-generation hydrological analysis platform that transforms satellite and gravity telemetry into actionable planetary water intelligence. Inspired by NASA Eyes and Google Earth, it is designed for researchers, hydrologists, policy makers, and educators to explore and analyze groundwater depletion, soil moisture dynamics, and climate-driven anomalies.

Unlike traditional static dashboards, EarthPulse uses a **question-first, cinematic user experience** that guides the user from global-scale visual exploration directly into localized, publication-quality scientific research workflows.

---

## 🚀 The Vision: A Bloomberg Terminal for Hydrology

Our goal is to build the open-source equivalent of a Bloomberg Terminal for hydrology. By pointing the application at any watershed on Earth, researchers should immediately be able to answer:

1. *How dry is this region today compared to its historical baseline?*
2. *How has underground groundwater storage changed over the last decade?*
3. *What is the lag time between rainfall events and aquifer replenishment?*
4. *Are the observed trends statistically significant, or are they seasonal noise?*

---

## ✅ Current Status — Milestone 3.5 Complete

| Milestone | Status | Description |
|-----------|--------|-------------|
| M1 — Foundation | ✅ Done | 3D globe, routing, UI shell |
| M2 — UX & Search | ✅ Done | Real geocoding, cinematic transitions |
| M3 — Analytics Engine | ✅ Done | Scientific computation backend |
| M3 — Data Integration | ✅ Done | Real data connected to workspace |
| **M3.5 — Production Globe** | ✅ **Done** | Premium Earth textures, atmosphere |
| **M3.5 — Dynamic Location Data** | ✅ **Done** | Live ERA5-Land API for any location |
| M4 — Hydrological Timeline | 🔜 Next | Zoomable dual-axis chart |

---

## 🌐 Live Features

### Production-Quality 3D Earth
- **NASA/NOAA Textures**: High-resolution day, night, cloud, normal, and specular maps served from `/public/earth/`
- **Physically-Based Rendering**: `MeshStandardMaterial` with normal mapping, roughness, specular, and displacement for terrain relief
- **Day/Night Composite**: Emissive night lights layer blended onto the dark side of the Earth
- **Cloud Layer**: Independent rotation at 0.006 rad/s with additive blending
- **Atmospheric Glow**: Dual-sphere back-side scattering (outer haze + inner horizon ring)
- **Anisotropic Filtering**: Max-quality texture filtering on all surfaces
- **Resilient Texture Loading**: All 6 textures load with per-texture fallbacks — a missing file never crashes the app

### Real Geocoding & Camera Flight
- **Nominatim API**: Every search returns real name, country, lat/lon, bounding box, and admin level — zero hardcoded locations
- **Cinematic Slerp Flight**: Camera interpolates along a great-circle arc with cubic easing and an altitude bulge for long-range flights
- **Click-to-Geocode**: Clicking anywhere on the globe reverse-geocodes the clicked point and flies to it
- **OrbitControls**: Full drag, zoom (min 2.4 → max 12 units), and damping

### Dynamic Hydrological Data — Any Location on Earth
- **Open-Meteo ERA5-Land API** (free, no API key): Fetches 5 years of real soil moisture data for the exact lat/lon of any searched location
- **Variables fetched**: `soil_moisture_0_to_7cm_mean`, `soil_moisture_7_to_28cm_mean`, `soil_moisture_28_to_100cm_mean`, `precipitation_sum`, `et0_fao_evapotranspiration_sum`
- **In-browser analytics**: Weekly aggregation, monthly climatology, z-score normalization, groundwater trend (OLS slope → cm/year), event detection (drought/flood thresholds)
- **Hydrological Health Index**: Composite 0–10 score from surface, root-zone, and groundwater conditions
- **Fallback**: Bihar static dataset loaded when no location is selected or API is unreachable

### Research Workspace
- **4 Metric Cards**: Surface Moisture (m³/m³), Root-Zone Moisture, Aquifer Anomaly (cm EWT), Rainfall (mm/wk) — all live from API data
- **Z-score anomaly labels**: Each card shows whether conditions are normal, deficit, or surplus
- **HHI Gauge**: Animated circular arc gauge showing composite hydrological health
- **Layer Manager**: Boundary, Satellite, Telemetry, Terrain toggles with `localStorage` persistence
- **Timeline Slider**: Scrubs through all weekly records; updates all 4 metric cards reactively
- **Study Area Card**: Location name, centroid, bounding box, area km², start/end dates

---

## 🏗️ Project Structure

```
src/
├── app/                  # App entrypoint, ErrorBoundary (per-section isolation)
├── components/
│   ├── earth/            # Earth.tsx — Three.js globe with resilient texture loading
│   ├── layout/           # WorkspaceLayout.tsx — main research dashboard
│   ├── loading/          # LoadingSequence.tsx — cinematic terminal log + progress bar
│   ├── search/           # LandingUI.tsx + GeometryUploader.tsx
│   └── ui/               # Shared UI primitives
├── services/
│   ├── ProjectLoader.ts  # Dynamic data loader (Open-Meteo API + static fallback)
│   ├── SearchService.ts  # Nominatim geocoding
│   └── StudyAreaService.ts
├── stores/               # Zustand: useAppStore, useCameraStore, useLocationStore, useProjectStore
├── types/                # Location, TimelinePoint, AnalyticsSummary interfaces
└── constants/            # animations.ts
public/
└── earth/                # NASA/NOAA texture maps (day, night, normal, specular, clouds, elevation)
project_output/           # Static Bihar reference dataset (GEE-generated)
scripts/
└── download_earth_textures.sh
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + TypeScript + Vite |
| 3D Engine | Three.js + React Three Fiber + Drei |
| State | Zustand |
| Animations | Framer Motion |
| Geocoding | Nominatim (OpenStreetMap) |
| Hydrological Data | Open-Meteo ERA5-Land Archive API |
| Reference Dataset | Google Earth Engine (SMAP + GRACE + CHIRPS) |
| Styling | Tailwind CSS |
| Icons | Lucide React |

---

## 🔬 Scientific Analytics (In-Browser)

All analytics are computed in `ProjectLoader.ts` before the workspace renders:

### Metrics Computed
| Metric | Method |
|--------|--------|
| Surface / Root-zone moisture | ERA5-Land weekly means → 5-year series |
| Groundwater anomaly proxy | Deep SM deviation from 0.3 m³/m³ baseline × 40 (cm EWT) |
| Z-scores | Per-variable mean/std normalization across full period |
| Groundwater trend | OLS slope (cm/week) × 52 = cm/year |
| Hydrological Health Index | Weighted composite (surf 30%, root 40%, GW 30%) |
| Monthly climatology | Group-by YYYY-MM averages |
| Drought events | Surface SM < 15% for continuous window |
| Flood events | Precip > 80mm + SM > 70% simultaneously |

### Analytics Output Schema (for any location)
```
metadata         — location_name, center, area_sqkm, bounds, date range, datasets
geometry         — GeoJSON bounding polygon
timeline[]       — weekly: surfaceMoisture, rootZoneMoisture, groundwaterAnomaly, precipitation, surfaceZScore, rootZoneZScore
climatology[]    — monthly: averaged SM, GW, precipitation
analytics        — HHI, trend direction, annual rate cm/yr, recharge lag
events[]         — drought/flood events with start, end, severity, confidence
insights[]       — structured findings: type, value, unit, period, significance
quality          — temporal completeness, missing %, reliability score
```

---

## 🌍 Data Sources & Credits

| Dataset | Source | License |
|---------|--------|---------|
| ERA5-Land Soil Moisture | Open-Meteo.com via Copernicus CDS | CC BY 4.0 |
| Earth Day Texture | Natural Earth / NASA Visible Earth | Public Domain |
| Earth Night Lights | NASA Earth Observatory | Public Domain |
| Normal Map | webgl-earth (turban/webgl-earth) | Public Domain |
| Specular Map | Three.js examples (mrdoob/three.js) | MIT |
| Cloud Layer | NASA Blue Marble | Public Domain |
| Geocoding | Nominatim / OpenStreetMap | ODbL |
| SMAP Reference Data | NASA / Google Earth Engine | Public Domain |
| GRACE Reference Data | JPL / Google Earth Engine | Public Domain |
| CHIRPS Reference Data | UCSB CHG / Google Earth Engine | Public Domain |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
git clone https://github.com/1tagupta/Soil_Moisture_and_Groundwater_Analysis.git
cd Soil_Moisture_and_Groundwater_Analysis
npm install
```

### Running the App

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

The app runs entirely client-side with no backend required. All hydrological data is fetched live from the Open-Meteo API.

### Optional: Generate a GEE Dataset for a Specific Region

```bash
python hydro_dataset_generator.py
```

Requires Google Earth Engine authentication. Outputs a `project_output/` folder that the app can load as an alternative to the live API. The Bihar reference dataset is already included.

---

## 📈 Roadmap

### Milestone 4 — Hydrological Timeline (Next)
- Dual-axis zoomable time-series (surface moisture + groundwater on one canvas)
- Extreme event annotations as colored background blocks
- Bi-directional scrubbing (brush to zoom-filter; hover to update metric cards)
- One-click SVG/PNG export for academic papers

### Milestone 5 — AI Narrative Engine
- Structured insight → natural language translation via Gemini API
- Publication-quality paragraph generation from `insights.json`
- "Explain this drought" contextual summaries

### Milestone 6 — Comparative Analysis
- Side-by-side basin comparison mode
- Analogue year detection (DTW similarity scoring)
- Export comparison as formatted PDF report

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

*Built with ❤️ for open hydrological science.*
