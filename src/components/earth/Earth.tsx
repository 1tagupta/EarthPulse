import React, { useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader, AdditiveBlending, BackSide, Mesh, Group } from 'three';
import { Stars, OrbitControls } from '@react-three/drei';
import { useAppStore } from '@/stores/useAppStore';
import { useCameraStore } from '@/stores/useCameraStore';
import * as THREE from 'three';

export default function Earth() {
  const earthRef = useRef<Mesh>(null);
  const cloudsRef = useRef<Mesh>(null);
  
  const appState = useAppStore((state) => state.phase);
  const cameraTarget = useCameraStore((state) => state.target);

  // Load textures
  const [colorMap, normalMap, specularMap, cloudsMap] = useLoader(TextureLoader, [
    '/textures/earth_atmos_2048.jpg',
    '/textures/earth_normal_2048.jpg',
    '/textures/earth_specular_2048.jpg',
    '/textures/earth_clouds_1024.png',
  ]);

  // Rotations
  useFrame(({ clock, camera }) => {
    const elapsedTime = clock.getElapsedTime();
    
    // Slow natural rotation of clouds (earth rotation handled by OrbitControls autoRotate)
    if (cloudsRef.current) {
      cloudsRef.current.rotation.y = elapsedTime * 0.005; 
    }

    // Camera animation handling
    if (appState === 'transition' && cameraTarget) {
      camera.position.lerp(new THREE.Vector3(cameraTarget.x, cameraTarget.y, cameraTarget.z), 0.02);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} />
      <directionalLight 
        position={[5, 3, 5]} 
        intensity={2.5} 
        color="#ffffff"
      />

      <Stars radius={300} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <OrbitControls 
        enablePan={false}
        enableZoom={true}
        minDistance={2.5}
        maxDistance={12}
        enableDamping={true}
        dampingFactor={0.05}
        autoRotate={appState === 'landing'}
        autoRotateSpeed={0.5}
      />

      <group>
        <mesh ref={earthRef}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshStandardMaterial 
            map={colorMap} 
            normalMap={normalMap}
            roughnessMap={specularMap} 
            roughness={0.8}
            metalness={0.1}
          />
        </mesh>

        <mesh ref={cloudsRef} scale={[1.005, 1.005, 1.005]}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshStandardMaterial 
            map={cloudsMap}
            transparent={true}
            opacity={0.4}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>

        <mesh scale={[1.02, 1.02, 1.02]}>
          <sphereGeometry args={[2, 64, 64]} />
          <meshBasicMaterial 
            color="#4B90FF" 
            transparent={true} 
            opacity={0.15} 
            side={BackSide} 
            blending={AdditiveBlending} 
          />
        </mesh>
      </group>
    </>
  );
}
