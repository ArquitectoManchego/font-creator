'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ExtractedCharacter } from '@/lib/types';
import {
  X,
  Eraser,
  Pencil,
  Undo2,
  Trash2,
  Check,
  ZoomIn,
  ZoomOut,
  Sliders,
  MoveVertical,
  MoveHorizontal
} from 'lucide-react';

interface GlyphEditorModalProps {
  glyph: ExtractedCharacter;
  charKey: string;
  onSave: (updatedGlyph: ExtractedCharacter, newCharKey: string) => void;
  onDelete: (charKey: string) => void;
  onClose: () => void;
}

export const GlyphEditorModal: React.FC<GlyphEditorModalProps> = ({
  glyph,
  charKey,
  onSave,
  onDelete,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [targetChar, setTargetChar] = useState<string>(charKey);
  const [activeTool, setActiveTool] = useState<'pencil' | 'eraser'>('eraser');
  const [brushSize, setBrushSize] = useState<number>(4);
  const [isDrawing, setIsDrawing] = useState(false);
  const [baselineRatio, setBaselineRatio] = useState<number>(
    glyph.metrics?.baselineOffsetRatio ?? 0.85
  );
  const [leftBearing, setLeftBearing] = useState<number>(glyph.metrics?.leftBearing ?? 10);
  const [rightBearing, setRightBearing] = useState<number>(glyph.metrics?.rightBearing ?? 10);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [zoom, setZoom] = useState<number>(2);

  // Initialize canvas with glyph bitmap
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.naturalWidth || 100;
      canvas.height = img.naturalHeight || 120;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
    };
    img.src = glyph.dataUrl;
  }, [glyph.dataUrl]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-15), data]);
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = history.slice(0, -1);
    const lastState = newHistory[newHistory.length - 1];
    if (lastState) {
      ctx.putImageData(lastState, 0, 0);
      setHistory(newHistory);
    }
  };

  // Canvas drawing / erasing
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.x) * scaleX,
      y: (e.clientY - rect.y) * scaleY,
    };
  };

  const drawPixel = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (activeTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(x, y, brushSize, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    const pt = getCanvasCoords(e);
    if (pt) drawPixel(pt.x, pt.y);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pt = getCanvasCoords(e);
    if (pt) drawPixel(pt.x, pt.y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {}
    setIsDrawing(false);
    saveHistory();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updatedDataUrl = canvas.toDataURL('image/png');
    const updated: ExtractedCharacter = {
      ...glyph,
      char: targetChar,
      dataUrl: updatedDataUrl,
      metrics: {
        baselineOffsetRatio: baselineRatio,
        leftBearing,
        rightBearing,
      },
    };

    onSave(updated, targetChar);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center text-xl shadow-xs">
              {targetChar}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Editor de Glifo: «{targetChar}»
              </h2>
              <p className="text-xs text-gray-500">
                Retoca trazos, borra imperfecciones y ajusta las líneas métricas de la letra.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto">
          {/* Left Canvas Preview */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-gray-900/5 rounded-2xl p-6 border border-gray-200 relative min-h-[320px]">
            {/* Zoom Controls */}
            <div className="absolute top-3 left-3 flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 shadow-2xs z-10">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                className="p-1 hover:bg-gray-100 rounded-sm text-gray-600"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono px-1 font-semibold text-gray-700">
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(4, z + 0.5))}
                className="p-1 hover:bg-gray-100 rounded-sm text-gray-600"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Canvas Box with guide lines */}
            <div
              className="relative inline-block border-2 border-gray-300 rounded-xl overflow-hidden shadow-md bg-white select-none transition-transform"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
            >
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className={`block touch-none ${
                  activeTool === 'eraser' ? 'cursor-crosshair' : 'cursor-crosshair'
                }`}
              />

              {/* Baseline guideline */}
              <div
                style={{ top: `${baselineRatio * 100}%` }}
                className="absolute inset-x-0 border-b border-red-500/80 pointer-events-none z-10"
              >
                <span className="absolute -top-3.5 left-1 text-[8px] font-bold text-red-500 uppercase tracking-tighter bg-white/80 px-1 rounded-xs">
                  Línea Base
                </span>
              </div>
            </div>
          </div>

          {/* Right Tools & Metrics Panel */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Character Key Reassign */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Carácter asignado:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={2}
                    value={targetChar}
                    onChange={(e) => setTargetChar(e.target.value.length > 0 ? e.target.value.slice(-1) : targetChar)}
                    className="w-16 h-12 text-center text-2xl font-bold rounded-xl border-2 border-gray-300 text-gray-800 focus:border-blue-500 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const isUpper = targetChar === targetChar.toUpperCase() && targetChar !== targetChar.toLowerCase();
                      setTargetChar(isUpper ? targetChar.toLowerCase() : targetChar.toUpperCase());
                    }}
                    title="Alternar mayúscula / minúscula"
                    className="px-3 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    Alternar Aa
                  </button>
                  <span className="text-xs font-semibold text-gray-500">
                    {targetChar === targetChar.toUpperCase() && targetChar !== targetChar.toLowerCase()
                      ? '(Mayúscula)'
                      : targetChar === targetChar.toLowerCase() && targetChar !== targetChar.toUpperCase()
                      ? '(Minúscula)'
                      : ''}
                  </span>
                </div>
              </div>

              {/* Brush Tools */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Herramienta de retoque:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTool('eraser')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                      activeTool === 'eraser'
                        ? 'bg-red-50 text-red-700 border-red-400 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    <span>Borrador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTool('pencil')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border transition-all ${
                      activeTool === 'pencil'
                        ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-xs'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Pencil className="w-4 h-4" />
                    <span>Pincel de tinta</span>
                  </button>
                </div>
              </div>

              {/* Brush Size */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span>Tamaño de trazo</span>
                  <span className="text-blue-600">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="16"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>

              {/* Baseline Slider */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    <MoveVertical className="w-3.5 h-3.5 text-red-500" />
                    Alineación Línea Base
                  </span>
                  <span className="text-red-500 font-mono">{Math.round(baselineRatio * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="0.98"
                  step="0.01"
                  value={baselineRatio}
                  onChange={(e) => setBaselineRatio(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer"
                />
              </div>

              {/* Side Bearings */}
              <div>
                <div className="flex justify-between text-xs font-semibold text-gray-700 mb-1">
                  <span className="flex items-center gap-1">
                    <MoveHorizontal className="w-3.5 h-3.5 text-gray-500" />
                    Espaciado Lateral (Bearings)
                  </span>
                  <span className="text-blue-600 text-[11px]">
                    L: {leftBearing}px | R: {rightBearing}px
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={leftBearing}
                    onChange={(e) => setLeftBearing(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={rightBearing}
                    onChange={(e) => setRightBearing(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              {/* Undo action */}
              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length <= 1}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Deshacer último trazo</span>
              </button>
            </div>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => {
                if (confirm(`¿Eliminar la letra «${charKey}» de la fuente?`)) {
                  onDelete(charKey);
                }
              }}
              className="flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar este glifo</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 text-sm transition-colors"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            type="button"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-md shadow-blue-500/25 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Guardar cambios</span>
          </button>
        </div>
      </div>
    </div>
  );
};
