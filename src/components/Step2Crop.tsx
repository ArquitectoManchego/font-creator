'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropBox } from '@/lib/types';
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, Maximize2, Trash2 } from 'lucide-react';

interface Step2CropProps {
  imageSrc: string;
  initialCrop?: CropBox;
  onCropComplete: (croppedCanvas: HTMLCanvasElement, cropBox: CropBox) => void;
  onPrevStep: () => void;
}

type HandleType = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move' | null;

export const Step2Crop: React.FC<Step2CropProps> = ({
  imageSrc,
  initialCrop,
  onCropComplete,
  onPrevStep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });

  // Crop rectangle in normalized [0..1] coordinates
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number }>({
    x: 0.1,
    y: 0.25,
    w: 0.8,
    h: 0.5,
  });

  const [activeHandle, setActiveHandle] = useState<HandleType>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; crop: typeof crop } | null>(null);

  // Initialize crop from initialCrop if present
  useEffect(() => {
    if (initialCrop && naturalSize.width > 0 && naturalSize.height > 0) {
      setCrop({
        x: Math.max(0, initialCrop.x / naturalSize.width),
        y: Math.max(0, initialCrop.y / naturalSize.height),
        w: Math.min(1, initialCrop.width / naturalSize.width),
        h: Math.min(1, initialCrop.height / naturalSize.height),
      });
    }
  }, [initialCrop, naturalSize]);

  // Update display dimensions on resize
  const updateDisplaySize = useCallback(() => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    setDisplaySize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateDisplaySize);
    return () => window.removeEventListener('resize', updateDisplaySize);
  }, [updateDisplaySize]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setImgLoaded(true);
    setTimeout(updateDisplaySize, 50);
  };

  // Mouse / Touch handlers for dragging and resizing crop box
  const handlePointerDown = (handle: HandleType, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setActiveHandle(handle);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      crop: { ...crop },
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !dragStart || displaySize.width === 0 || displaySize.height === 0) return;

    const dx = (e.clientX - dragStart.x) / displaySize.width;
    const dy = (e.clientY - dragStart.y) / displaySize.height;
    const initial = dragStart.crop;

    let nx = initial.x;
    let ny = initial.y;
    let nw = initial.w;
    let nh = initial.h;

    const minSize = 0.05;

    if (activeHandle === 'move') {
      nx = Math.max(0, Math.min(1 - nw, initial.x + dx));
      ny = Math.max(0, Math.min(1 - nh, initial.y + dy));
    } else {
      // East handles
      if (activeHandle.includes('e')) {
        nw = Math.max(minSize, Math.min(1 - nx, initial.w + dx));
      }
      // West handles
      if (activeHandle.includes('w')) {
        const potentialX = initial.x + dx;
        const potentialW = initial.w - dx;
        if (potentialW >= minSize && potentialX >= 0) {
          nx = potentialX;
          nw = potentialW;
        }
      }
      // South handles
      if (activeHandle.includes('s')) {
        nh = Math.max(minSize, Math.min(1 - ny, initial.h + dy));
      }
      // North handles
      if (activeHandle.includes('n')) {
        const potentialY = initial.y + dy;
        const potentialH = initial.h - dy;
        if (potentialH >= minSize && potentialY >= 0) {
          ny = potentialY;
          nh = potentialH;
        }
      }
    }

    setCrop({ x: nx, y: ny, w: nw, h: nh });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
      setActiveHandle(null);
      setDragStart(null);
    }
  };

  const handleResetCrop = () => {
    setCrop({ x: 0.05, y: 0.1, w: 0.9, h: 0.8 });
  };

  const handleSelectFull = () => {
    setCrop({ x: 0, y: 0, w: 1, h: 1 });
  };

  const handleNext = () => {
    if (!imageRef.current || naturalSize.width === 0) return;

    const pixelCrop: CropBox = {
      x: Math.round(crop.x * naturalSize.width),
      y: Math.round(crop.y * naturalSize.height),
      width: Math.max(10, Math.round(crop.w * naturalSize.width)),
      height: Math.max(10, Math.round(crop.h * naturalSize.height)),
    };

    const canvas = document.createElement('canvas');
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        imageRef.current,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );
    }

    onCropComplete(canvas, pixelCrop);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Title Header matching WhatFontIs Step 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Recortar el texto (Crop the text)
          </h1>
          <div className="flex items-center gap-2 mt-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold inline-flex border border-emerald-200/70">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Mejores resultados: selecciona de 4 a 10 caracteres (una línea de texto a la vez).</span>
          </div>
        </div>

        {/* Quick crop tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSelectFull}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Seleccionar todo</span>
          </button>
          <button
            onClick={handleResetCrop}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Crop Canvas */}
      <div className="mt-8 flex justify-center">
        <div
          ref={containerRef}
          className="relative inline-block select-none rounded-2xl overflow-hidden shadow-xl border-4 border-gray-800 bg-slate-900 max-w-full"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Base Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={imageSrc}
            alt="Source for cropping"
            onLoad={handleImageLoad}
            className="block max-h-[60vh] max-w-full object-contain pointer-events-none"
          />

          {/* Dimmed backdrop overlay outside crop */}
          {imgLoaded && displaySize.width > 0 && (
            <div className="absolute inset-0 pointer-events-none bg-black/45" />
          )}

          {/* Active Crop Box */}
          {imgLoaded && displaySize.width > 0 && (
            <div
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
              onPointerDown={(e) => handlePointerDown('move', e)}
              className="absolute cursor-move border-2 border-dashed border-amber-400 bg-transparent ring-2 ring-blue-500/80 shadow-2xl touch-none group"
            >
              {/* Highlight cut-out (clears dim) */}
              <div className="absolute inset-0 bg-white/10" />

              {/* Trash/Reset icon on top right inside crop box (like WhatFontIs Image 2) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResetCrop();
                }}
                title="Reiniciar selección"
                className="absolute -top-3 -right-3 w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Grid 3x3 helper lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-white/60" />
                <div className="border-r border-white/60" />
                <div />
              </div>

              {/* Resize Handles (8 directions) */}
              {/* NW */}
              <div
                onPointerDown={(e) => handlePointerDown('nw', e)}
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-nwse-resize shadow-md"
              />
              {/* N */}
              <div
                onPointerDown={(e) => handlePointerDown('n', e)}
                className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize shadow-md"
              />
              {/* NE */}
              <div
                onPointerDown={(e) => handlePointerDown('ne', e)}
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-nesw-resize shadow-md"
              />
              {/* E */}
              <div
                onPointerDown={(e) => handlePointerDown('e', e)}
                className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize shadow-md"
              />
              {/* SE */}
              <div
                onPointerDown={(e) => handlePointerDown('se', e)}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-nwse-resize shadow-md"
              />
              {/* S */}
              <div
                onPointerDown={(e) => handlePointerDown('s', e)}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-ns-resize shadow-md"
              />
              {/* SW */}
              <div
                onPointerDown={(e) => handlePointerDown('sw', e)}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-nesw-resize shadow-md"
              />
              {/* W */}
              <div
                onPointerDown={(e) => handlePointerDown('w', e)}
                className="absolute top-1/2 -left-2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-blue-600 rounded-sm cursor-ew-resize shadow-md"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="mt-10 flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevStep}
          type="button"
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm sm:text-base"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>ANTERIOR (Upload)</span>
        </button>

        <button
          onClick={handleNext}
          type="button"
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold shadow-lg shadow-red-600/30 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
        >
          <span>SIGUIENTE PASO (Optimize)</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
