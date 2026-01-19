import React, { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  onClose: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onClose }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    if (!croppedAreaPixels) return;
    onCropComplete(croppedAreaPixels);
  };

  return (
    <div className="w-full">
      <div className="relative w-full aspect-square bg-gray-900 rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
          />
        </div>
      </div>
      <div className="w-full mt-4">
        <label htmlFor="zoom" className="block text-sm font-medium text-gray-700 mb-1">Zoom</label>
        <input
          id="zoom"
          type="range"
          min={1}
          max={3}
          step={0.1}
          value={zoom}
          onChange={(e) => setZoom(Number((e.target as HTMLInputElement).value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
      </div>
      <div className="flex justify-end gap-4 mt-4">
        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!croppedAreaPixels}
          className="px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default ImageCropper; 