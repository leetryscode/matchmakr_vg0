import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { hexToRgba } from '@/config/theme';
import { palette } from '@/config/palette';

interface ImageCropperProps {
  image: string;
  onCropComplete: (croppedAreaPixels: Area) => void;
  onClose: () => void;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ image, onCropComplete, onClose }) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const interactionTimeout = useRef<number | null>(null);

  const bumpInteraction = useCallback(() => {
    setIsInteracting(true);
    if (interactionTimeout.current) {
      window.clearTimeout(interactionTimeout.current);
    }
    interactionTimeout.current = window.setTimeout(() => {
      setIsInteracting(false);
    }, 250);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (interactionTimeout.current) {
        window.clearTimeout(interactionTimeout.current);
      }
    };
  }, []);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
    bumpInteraction();
  }, [bumpInteraction]);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
    bumpInteraction();
  }, [bumpInteraction]);

  const handleCropComplete = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = () => {
    if (!croppedAreaPixels) return;
    onCropComplete(croppedAreaPixels);
  };

  return (
    <div className="w-full">
      <div className="relative w-full aspect-square bg-black/10 rounded-xl overflow-hidden">
        <div className="absolute inset-0">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropComplete}
          />
          {/* Rule-of-thirds grid overlay - only visible during interaction */}
          {isInteracting && (
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/20" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/20" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/20" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/20" />
            </div>
          )}
        </div>
      </div>
      <div className="w-full mt-6">
        <div className="flex items-center gap-3">
          <input
            id="zoom"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => {
              const newZoom = Number((e.target as HTMLInputElement).value);
              setZoom(newZoom);
              bumpInteraction();
            }}
            className="flex-1 h-1.5 bg-gray-200/70 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: hexToRgba(palette.primary.blue, 0.6) }}
          />
          {isInteracting && (
            <span className="text-xs text-gray-400 tabular-nums min-w-[3ch] text-right">
              {zoom.toFixed(1)}×
            </span>
          )}
        </div>
      </div>
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 h-11 rounded-xl border border-gray-200 bg-white text-gray-900 hover:bg-gray-50 transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!croppedAreaPixels}
          className="flex-1 h-11 rounded-xl bg-primary-blue/90 text-white hover:bg-primary-blue transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Use photo
        </button>
      </div>
    </div>
  );
};

export default ImageCropper; 