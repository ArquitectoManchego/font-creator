'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { OptimizationSettings, CutStroke, CutPoint } from '@/lib/types';
import { detectTextContrast, calculateOtsuThreshold, applyImageFilters } from '@/lib/imageProcessing';
import {
  Sliders,
  RotateCw,
  Sun,
  Contrast,
  Undo2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Info,
  CheckCircle,
  Scissors,
  Layers,
  ZoomIn,
  ZoomOut,
  Pencil,
  Minus
} from 'lucide-react';

interface Step3OptimizeProps {
  croppedCanvas: HTMLCanvasElement;
  onOptimizeComplete: (
    processedBinaryCanvas: HTMLCanvasElement,
    cutStrokes: CutStroke[],
    settings: OptimizationSettings
  ) => void;
  onPrevStep: () => void;
}

export const Step3Optimize: React.FC<Step3OptimizeProps> = ({
  croppedCanvas,
  onOptimizeComplete,
  onPrevStep,
}) => {
  // Contrast Detection Phase (Image 3)
  const [contrastPhaseChecked, setContrastPhaseChecked] = useState(false);
  const [detectedLightOnDark, setDetectedLightOnDark] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<OptimizationSettings>({
    contrast: 20,
    brightness: 0,
    threshold: 135,
    invert: false,
    rotation: 0,
    thicken: 0,
    reduceNoise: 1,
  });

  // Cutting Lines State (Image 4)
  const [cutStrokes, setCutStrokes] = useState<CutStroke[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<CutPoint[]>([]);
  const [cutMode, setCutMode] = useState<'line' | 'freehand'>('freehand');
  const [cutLineWidth, setCutLineWidth] = useState<number>(3);

  // Canvases refs
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const processedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initial Contrast Analysis
  useEffect(() => {
    if (!croppedCanvas) return;
    const { isLightOnDark } = detectTextContrast(croppedCanvas);
    setDetectedLightOnDark(isLightOnDark);
    if (isLightOnDark) {
      // Invert recommended for light text on dark background
      setSettings((prev) => ({ ...prev, invert: true }));
    }
  }, [croppedCanvas]);

  // Re-run image filters whenever settings change
  const renderProcessed = useCallback(() => {
    if (!croppedCanvas) return;
    const filtered = applyImageFilters(croppedCanvas, settings);
    processedCanvasRef.current = filtered;

    const canvas = displayCanvasRef.current;
    if (!canvas) return;

    canvas.width = filtered.width;
    canvas.height = filtered.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw filtered binary text
    ctx.drawImage(filtered, 0, 0);

    // Draw all user cut strokes with bright red lines (as in WhatFontIs Image 4)
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of cutStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.lineWidth = stroke.width || 3;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }

    // Draw current active stroke
    if (currentStroke.length > 1) {
      ctx.lineWidth = cutLineWidth;
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let i = 1; i < currentStroke.length; i++) {
        ctx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      ctx.stroke();
    }

    ctx.restore();
  }, [croppedCanvas, settings, cutStrokes, currentStroke, cutLineWidth]);

  useEffect(() => {
    renderProcessed();
  }, [renderProcessed]);

  // Pointer drawing handlers for separation cuts
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): CutPoint | null => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.x) * scaleX,
      y: (e.clientY - rect.y) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const pt = getCanvasCoords(e);
    if (!pt) return;
    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasCoords(e);
    if (!pt) return;

    if (cutMode === 'freehand') {
      setCurrentStroke((prev) => [...prev, pt]);
    } else {
      // Straight line from start to current
      setCurrentStroke((prev) => [prev[0], pt]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    setIsDrawing(false);

    if (currentStroke.length >= 2) {
      const newStroke: CutStroke = {
        id: `cut-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        points: currentStroke,
        width: cutLineWidth,
      };
      setCutStrokes((prev) => [...prev, newStroke]);
    }
    setCurrentStroke([]);
  };

  const handleUndoCut = () => {
    setCutStrokes((prev) => prev.slice(0, -1));
  };

  const handleClearCuts = () => {
    setCutStrokes([]);
  };

  const handleAutoAdjust = () => {
    // Compute Otsu threshold from grayscale image
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = croppedCanvas.width;
    tempCanvas.height = croppedCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(croppedCanvas, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imgData.data;
    const gray = new Uint8Array(tempCanvas.width * tempCanvas.height);

    for (let i = 0; i < gray.length; i++) {
      let r = data[i * 4];
      let g = data[i * 4 + 1];
      let b = data[i * 4 + 2];
      let lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      if (settings.invert) lum = 255 - lum;
      gray[i] = lum;
    }

    const otsu = calculateOtsuThreshold(gray);
    setSettings((prev) => ({
      ...prev,
      contrast: 35,
      brightness: 10,
      threshold: otsu,
    }));
  };

  const handleResetAdjustments = () => {
    setSettings({
      contrast: 0,
      brightness: 0,
      threshold: 128,
      invert: detectedLightOnDark,
      rotation: 0,
      thicken: 0,
      reduceNoise: 1,
    });
  };

  const handleFinishStep = () => {
    if (!processedCanvasRef.current) return;
    onOptimizeComplete(processedCanvasRef.current, cutStrokes, settings);
  };

  // IF Contrast Detected Screen has not been acknowledged and image was light-on-dark, show Image 3 modal/screen
  if (!contrastPhaseChecked && detectedLightOnDark) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xl text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-200">
            <Sparkles className="w-7 h-7" />
          </div>

          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Contraste de texto detectado (Text contrast detected)
          </h2>
          <p className="mt-2 text-gray-600 max-w-xl mx-auto text-sm sm:text-base">
            Detectamos letras claras sobre fondo oscuro. Para mejores resultados de vectorización y tipografía, utiliza letras oscuras sobre fondo claro.
          </p>

          {/* Side by side comparison cards (Matching WhatFontIs Image 3) */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Recommended: Inverted (dark on light) */}
            <div
              onClick={() => {
                setSettings((prev) => ({ ...prev, invert: true }));
                setContrastPhaseChecked(true);
              }}
              className="cursor-pointer group relative rounded-2xl border-2 border-blue-500 bg-amber-50/30 p-5 hover:shadow-lg transition-all text-left"
            >
              <span className="absolute -top-3 left-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-xs">
                Recomendado
              </span>

              <div className="mt-2 rounded-xl overflow-hidden bg-white border border-gray-200 aspect-video flex items-center justify-center p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={croppedCanvas.toDataURL()}
                  alt="Inverted option"
                  style={{ filter: 'invert(1) contrast(1.2)' }}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">Letras oscuras en fondo claro</h4>
                  <p className="text-xs text-gray-500">Inversión automática recomendada</p>
                </div>
                <CheckCircle className="w-5 h-5 text-blue-600 shrink-0" />
              </div>
            </div>

            {/* Original */}
            <div
              onClick={() => {
                setSettings((prev) => ({ ...prev, invert: false }));
                setContrastPhaseChecked(true);
              }}
              className="cursor-pointer group rounded-2xl border border-gray-200 hover:border-gray-400 bg-gray-900/5 p-5 hover:shadow-md transition-all text-left"
            >
              <div className="rounded-xl overflow-hidden bg-gray-950 border border-gray-800 aspect-video flex items-center justify-center p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={croppedCanvas.toDataURL()}
                  alt="Original option"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mt-4">
                <h4 className="font-bold text-gray-900 text-sm">Conservar original</h4>
                <p className="text-xs text-gray-500">Letras claras sobre fondo oscuro</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setContrastPhaseChecked(true)}
              type="button"
              className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-base shadow-lg shadow-red-600/30 flex items-center gap-2"
            >
              <span>SIGUIENTE PASO</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Optimizar la imagen (Optimize the image)
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Ajusta el contraste, grosor de líneas y dibuja trazos rojos entre letras unidas para separarlas.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoAdjust}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Ajuste (Otsu)</span>
          </button>

          <button
            onClick={() => setSettings((s) => ({ ...s, invert: !s.invert }))}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-2xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Invertir Colores</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Sliders and controls (Matching Image 4) */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-sm border-b border-gray-100 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Controles de Imagen</span>
          </div>

          {/* Contrast Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Contrast className="w-3.5 h-3.5 text-gray-500" />
                Contraste
              </span>
              <span className="text-blue-600">{settings.contrast}%</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.contrast}
              onChange={(e) => setSettings({ ...settings, contrast: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Brightness Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-gray-500" />
                Brillo
              </span>
              <span className="text-blue-600">{settings.brightness}%</span>
            </div>
            <input
              type="range"
              min="-100"
              max="100"
              value={settings.brightness}
              onChange={(e) => setSettings({ ...settings, brightness: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Threshold / Binarization Slider */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-500" />
                Umbral de Tinta (Binarización)
              </span>
              <span className="text-blue-600">{settings.threshold} / 255</span>
            </div>
            <input
              type="range"
              min="10"
              max="245"
              value={settings.threshold}
              onChange={(e) => setSettings({ ...settings, threshold: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Thicken Lines (Dilation) */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
              <span>Engrosar trazos (Thicken lines)</span>
              <span className="text-blue-600">+{settings.thicken}px</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSettings({ ...settings, thicken: lvl })}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    settings.thicken === lvl
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {lvl === 0 ? 'Normal' : `+${lvl}`}
                </button>
              ))}
            </div>
          </div>

          {/* Reduce Noise (Filter tiny specks) */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1.5">
              <span>Reducir ruido / Mota</span>
              <span className="text-blue-600">Nivel {settings.reduceNoise}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[0, 1, 2, 3].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSettings({ ...settings, reduceNoise: lvl })}
                  className={`py-1.5 text-xs font-bold rounded-lg border transition-all ${
                    settings.reduceNoise === lvl
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {lvl === 0 ? 'Off' : `Nivel ${lvl}`}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleResetAdjustments}
            type="button"
            className="w-full py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Restablecer ajustes de imagen
          </button>
        </div>

        {/* Right Column: Interactive Canvas & Separator Line Drawer (Matching Image 4) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Banner from WhatFontIs Image 4: "Only if letters touch: draw a thin line to separate them" */}
          <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-amber-900 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Scissors className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-xs sm:text-sm">
                <strong className="block font-bold text-gray-900">
                  Separador de letras conectadas:
                </strong>
                <span>
                  Solo si las letras se tocan (ej. cursiva o ligaduras), traza una línea roja entre ellas para separarlas en recuadros individuales.
                </span>
              </div>
            </div>

            {/* Illustration graphic (b c d f like Image 4) */}
            <div className="bg-white px-3 py-1.5 rounded-lg border border-amber-200 flex items-center gap-2 shrink-0 font-serif italic text-base font-bold text-gray-700 tracking-wider">
              <span>b</span>
              <span className="text-red-500 font-sans font-normal">|</span>
              <span>c</span>
              <span className="text-red-500 font-sans font-normal">|</span>
              <span>d</span>
              <span className="text-red-500 font-sans font-normal">|</span>
              <span>f</span>
            </div>
          </div>

          {/* Line Drawing Toolbar */}
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wider mr-1">
                Herramienta:
              </span>
              <button
                type="button"
                onClick={() => setCutMode('freehand')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  cutMode === 'freehand'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Mano Alzada</span>
              </button>
              <button
                type="button"
                onClick={() => setCutMode('line')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  cutMode === 'line'
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Minus className="w-3.5 h-3.5" />
                <span>Línea Recta</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Width */}
              <div className="flex items-center gap-1.5 text-xs text-gray-600 font-semibold">
                <span>Grosor:</span>
                {[2, 3, 5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setCutLineWidth(w)}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold border ${
                      cutLineWidth === w
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>

              {/* Undo & Clear */}
              <button
                type="button"
                onClick={handleUndoCut}
                disabled={cutStrokes.length === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Deshacer última línea"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Deshacer</span>
              </button>

              <button
                type="button"
                onClick={handleClearCuts}
                disabled={cutStrokes.length === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Borrar todas</span>
              </button>
            </div>
          </div>

          {/* Interactive Canvas Container */}
          <div className="bg-gray-100 rounded-3xl p-4 sm:p-8 flex items-center justify-center min-h-[300px] border border-gray-200 shadow-inner overflow-auto">
            <div className="relative inline-block border-2 border-gray-300 rounded-xl overflow-hidden shadow-lg bg-white select-none">
              <canvas
                ref={displayCanvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="cursor-crosshair block max-w-full max-h-[50vh] object-contain touch-none"
              />

              {cutStrokes.length > 0 && (
                <div className="absolute top-2 right-2 bg-red-600/90 text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-xs pointer-events-none">
                  {cutStrokes.length} {cutStrokes.length === 1 ? 'corte' : 'cortes'}
                </div>
              )}
            </div>
          </div>
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
          <span>ANTERIOR (Crop)</span>
        </button>

        <button
          onClick={handleFinishStep}
          type="button"
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold shadow-lg shadow-red-600/30 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
        >
          <span>SIGUIENTE PASO (Enter Characters)</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
