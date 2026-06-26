#!/bin/bash
# scripts/download_earth_textures.sh
# This script downloads public domain NASA/NOAA Earth texture assets into src/assets/earth/
# It uses curl to fetch images. Ensure you have internet connectivity.

set -e

ASSET_DIR="$(dirname "$0")/../src/assets/earth"
mkdir -p "$ASSET_DIR"

# URLs for textures (you may replace with newer versions)
DAY_URL="https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74523/world.topo.bathy.200406.3x5400x2700.jpg"
NIGHT_URL="https://eoimages.gsfc.nasa.gov/images/imagerecords/56000/56249/earth_lights_lrg.jpg"
CLOUDS_URL="https://eoimages.gsfc.nasa.gov/images/imagerecords/74000/74504/worldclouds_1024.jpg"
SPECULAR_URL="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/earth/specular.jpg"
NORMAL_URL="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/earth/normal.jpg"
ELEVATION_URL="https://raw.githubusercontent.com/creativetimofficial/public-assets/master/earth/elevation.png"

declare -A assets=(
  ["day.jpg"]="$DAY_URL"
  ["night.jpg"]="$NIGHT_URL"
  ["clouds.png"]="$CLOUDS_URL"
  ["specular.jpg"]="$SPECULAR_URL"
  ["normal.jpg"]="$NORMAL_URL"
  ["elevation.png"]="$ELEVATION_URL"
)

for name in "${!assets[@]}"; do
  target="$ASSET_DIR/$name"
  if [ -f "$target" ]; then
    echo "[skip] $name already exists"
  else
    echo "[download] $name"
    curl -L -o "$target" "${assets[$name]}"
  fi
done

echo "All textures are downloaded to $ASSET_DIR"
