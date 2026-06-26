import ee
import pandas as pd
import datetime
import sys
import os
import json
import shutil

# ---- Configuration ---------------------------------------------------------
OUTPUT_DIR = "project_output"
METADATA_JSON = "metadata.json"
GEOMETRY_GEOJSON = "geometry.geojson"
TIMELINE_JSON = "timeline.json"
CLIMATOLOGY_JSON = "climatology.json"
ANALYTICS_JSON = "analytics.json"
INSIGHTS_JSON = "insights.json"
EVENTS_JSON = "events.json"
WEEKLY_CSV = "weekly_data.csv"
LAYERS_DIR = "layers"

SMAP_COLLECTION = "NASA/SMAP/SPL4SMGP/008"
GRACE_COLLECTION = "NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI"
GAUL_COLLECTION = "FAO/GAUL/2015/level1"

SCALE_METERS = 10000  # 10 km
BATCH_SIZE = 50       # Process this many weeks per server-side call

# ---- Main ------------------------------------------------------------------
def main():
    print("=" * 60)
    print("Global Weekly Soil Moisture & Groundwater Dataset Generator")
    print("              (Structured Package Export)")
    print("=" * 60)

    # 1. Authenticate & initialise Earth Engine
    print("\n[1/7] Initialising Google Earth Engine ...")
    project = os.environ.get("GEE_PROJECT") or os.environ.get("EARTHENGINE_PROJECT")
    
    if not project:
        project = input("Enter GEE Project ID (leave empty if using default): ").strip()
        if not project:
            project = None

    try:
        ee.Initialize(project=project)
        print(f"  [OK] Initialised successfully.")
    except Exception as e:
        print(f"  [!] Direct connection failed: {e}")
        print("  [!] Running ee.Authenticate() to log in...")
        try:
            ee.Authenticate()
            ee.Initialize(project=project)
            print(f"  [OK] Initialised successfully.")
        except Exception as auth_err:
            print(f"  [ERROR] Earth Engine auth failed: {auth_err}")
            sys.exit(1)

    # 2. Configure target study area
    print("\n[2/7] Configuring target study area...")
    print("Select Location Selection Mode:")
    print("  1. State/Province boundary (GAUL Level 1 database)")
    print("  2. Coordinate Point + Radius (km)")
    print("  3. Custom Bounding Box (BBox)")
    
    choice = input("Enter choice (1, 2, or 3) [default: 1]: ").strip() or "1"
    
    geom = None
    location_name = ""
    center_coords = [0.0, 0.0]
    
    if choice == "1":
        country = input("Enter Country Name [default: India]: ").strip() or "India"
        state = input("Enter State/Province Name [default: Bihar]: ").strip() or "Bihar"
        location_name = f"{state}, {country}"
        
        print(f"  Loading GAUL Level 1 boundary for '{location_name}'...")
        gaul = ee.FeatureCollection(GAUL_COLLECTION)
        region_fc = gaul.filter(ee.Filter.and_(
            ee.Filter.eq("ADM0_NAME", country),
            ee.Filter.eq("ADM1_NAME", state)
        ))
        
        try:
            count = region_fc.size().getInfo()
            if count == 0:
                print(f"  [ERROR] Could not find state '{state}' in country '{country}'.")
                sys.exit(1)
        except Exception as e:
            print(f"  [ERROR] GEE query failed: {e}")
            sys.exit(1)
            
        geom = region_fc.geometry()
        centroid = geom.centroid(100).coordinates().getInfo()
        center_coords = [centroid[1], centroid[0]] # [Lat, Lon]
        
    elif choice == "2":
        lat_str = input("Enter Latitude (e.g. 25.1): ").strip()
        lon_str = input("Enter Longitude (e.g. 85.3): ").strip()
        radius_str = input("Enter Radius in km [default: 50]: ").strip() or "50"
        
        lat, lon, radius = float(lat_str), float(lon_str), float(radius_str)
        location_name = f"Point ({lat}, {lon}), {radius}km Radius"
        center_coords = [lat, lon]
        geom = ee.Geometry.Point([lon, lat]).buffer(radius * 1000)
        
    elif choice == "3":
        min_lon = float(input("Enter Min Longitude (West): ").strip())
        min_lat = float(input("Enter Min Latitude (South): ").strip())
        max_lon = float(input("Enter Max Longitude (East): ").strip())
        max_lat = float(input("Enter Max Latitude (North): ").strip())
        
        location_name = f"BBox [{min_lon}, {min_lat}, {max_lon}, {max_lat}]"
        geom = ee.Geometry.BBox(min_lon, min_lat, max_lon, max_lat)
        centroid = geom.centroid(100).coordinates().getInfo()
        center_coords = [centroid[1], centroid[0]]
        
    print(f"  [OK] Location loaded: '{location_name}'")

    # 3. Configure dates
    print("\n[3/7] Configuring date intervals...")
    start_date = input("Enter Start Date (YYYY-MM-DD) [default: 2015-01-01]: ").strip() or "2015-01-01"
    end_date = input("Enter End Date (YYYY-MM-DD) [default: 2025-12-31]: ").strip() or "2025-12-31"

    # 4. Load datasets
    print("\n[4/7] Loading collections...")
    smap = ee.ImageCollection(SMAP_COLLECTION).filterDate(start_date, end_date).select(["sm_surface", "sm_rootzone"])
    grace = ee.ImageCollection(GRACE_COLLECTION).filterDate(start_date, end_date).select(["lwe_thickness"])

    # 5. Build weekly date list
    print(f"\n[5/7] Building weekly intervals ({start_date} -> {end_date}) ...")
    start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
    end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d")

    weeks = []
    w = 0
    while True:
        ws = start_dt + datetime.timedelta(weeks=w)
        we = ws + datetime.timedelta(days=7)
        if ws >= end_dt:
            break
        weeks.append((ws.strftime("%Y-%m-%d"), we.strftime("%Y-%m-%d")))
        w += 1

    total_weeks = len(weeks)

    # 6. Batch server-side processing
    print(f"\n[6/7] Processing {total_weeks} weeks in batches of {BATCH_SIZE} ...")
    results = []

    for batch_start in range(0, total_weeks, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total_weeks)
        batch_weeks = weeks[batch_start:batch_end]
        
        sys.stdout.write(f"\r  Batch {batch_start // BATCH_SIZE + 1} ... ")
        sys.stdout.flush()

        features = []
        for ws, we in batch_weeks:
            smap_week = smap.filterDate(ws, we)
            smap_reduced = smap_week.mean().reduceRegion(reducer=ee.Reducer.mean(), geometry=geom, scale=SCALE_METERS, maxPixels=1e9)
            grace_week = grace.filterDate(ws, we)
            grace_reduced = grace_week.mean().reduceRegion(reducer=ee.Reducer.mean(), geometry=geom, scale=SCALE_METERS, maxPixels=1e9)

            features.append(ee.Feature(None, {
                "date": ws,
                "sm_surface": ee.Algorithms.If(smap_week.size().gt(0), smap_reduced.get("sm_surface"), None),
                "sm_rootzone": ee.Algorithms.If(smap_week.size().gt(0), smap_reduced.get("sm_rootzone"), None),
                "lwe_thickness": ee.Algorithms.If(grace_week.size().gt(0), grace_reduced.get("lwe_thickness"), None),
            }))

        try:
            batch_info = ee.FeatureCollection(features).getInfo()
            for f in batch_info["features"]:
                props = f["properties"]
                results.append({
                    "date": props.get("date"),
                    "surface_soil_moisture": round(props["sm_surface"], 6) if props.get("sm_surface") is not None else None,
                    "rootzone_soil_moisture": round(props["sm_rootzone"], 6) if props.get("sm_rootzone") is not None else None,
                    "groundwater_anomaly": round(props["lwe_thickness"], 6) if props.get("lwe_thickness") is not None else None,
                })
        except Exception as e:
            print(f"\n  [!] Batch error. Skipping. {e}")

    print(f"\n  [OK] All weeks processed")

    # 7. Build Output Package
    print("\n[7/7] Generating Structured Project Package ...")
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    out_dir = os.path.join(base_dir, OUTPUT_DIR)
    
    # Recreate output dir
    if os.path.exists(out_dir):
        shutil.rmtree(out_dir)
    os.makedirs(out_dir)
    os.makedirs(os.path.join(out_dir, LAYERS_DIR))

    # Process DataFrame
    df = pd.DataFrame(results)
    df["date"] = pd.to_datetime(df["date"])
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    
    # Compute climatology
    weekly_clim = df.groupby("week_of_year")[["surface_soil_moisture", "rootzone_soil_moisture"]].mean().reset_index()
    weekly_clim.to_json(os.path.join(out_dir, CLIMATOLOGY_JSON), orient="records", indent=2)
    
    # Compute anomalies
    df["surface_sm_anomaly"] = df["surface_soil_moisture"] - df.groupby("week_of_year")["surface_soil_moisture"].transform("mean")
    df["rootzone_sm_anomaly"] = df["rootzone_soil_moisture"] - df.groupby("week_of_year")["rootzone_soil_moisture"].transform("mean")
    df.drop(columns=["week_of_year"], inplace=True)

    # Save CSV
    df.to_csv(os.path.join(out_dir, WEEKLY_CSV), index=False)
    
    # Save Timeline JSON
    # Convert dates to string for JSON serialization
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    df.to_json(os.path.join(out_dir, TIMELINE_JSON), orient="records", indent=2)

    # Save GeoJSON
    try:
        geojson_geom = geom.simplify(maxError=5000).getInfo()
        with open(os.path.join(out_dir, GEOMETRY_GEOJSON), "w") as f:
            json.dump({
                "type": "FeatureCollection",
                "features": [{
                    "type": "Feature",
                    "geometry": geojson_geom,
                    "properties": {"name": location_name}
                }]
            }, f, indent=2)
    except Exception:
        geojson_geom = None

    # Compute bounds and area
    try:
        area_sqkm = geom.area().getInfo() / 1e6
        bounds = geom.bounds().getInfo()
    except:
        area_sqkm = 0
        bounds = None

    # Save Metadata JSON
    metadata = {
        "location_name": location_name,
        "center": center_coords,
        "area_sqkm": round(area_sqkm, 2),
        "bounds": bounds,
        "start_date": start_date,
        "end_date": end_date
    }
    with open(os.path.join(out_dir, METADATA_JSON), "w") as f:
        json.dump(metadata, f, indent=2)
        
    # Save Analytics JSON (Mocked for now)
    analytics = {
        "hydrologicalHealthIndex": 7.2,
        "surfaceMoisturePercentile": 45,
        "rootZonePercentile": 60,
        "groundwaterTrend": "stable",
        "rechargeDelayWeeks": 8
    }
    with open(os.path.join(out_dir, ANALYTICS_JSON), "w") as f:
        json.dump(analytics, f, indent=2)

    # Save Insights JSON (Mocked for now)
    insights = [
        {"id": "1", "title": "Normal Recharge", "description": "Groundwater shows stable recharge patterns.", "type": "recharge", "severity": "low"}
    ]
    with open(os.path.join(out_dir, INSIGHTS_JSON), "w") as f:
        json.dump(insights, f, indent=2)

    # Save Events JSON (Mocked for now)
    events = [
        {"date": "2019-08-01", "type": "flood", "severity": "extreme"}
    ]
    with open(os.path.join(out_dir, EVENTS_JSON), "w") as f:
        json.dump(events, f, indent=2)
        
    # Dummy Layer file
    with open(os.path.join(out_dir, LAYERS_DIR, "placeholder.txt"), "w") as f:
        f.write("GeoTIFFs will be exported here in a future milestone.")

    print(f"  [OK] Structured package generated at: {out_dir}/")
    print(f"\n{'=' * 60}")
    print("Backend processing complete.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
