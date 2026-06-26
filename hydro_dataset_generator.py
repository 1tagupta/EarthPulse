import ee
import pandas as pd
import datetime
import sys
import os
import json

# ---- Configuration ---------------------------------------------------------
OUTPUT_CSV = "weekly_hydro_data.csv"
METADATA_JSON = "dataset_metadata.json"

SMAP_COLLECTION = "NASA/SMAP/SPL4SMGP/008"
GRACE_COLLECTION = "NASA/GRACE/MASS_GRIDS_V04/MASCON_CRI"
GAUL_COLLECTION = "FAO/GAUL/2015/level1"

SCALE_METERS = 10000  # 10 km
BATCH_SIZE = 50       # Process this many weeks per server-side call


# ---- Main ------------------------------------------------------------------
def main():
    print("=" * 60)
    print("Global Weekly Soil Moisture & Groundwater Dataset Generator")
    print("              (Optimized Batch Processing)")
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
        
        # Check if region exists
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
        
        try:
            lat = float(lat_str)
            lon = float(lon_str)
            radius = float(radius_str)
        except ValueError:
            print("  [ERROR] Coordinates/Radius must be numbers.")
            sys.exit(1)
            
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
    else:
        print("  [ERROR] Invalid choice selected.")
        sys.exit(1)
        
    print(f"  [OK] Location loaded: '{location_name}'")

    # 3. Configure dates
    print("\n[3/7] Configuring date intervals...")
    start_date = input("Enter Start Date (YYYY-MM-DD) [default: 2015-01-01]: ").strip() or "2015-01-01"
    end_date = input("Enter End Date (YYYY-MM-DD) [default: 2025-12-31]: ").strip() or "2025-12-31"

    # 4. Load datasets
    print("\n[4/7] Loading SMAP L4 and GRACE collections...")
    smap = (
        ee.ImageCollection(SMAP_COLLECTION)
        .filterDate(start_date, end_date)
        .select(["sm_surface", "sm_rootzone"])
    )
    grace = (
        ee.ImageCollection(GRACE_COLLECTION)
        .filterDate(start_date, end_date)
        .select(["lwe_thickness"])
    )
    
    try:
        smap_count = smap.size().getInfo()
        grace_count = grace.size().getInfo()
        print(f"  [OK] SMAP images : {smap_count}")
        print(f"  [OK] GRACE images: {grace_count}")
    except Exception as e:
        print(f"  [ERROR] Failed to query collections: {e}")
        sys.exit(1)

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
    print(f"  [OK] {total_weeks} weekly intervals")

    # 6. Batch server-side processing
    print(f"\n[6/7] Processing in batches of {BATCH_SIZE} (server-side) ...")
    results = []

    for batch_start in range(0, total_weeks, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total_weeks)
        batch_weeks = weeks[batch_start:batch_end]

        pct = int((batch_start / total_weeks) * 100)
        sys.stdout.write(
            f"\r  Batch {batch_start // BATCH_SIZE + 1}/"
            f"{(total_weeks + BATCH_SIZE - 1) // BATCH_SIZE}  "
            f"({pct}%)  weeks {batch_start + 1}-{batch_end}/{total_weeks}   "
        )
        sys.stdout.flush()

        features = []
        for ws, we in batch_weeks:
            smap_week = smap.filterDate(ws, we)
            smap_count = smap_week.size()
            smap_mean = smap_week.mean()
            smap_reduced = smap_mean.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geom,
                scale=SCALE_METERS,
                maxPixels=1e9,
            )
            sm_surface_val = ee.Algorithms.If(smap_count.gt(0), smap_reduced.get("sm_surface"), None)
            sm_rootzone_val = ee.Algorithms.If(smap_count.gt(0), smap_reduced.get("sm_rootzone"), None)

            grace_week = grace.filterDate(ws, we)
            grace_count = grace_week.size()
            grace_mean = grace_week.mean()
            grace_reduced = grace_mean.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geom,
                scale=SCALE_METERS,
                maxPixels=1e9,
            )
            lwe_val = ee.Algorithms.If(grace_count.gt(0), grace_reduced.get("lwe_thickness"), None)

            feat = ee.Feature(None, {
                "date": ws,
                "sm_surface": sm_surface_val,
                "sm_rootzone": sm_rootzone_val,
                "lwe_thickness": lwe_val,
            })
            features.append(feat)

        batch_fc = ee.FeatureCollection(features)
        try:
            batch_info = batch_fc.getInfo()
            for f in batch_info["features"]:
                props = f["properties"]
                row = {
                    "date": props.get("date"),
                    "surface_soil_moisture": round(props["sm_surface"], 6) if props.get("sm_surface") is not None else None,
                    "rootzone_soil_moisture": round(props["sm_rootzone"], 6) if props.get("sm_rootzone") is not None else None,
                    "groundwater_anomaly": round(props["lwe_thickness"], 6) if props.get("lwe_thickness") is not None else None,
                }
                results.append(row)
        except Exception as e:
            print(f"\n  [!] Batch error at weeks {batch_start + 1}-{batch_end}: {e}")
            print("      Falling back to individual processing for this batch ...")
            for ws, we in batch_weeks:
                try:
                    smap_week = smap.filterDate(ws, we)
                    smap_mean = smap_week.mean()
                    smap_r = smap_mean.reduceRegion(
                        reducer=ee.Reducer.mean(),
                        geometry=geom,
                        scale=SCALE_METERS,
                        maxPixels=1e9,
                    ).getInfo()

                    grace_week = grace.filterDate(ws, we)
                    grace_mean = grace_week.mean()
                    grace_r = grace_mean.reduceRegion(
                        reducer=ee.Reducer.mean(),
                        geometry=geom,
                        scale=SCALE_METERS,
                        maxPixels=1e9,
                    ).getInfo()

                    results.append({
                        "date": ws,
                        "surface_soil_moisture": round(smap_r.get("sm_surface"), 6) if smap_r.get("sm_surface") is not None else None,
                        "rootzone_soil_moisture": round(smap_r.get("sm_rootzone"), 6) if smap_r.get("sm_rootzone") is not None else None,
                        "groundwater_anomaly": round(grace_r.get("lwe_thickness"), 6) if grace_r.get("lwe_thickness") is not None else None,
                    })
                except Exception as e2:
                    results.append({
                        "date": ws,
                        "surface_soil_moisture": None,
                        "rootzone_soil_moisture": None,
                        "groundwater_anomaly": None,
                    })

    print(f"\n  [OK] All {total_weeks} weeks processed")

    # 7. Build DataFrame, Export CSV, and Save Metadata JSON
    print("\n[7/7] Saving dataset and metadata ...")
    df = pd.DataFrame(results)
    df["date"] = pd.to_datetime(df["date"])

    # Compute anomalies (deviation from weekly long-term mean)
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    
    # Calculate weekly climatological mean conditionally
    weekly_clim = df.groupby("week_of_year")[
        ["surface_soil_moisture", "rootzone_soil_moisture"]
    ].transform("mean")
    
    df["surface_sm_anomaly"] = df["surface_soil_moisture"] - weekly_clim["surface_soil_moisture"]
    df["rootzone_sm_anomaly"] = df["rootzone_soil_moisture"] - weekly_clim["rootzone_soil_moisture"]
    df.drop(columns=["week_of_year"], inplace=True)

    filled = df["surface_soil_moisture"].notna().sum()
    print(f"  [OK] {len(df)} weeks total, {filled} with SMAP data")

    # Save CSV
    out_csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUTPUT_CSV)
    df.to_csv(out_csv_path, index=False)
    print(f"  [OK] CSV saved -> {out_csv_path}")

    # Simplify geometry to ~5km to keep GeoJSON lightweight
    simplified_geom = geom.simplify(maxError=5000)
    try:
        geojson_geom = simplified_geom.getInfo()
    except Exception as e:
        print(f"  [!] Could not export simplified GeoJSON boundary: {e}")
        geojson_geom = None

    # Write metadata JSON
    metadata = {
        "location_name": location_name,
        "center": center_coords,
        "geojson": geojson_geom
    }
    
    out_json_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), METADATA_JSON)
    with open(out_json_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"  [OK] Location metadata JSON saved -> {out_json_path}")

    print(f"\n{'=' * 60}")
    print("Done! Open the index.html dashboard to view the dynamic map & charts.")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
