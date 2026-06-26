import React, { useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import { StudyAreaService } from '@/services/StudyAreaService';
import { useLocationStore } from '@/stores/useLocationStore';

export default function GeometryUploader() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setSelectedLocation = useLocationStore((state) => state.setCurrentLocation);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Trigger parsing service
    const studyArea = await StudyAreaService.parseGeoJSON(file);
    
    // Set to location store (mocking Location interface conversion)
    setSelectedLocation({
      id: studyArea.id,
      name: studyArea.name,
      country: 'Custom Geometry',
      coordinates: {
        lat: studyArea.center.lat,
        lon: studyArea.center.lon,
        x: 0, y: 0, z: 2 // Mock 3D coords for now
      }
    });
  };

  return (
    <div className="flex flex-col items-center gap-2 mt-4">
      <input 
        type="file" 
        accept=".geojson,.zip,.kml" 
        ref={fileInputRef} 
        onChange={handleFileUpload}
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-full text-sm text-gray-300 transition-colors backdrop-blur-md"
      >
        <UploadCloud size={16} />
        Upload GeoJSON / Shapefile
      </button>
    </div>
  );
}
