import { Suspense, useRef, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, BackSide, Mesh, Vector3, TextureLoader } from 'three';
import { Stars, OrbitControls } from '@react-three/drei';
import { useAppStore } from '@/stores/useAppStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProjectStore } from '@/stores/useProjectStore';
import * as THREE from 'three';

// Texture URLs served from /public/earth/ — fetched at runtime, never imported.
const TEX = {
  day:       '/earth/day.jpg',
  night:     '/earth/night.jpg',
  normal:    '/earth/normal.jpg',
  specular:  '/earth/specular.jpg',
  clouds:    '/earth/clouds.png',
  elevation: '/earth/elevation.png',
};

// Create a 1×1 white fallback texture so materials never receive `undefined`.
function makeFallback(color = '#888888'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
}

// Load a single texture with a fallback on error.
function loadTex(
  loader: TextureLoader,
  url: string,
  fallbackColor = '#888888',
  onLoad: (t: THREE.Texture) => void,
  colorSpace: THREE.ColorSpace = THREE.NoColorSpace
) {
  loader.load(
    url,
    (t) => {
      t.colorSpace = colorSpace;
      onLoad(t);
    },
    undefined,
    (err) => {
      console.warn(`[Earth] Failed to load texture ${url}:`, err);
      onLoad(makeFallback(fallbackColor));
    }
  );
}

// ---------------------------------------------------------------------------
// Inner mesh — lives inside Canvas. Loads textures imperatively so a single
// bad texture never crashes the component.
// ---------------------------------------------------------------------------
function EarthMesh() {
  const earthRef    = useRef<Mesh>(null);
  const cloudsRef   = useRef<Mesh>(null);
  const controlsRef = useRef<any>(null);

  const { camera, gl } = useThree();
  const appState            = useAppStore((s) => s.phase);
  const setAppState         = useAppStore((s) => s.setPhase);
  const cameraTarget        = useCameraStore((s) => s.target);
  const isCameraFlying      = useCameraStore((s) => s.isFlying);
  const setIsCameraFlying   = useCameraStore((s) => s.setIsFlying);
  const selectedLocation    = useLocationStore((s) => s.currentLocation);
  const setSelectedLocation = useLocationStore((s) => s.setCurrentLocation);
  const setCameraTarget     = useCameraStore((s) => s.setTarget);
  const projectGeometry     = useProjectStore((s) => s.geometry);

  // Texture state — initialised to fallbacks immediately so rendering can begin.
  const [dayMap,  setDayMap]  = useState<THREE.Texture>(() => makeFallback('#1a2a4a'));
  const [nightMap, setNightMap]   = useState<THREE.Texture>(() => makeFallback('#000010'));
  const [normalMap, setNormalMap] = useState<THREE.Texture>(() => makeFallback('#8080ff'));
  const [specularMap, setSpecularMap] = useState<THREE.Texture>(() => makeFallback('#333333'));
  const [cloudsMap,  setCloudsMap]  = useState<THREE.Texture>(() => makeFallback('#ffffff'));
  const [elevMap,  setElevMap]  = useState<THREE.Texture>(() => makeFallback('#808080'));

  // Load all textures imperatively, with fallbacks.
  useEffect(() => {
    const loader = new TextureLoader();
    const maxA   = gl.capabilities.getMaxAnisotropy();

    const wrap = (setter: (t: THREE.Texture) => void) =>
      (t: THREE.Texture) => { t.anisotropy = maxA; setter(t); };

    loadTex(loader, TEX.day,       '#1a2a4a', wrap(setDayMap),      THREE.SRGBColorSpace);
    loadTex(loader, TEX.night,     '#000010', wrap(setNightMap),     THREE.SRGBColorSpace);
    loadTex(loader, TEX.normal,    '#8080ff', wrap(setNormalMap),    THREE.NoColorSpace);
    loadTex(loader, TEX.specular,  '#333333', wrap(setSpecularMap),  THREE.NoColorSpace);
    loadTex(loader, TEX.clouds,    '#ffffff', wrap(setCloudsMap),    THREE.SRGBColorSpace);
    loadTex(loader, TEX.elevation, '#808080', wrap(setElevMap),      THREE.NoColorSpace);
  }, [gl]);

  // Flight state ref
  const flight = useRef({
    startPos:  new THREE.Vector3(),
    endPos:    new THREE.Vector3(),
    duration:  2800,
    startTime: 0,
  });

  // Trigger cinematic flight on transition
  useEffect(() => {
    if (appState === 'transition' && cameraTarget) {
      flight.current.startPos.copy(camera.position);
      flight.current.endPos.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
      flight.current.startTime = performance.now();
      setIsCameraFlying(true);
      if (controlsRef.current) controlsRef.current.enabled = false;
    }
  }, [appState, cameraTarget]); // eslint-disable-line

  // Study area boundary geometry
  const boundaryGeom = useMemo(() => {
    let coords: number[][] | null = null;

    if (projectGeometry?.features?.[0]) {
      const feat = projectGeometry.features[0];
      if (feat.geometry?.type === 'Polygon') coords = feat.geometry.coordinates[0];
    } else if (selectedLocation?.boundingBox) {
      const [minlat, maxlat, minlon, maxlon] = selectedLocation.boundingBox;
      coords = [
        [minlon, minlat], [maxlon, minlat],
        [maxlon, maxlat], [minlon, maxlat],
        [minlon, minlat],
      ];
    }

    if (!coords) return null;
    const R = 2.012;
    const pts = coords.map(([lon, lat]) => {
      const phi   = (lat * Math.PI) / 180;
      const theta = (lon * Math.PI) / 180;
      return new Vector3(
        -R * Math.cos(phi) * Math.sin(theta),
         R * Math.sin(phi),
         R * Math.cos(phi) * Math.cos(theta),
      );
    });
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [projectGeometry, selectedLocation]);

  // Per-frame animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (cloudsRef.current) cloudsRef.current.rotation.y = t * 0.006;

    if (
      earthRef.current &&
      (appState === 'landing' || appState === 'workspace') &&
      !isCameraFlying &&
      controlsRef.current?.state === -1
    ) {
      earthRef.current.rotation.y = t * 0.005;
    }

    if (appState === 'transition' && isCameraFlying) {
      const raw   = Math.min(1.0, (performance.now() - flight.current.startTime) / flight.current.duration);
      const eased = raw < 0.5
        ? 4 * raw ** 3
        : 1 - (-2 * raw + 2) ** 3 / 2;

      const uA  = flight.current.startPos.clone().normalize();
      const uB  = flight.current.endPos.clone().normalize();
      const dot  = Math.max(-1, Math.min(1, uA.dot(uB)));
      const omega = Math.acos(dot);
      const dir  = new THREE.Vector3();

      if (omega > 0.001) {
        const sinW = Math.sin(omega);
        dir.copy(uA).multiplyScalar(Math.sin((1 - eased) * omega) / sinW)
           .addScaledVector(uB, Math.sin(eased * omega) / sinW);
      } else {
        dir.copy(uA).lerp(uB, eased).normalize();
      }

      const rA     = flight.current.startPos.length();
      const rB     = flight.current.endPos.length();
      const bulge  = 4.0 * (omega / Math.PI);
      const radius = (1 - eased) * rA + eased * rB + bulge * Math.sin(Math.PI * eased);

      camera.position.copy(dir).multiplyScalar(radius);
      camera.lookAt(0, 0, 0);

      if (raw >= 1.0) {
        setIsCameraFlying(false);
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      }
    }
  });

  // Click-to-globe → reverse geocode
  const handleClick = (e: any) => {
    if (appState === 'transition' || isCameraFlying) return;
    e.stopPropagation();
    const pt = e.point as THREE.Vector3;
    const R  = 2.0;
    const lat = Math.asin(pt.y / R) * (180 / Math.PI);
    const lon = Math.atan2(-pt.x, pt.z) * (180 / Math.PI);

    fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`,
      { headers: { 'User-Agent': 'EarthPulse/1.0' } }
    )
      .then((r) => r.json())
      .then((data) => {
        const addr = data.address ?? {};
        const name = addr.city ?? addr.town ?? addr.municipality ?? addr.state
          ?? addr.country ?? `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
        const bbox = data.boundingbox
          ? data.boundingbox.map(parseFloat) as [number, number, number, number]
          : [lat - 0.5, lat + 0.5, lon - 0.5, lon + 0.5] as [number, number, number, number];

        const loc = {
          id:          String(data.place_id ?? Date.now()),
          name,
          country:     addr.country ?? 'Global',
          coordinates: { lat, lon, x: pt.x * 2.25, y: pt.y * 2.25, z: pt.z * 2.25 },
          boundingBox: bbox,
          adminLevel:  data.type ?? data.class ?? 'point',
        };
        setSelectedLocation(loc);
        setCameraTarget({ x: pt.x * 2.25, y: pt.y * 2.25, z: pt.z * 2.25 });
        setAppState('transition');
      })
      .catch((err) => console.error('[EarthPulse] reverse geocode failed:', err));
  };

  return (
    <>
      <ambientLight intensity={0.06} />
      <directionalLight position={[5, 3, 5]} intensity={2.6} color="#fff8f0" castShadow={false} />

      <Stars radius={300} depth={80} count={8000} factor={5} saturation={0.2} fade speed={1} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom
        minDistance={2.4}
        maxDistance={12}
        enableDamping
        dampingFactor={0.06}
        autoRotate={appState === 'landing' && !isCameraFlying}
        autoRotateSpeed={0.35}
      />

      <group>
        {/* ── Earth surface ── */}
        <mesh ref={earthRef} onClick={handleClick}>
          <sphereGeometry args={[2, 96, 96]} />
          <meshStandardMaterial
            map={dayMap}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(0.6, 0.6)}
            roughnessMap={specularMap}
            roughness={0.75}
            metalness={0.0}
            emissiveMap={nightMap}
            emissive={new THREE.Color(1.0, 0.85, 0.5)}
            emissiveIntensity={0.4}
            displacementMap={elevMap}
            displacementScale={0.015}
          />
        </mesh>

        {/* ── Study area boundary ── */}
        {boundaryGeom && (
          <lineLoop geometry={boundaryGeom}>
            <lineBasicMaterial color="#00f3ff" transparent opacity={0.85} />
          </lineLoop>
        )}

        {/* ── Cloud layer ── */}
        <mesh ref={cloudsRef} scale={[1.016, 1.016, 1.016]}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshStandardMaterial
            map={cloudsMap}
            transparent
            opacity={0.38}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* ── Atmospheric outer glow ── */}
        <mesh scale={[1.045, 1.045, 1.045]}>
          <sphereGeometry args={[2, 48, 48]} />
          <meshPhysicalMaterial
            color="#6ab8ff"
            transparent
            opacity={0.09}
            side={BackSide}
            depthWrite={false}
          />
        </mesh>

        {/* ── Inner horizon haze ── */}
        <mesh scale={[1.015, 1.015, 1.015]}>
          <sphereGeometry args={[2, 48, 48]} />
          <meshStandardMaterial
            color="#3377ff"
            transparent
            opacity={0.05}
            side={BackSide}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  );
}

// ---------------------------------------------------------------------------
// Public export — wrapped in Suspense so it never crashes the error boundary.
// ---------------------------------------------------------------------------
export default function Earth() {
  return (
    <Suspense fallback={null}>
      <EarthMesh />
    </Suspense>
  );
}
