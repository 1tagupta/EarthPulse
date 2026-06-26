# 🌍 EarthPulse: Planetary Water Intelligence

*Explore Earth's hidden water systems.*

EarthPulse is not a traditional analytics dashboard. It is an immersive, 3D digital twin designed to help researchers, hydrologists, and the public visualize and understand the planet's water cycle. Inspired by NASA Eyes and Google Earth, EarthPulse transforms complex satellite data into a cinematic, interactive exploration experience.

---

## 🚀 The Vision

Most scientific dashboards are *data-first*—they present you with dozens of charts and menus immediately. 
EarthPulse is **question-first**. 

When you open the application, you aren't greeted by charts. You are greeted by a living, rotating 3D Earth suspended in deep space. 
You are asked one simple question: **"Where on Earth would you like to explore water?"**

Once a location is selected, the camera physically flies to that continent, the Earth seamlessly shrinks into a navigation globe, and a continuous vertical scientific narrative unfolds to answer critical questions:
1. *How wet is this region today compared to history?*
2. *How has water storage changed over the last decade?*
3. *How quickly does rainfall actually recharge the groundwater?*

---

## 🏗️ What Has Been Built So Far (Milestone 1)

We are currently building this platform in stages. We have just completed **Milestone 1**, which establishes the 3D physics and architectural foundation:

### 1. The Living Earth Engine (React + WebGL)
- **True 3D Rendering**: The globe is not a 2D CSS trick. It is rendered in WebGL using `Three.js` and `React Three Fiber`, ensuring high-performance 60fps graphics.
- **Atmospheric Physics**: We have simulated directional sunlight. Half the planet is illuminated by the sun, while the night hemisphere falls into shadow, revealing glowing city lights.
- **Independent Weather**: A translucent cloud layer physically orbits the globe independently of the Earth's rotation.
- **Atmospheric Glow**: An additive-blended outer sphere creates the soft blue scattering effect seen at the edge of the atmosphere.

### 2. The Cinematic Landing Experience
- You start 50,000 kilometers away in deep space, surrounded by a parallax starfield.
- A minimalist, glassmorphic search interface fades in.
- **The Camera Flight**: When you search for a location (e.g., "California" or "Bihar") and press enter, the UI fades out, and the camera automatically calculates the spatial trajectory, zooming in smoothly to the target coordinates.

---

## 🔬 How The Data Pipeline Works (The Python Engine)

While the front-end is an immersive 3D React application, the back-end relies on the included Python script (`bihar_soil_moisture_groundwater.py`). 

This script connects directly to **Google Earth Engine (GEE)** to act as our data harvester. It processes massive planetary datasets in the cloud, extracting:
1. **NASA SMAP (Soil Moisture Active Passive)**: Measures surface and root-zone soil saturation.
2. **NASA GRACE (Gravity Recovery and Climate Experiment)**: Measures underground aquifer depletion by tracking tiny changes in Earth's gravity.
3. **CHIRPS**: Measures historical rainfall.

The script aggregates this terabyte-scale data into lightweight, optimized weekly CSV files that the EarthPulse 3D engine can instantly read and visualize.

---

## 🗺️ What's Coming Next (The Roadmap)

### Milestone 2: The Transition & Loading Sequence
- When flying to a location, a "sonar pulse" animation will scan the Earth.
- The Earth will smoothly shrink into the top-left corner to act as a permanent, live navigation menu.

### Milestone 3: The Research Workspace
- **Floating Glass Panels**: Data will appear over the blurred space background, completely avoiding traditional white dashboard rectangles.
- **Cinematic Timeline**: A beautiful, interactive history of droughts and floods.

### Milestone 4: Advanced Scientific Modules
- **Recharge Lag Waveforms**: Drag two waveforms (Soil Moisture vs Groundwater) over each other to visually calculate how many weeks it takes for rain to reach the aquifer.
- **Seasonal Wheels**: A circular calendar showing the historical "normal" water levels for any given week of the year.

### Milestone 5: The AI Insights Engine
- The application will automatically read the data and write a scientific summary (e.g., *"Groundwater recovery typically follows major rainfall by approximately 7 weeks. Aquifer storage has gradually declined since 2018."*)
- **1-Click Export**: Generate publication-ready PDF reports for research papers.

---

## 💻 Technical Stack

- **Framework**: React 18 (via Vite)
- **3D Graphics**: Three.js, React Three Fiber, React Three Drei
- **Motion Design**: Framer Motion
- **Styling**: Tailwind CSS (v3)
- **State Management**: Zustand
- **Data Engineering**: Python, Google Earth Engine API
