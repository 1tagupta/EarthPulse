import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { TextureLoader, AdditiveBlending, BackSide, Mesh, Vector3 } from 'three';
import { Stars, OrbitControls } from '@react-three/drei';
import { useAppStore } from '@/stores/useAppStore';
import { useCameraStore } from '@/stores/useCameraStore';
import { useLocationStore } from '@/stores/useLocationStore';
import { useProjectStore } from '@/stores/useProjectStore';
import * as THREE from 'three';

// Custom Earth Shader for Day/Night blending, ocean reflection, and horizon glow
const EarthShader = {
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vViewPosition;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      vViewPosition = -mvPosition.xyz;
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D dayTexture;
    uniform sampler2D nightTexture;
    uniform sampler2D normalTexture;
    uniform sampler2D specularTexture;
    uniform vec3 sunDirection;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldNormal;
    varying vec3 vViewPosition;

    void main() {
      // Normal mapping calculation (using perturbation based on normal map)
      vec3 normalMapVal = texture2D(normalTexture, vUv).xyz * 2.0 - 1.0;
      
      // Compute derivatives to construct TBN matrix without pre-computed attributes
      vec3 q0 = dFdx(vViewPosition);
      vec3 q1 = dFdy(vViewPosition);
      vec2 st0 = dFdx(vUv);
      vec2 st1 = dFdy(vUv);
      
      vec3 N = normalize(vNormal);
      vec3 T = normalize(q0 * st1.t - q1 * st0.t);
      vec3 B = -normalize(cross(N, T));
      mat3 TBN = mat3(T, B, N);
      
      // Perturbed normal in view space
      vec3 perturbedNormal = normalize(TBN * normalMapVal);
      
      // Calculate light direction in world space
      vec3 worldNormal = normalize(vWorldNormal);
      float dotNL = dot(worldNormal, sunDirection);
      
      // Day/Night transition mixing
      float dayFactor = smoothstep(-0.15, 0.15, dotNL);
      
      vec4 dayCol = texture2D(dayTexture, vUv);
      vec4 nightCol = texture2D(nightTexture, vUv);
      
      // In shadowed areas, city lights are visible. Boost night lights for neon feel.
      vec3 blendedDiffuse = mix(nightCol.rgb * 2.2, dayCol.rgb, dayFactor);
      
      // Specular reflections on oceans (water is reflective, land is matte)
      float specMask = texture2D(specularTexture, vUv).r;
      float specPower = 0.0;
      if (dotNL > 0.0) {
        // Specular highlight: Blinn-Phong model in view space
        vec3 viewNormal = perturbedNormal;
        vec3 viewLightDir = normalize(vec3(0.3, 0.5, 0.8)); // Approximate light direction in view space
        vec3 V = normalize(vViewPosition);
        vec3 H = normalize(viewLightDir + V);
        float dotNH = max(dot(viewNormal, H), 0.0);
        specPower = pow(dotNH, 32.0) * specMask * 0.8;
      }
      
      vec3 finalColor = blendedDiffuse + vec3(specPower * dayFactor);
      
      // Add a subtle blue atmospheric scatter color at the edge of the planet's daylight horizon
      float fresnelEdge = 1.0 - max(dot(N, vec3(0.0, 0.0, 1.0)), 0.0);
      vec3 horizonGlow = vec3(0.3, 0.6, 1.0) * pow(fresnelEdge, 5.0) * dayFactor * 0.4;
      finalColor += horizonGlow;
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// Atmospheric outer glow shader using Fresnel effect
const AtmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    void main() {
      // Glow is stronger at the edges (Fresnel effect)
      float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
      gl_FragColor = vec4(0.35, 0.65, 1.0, 1.0) * intensity;
    }
  `
};

export default function Earth() {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);
  const controlsRef = useRef<any>(null);
  
  const { camera } = useThree();
  const appState = useAppStore((state) => state.phase);
  const setAppState = useAppStore((state) => state.setPhase);
  const cameraTarget = useCameraStore((state) => state.target);
  const isCameraFlying = useCameraStore((state) => state.isFlying);
  const setIsCameraFlying = useCameraStore((state) => state.setIsFlying);
  const selectedLocation = useLocationStore((state) => state.currentLocation);
  const setSelectedLocation = useLocationStore((state) => state.setCurrentLocation);
  const setCameraTarget = useCameraStore((state) => state.setTarget);

  const projectGeometry = useProjectStore((state) => state.geometry);

  // Load textures (Day, Normal, Specular, Clouds, Night Lights)
  const [colorMap, normalMap, specularMap, cloudsMap, lightsMap] = useLoader(TextureLoader, [
    '/textures/earth_atmos_2048.jpg',
    '/textures/earth_normal_2048.jpg',
    '/textures/earth_specular_2048.jpg',
    '/textures/earth_clouds_1024.png',
    '/textures/earth_lights_2048.png',
  ]);

  // Configure textures
  useEffect(() => {
    colorMap.colorSpace = THREE.SRGBColorSpace;
    lightsMap.colorSpace = THREE.SRGBColorSpace;
  }, [colorMap, lightsMap]);

  // Shader Uniforms Ref
  const earthUniforms = useRef({
    dayTexture: { value: colorMap },
    nightTexture: { value: lightsMap },
    normalTexture: { value: normalMap },
    specularTexture: { value: specularMap },
    sunDirection: { value: new THREE.Vector3(5, 3, 5).normalize() }
  });

  // Track flight trajectory state
  const flightState = useRef({
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    duration: 2500, // 2.5 seconds flight
    startTime: 0,
  });

  // Monitor target transitions and trigger flight slerp setup
  useEffect(() => {
    if (appState === 'transition' && cameraTarget) {
      flightState.current.startPos.copy(camera.position);
      flightState.current.endPos.set(cameraTarget.x, cameraTarget.y, cameraTarget.z);
      flightState.current.startTime = performance.now();
      setIsCameraFlying(true);
      
      // Temporarily disable OrbitControls to let the interpolation drive the camera
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
    }
  }, [appState, cameraTarget, setIsCameraFlying]);

  // Project boundary geometry onto a sphere of radius 2.01 (sits slightly above Earth surface)
  const projectedBoundary = useMemo(() => {
    let coordinates: any = null;
    
    if (projectGeometry && projectGeometry.features && projectGeometry.features[0]) {
      const feat = projectGeometry.features[0];
      if (feat.geometry && feat.geometry.type === 'Polygon') {
        coordinates = feat.geometry.coordinates[0];
      }
    } else if (selectedLocation && selectedLocation.boundingBox) {
      // Use bounding box fallback if GeoJSON not loaded yet
      const [minlat, maxlat, minlon, maxlon] = selectedLocation.boundingBox;
      coordinates = [
        [minlon, minlat],
        [maxlon, minlat],
        [maxlon, maxlat],
        [minlon, maxlat],
        [minlon, minlat]
      ];
    }

    if (!coordinates) return null;

    const R = 2.01;
    const points: Vector3[] = [];
    for (const pt of coordinates) {
      const lon = pt[0];
      const lat = pt[1];
      
      const phi = (lat * Math.PI) / 180;
      const theta = (lon * Math.PI) / 180;
      
      // Project to 3D Cartesian coordinates
      const x = -R * Math.cos(phi) * Math.sin(theta);
      const y = R * Math.sin(phi);
      const z = R * Math.cos(phi) * Math.cos(theta);
      points.push(new Vector3(x, y, z));
    }
    
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [projectGeometry, selectedLocation]);

  // Frame loop for camera flights, slow orbits, and cloud movements
  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime();
    
    // Slow natural clouds rotation
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = elapsedTime * 0.004; 
    }

    // Slow ambient rotation of Earth during landing or workspace (if not interacting)
    if (earthRef.current && (appState === 'landing' || appState === 'workspace') && !isCameraFlying) {
      // Only rotate automatically if user is not dragging
      if (controlsRef.current && controlsRef.current.state === -1) {
        earthRef.current.rotation.y = elapsedTime * 0.01;
      }
    }

    // Dynamic Slerp Camera Animation
    if (appState === 'transition' && isCameraFlying) {
      const now = performance.now();
      const elapsed = now - flightState.current.startTime;
      const progress = Math.min(1.0, elapsed / flightState.current.duration);

      // cubic ease-in-out curve
      const easedT = progress < 0.5 
        ? 4 * progress * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      const uA = flightState.current.startPos.clone().normalize();
      const uB = flightState.current.endPos.clone().normalize();

      // Compute angle between starting and ending vectors
      let dot = uA.dot(uB);
      dot = Math.max(-1, Math.min(1, dot));
      const omega = Math.acos(dot);

      // Interpolated direction using spherical linear interpolation (slerp)
      const currentDir = new THREE.Vector3();
      if (omega > 0.001) {
        const sinOmega = Math.sin(omega);
        const scaleA = Math.sin((1 - easedT) * omega) / sinOmega;
        const scaleB = Math.sin(easedT * omega) / sinOmega;
        currentDir.copy(uA).multiplyScalar(scaleA).addScaledVector(uB, scaleB);
      } else {
        currentDir.copy(uA).lerp(uB, easedT).normalize();
      }

      // Parabolic zoom altitude arc: zooms camera out during the mid-flight
      const startRadius = flightState.current.startPos.length();
      const endRadius = flightState.current.endPos.length();
      const heightFactor = 4.0 * (omega / Math.PI); // Peak zoom height scales with angular distance
      const currentRadius = (1 - easedT) * startRadius + easedT * endRadius + heightFactor * Math.sin(Math.PI * easedT);

      // Apply coordinates and align camera facing the origin (0,0,0)
      camera.position.copy(currentDir).multiplyScalar(currentRadius);
      camera.lookAt(0, 0, 0);

      if (progress >= 1.0) {
        setIsCameraFlying(false);
        if (controlsRef.current) {
          controlsRef.current.enabled = true;
          // Set target to origin so camera orbits correctly
          controlsRef.current.target.set(0, 0, 0);
          controlsRef.current.update();
        }
      }
    }
  });

  // Handle Raycast click to select new coordinate on the globe directly
  const handleGlobeClick = (event: any) => {
    if (appState === 'transition' || isCameraFlying) return;
    
    // Stop propagation so controls don't interpret this as drag
    event.stopPropagation();

    const point = event.point; // THREE.Vector3 intersection coordinate
    const radius = 2.0;

    // Convert 3D coordinate back to polar coordinates
    const lat = Math.asin(point.y / radius) * (180 / Math.PI);
    const lon = Math.atan2(-point.x, point.z) * (180 / Math.PI);

    // Call Nominatim reverse geocode to fetch real address details for the click location
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, {
      headers: { 'User-Agent': 'EarthPulse App' }
    })
      .then((res) => res.json())
      .then((data) => {
        const addr = data.address || {};
        const name = addr.city || addr.town || addr.municipality || addr.state || addr.country || `Point (${lat.toFixed(2)}, ${lon.toFixed(2)})`;
        const country = addr.country || 'Global';
        const bbox = data.boundingbox 
          ? [parseFloat(data.boundingbox[0]), parseFloat(data.boundingbox[1]), parseFloat(data.boundingbox[2]), parseFloat(data.boundingbox[3])] as [number, number, number, number]
          : [lat - 0.5, lat + 0.5, lon - 0.5, lon + 0.5] as [number, number, number, number];

        // Trigger cinematic camera jump to the clicked coordinates
        const targetLocation = {
          id: String(data.place_id || Date.now()),
          name,
          country,
          coordinates: { lat, lon, x: point.x * 2.25, y: point.y * 2.25, z: point.z * 2.25 },
          boundingBox: bbox,
          adminLevel: data.type || data.class || 'point'
        };

        setSelectedLocation(targetLocation);
        setCameraTarget({ x: point.x * 2.25, y: point.y * 2.25, z: point.z * 2.25 });
        setAppState('transition');
      })
      .catch((err) => {
        console.error('Error reverse geocoding clicked point:', err);
      });
  };

  return (
    <>
      <ambientLight intensity={0.05} />
      
      {/* Sunlight source placed in fixed coordinate space to illuminate the sphere */}
      <directionalLight 
        position={[5, 3, 5]} 
        intensity={2.8} 
        color="#ffffff"
      />

      {/* High-quality starfield environment with depth */}
      <Stars 
        radius={250} 
        depth={60} 
        count={7000} 
        factor={5} 
        saturation={0.3} 
        fade 
        speed={1.2} 
      />

      <OrbitControls 
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        minDistance={2.4}
        maxDistance={10}
        enableDamping={true}
        dampingFactor={0.05}
        autoRotate={appState === 'landing' && !isCameraFlying}
        autoRotateSpeed={0.4}
      />

      <group>
        {/* Core Earth Mesh with custom Day/Night ShaderMaterial */}
        <mesh ref={earthRef} onClick={handleGlobeClick}>
          <sphereGeometry args={[2, 64, 64]} />
          <shaderMaterial
            vertexShader={EarthShader.vertexShader}
            fragmentShader={EarthShader.fragmentShader}
            uniforms={earthUniforms.current}
          />
        </mesh>

        {/* Dynamic Glowing Region Boundary Layer */}
        {projectedBoundary && (
          <lineLoop geometry={projectedBoundary}>
            <lineBasicMaterial color="#00f3ff" linewidth={2.5} transparent opacity={0.8} />
          </lineLoop>
        )}

        {/* Floating clouds mesh with additive blending */}
        <mesh ref={cloudsRef} scale={[1.008, 1.008, 1.008]}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshStandardMaterial 
            map={cloudsMap}
            transparent={true}
            opacity={0.35}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        {/* Atmosphere outer glow mesh with custom Fresnel shader */}
        <mesh scale={[1.025, 1.025, 1.025]}>
          <sphereGeometry args={[2, 64, 64]} />
          <shaderMaterial
            vertexShader={AtmosphereShader.vertexShader}
            fragmentShader={AtmosphereShader.fragmentShader}
            blending={AdditiveBlending}
            side={BackSide}
            transparent={true}
          />
        </mesh>
      </group>
    </>
  );
}
