'use client';

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FolderOpen, Image as ImageIcon, Link as LinkIcon, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { SAMPLE_IMAGES, SampleImage } from '@/lib/samples';

interface Step1UploadProps {
  onImageSelected: (dataUrl: string, name?: string) => void;
  onOpenSamples: () => void;
}

export const Step1Upload: React.FC<Step1UploadProps> = ({ onImageSelected, onOpenSamples }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle global paste event (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP, SVG).');
      return;
    }
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        onImageSelected(result, file.name);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrlInput.trim()) return;

    // Load via Image element to convert to dataUrl (handling CORS via canvas)
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        onImageSelected(canvas.toDataURL('image/png'), 'url-image.png');
      }
    };
    img.onerror = () => {
      setErrorMsg('No se pudo cargar la imagen desde esa URL (posible restricción CORS). Prueba descargándola o copiándola.');
    };
    img.src = imageUrlInput.trim();
  };

  const handlePickSample = (sample: SampleImage) => {
    if (sample.generateDataUrl) {
      const dataUrl = sample.generateDataUrl();
      if (dataUrl) onImageSelected(dataUrl, sample.name);
    } else if (sample.imageUrl) {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          onImageSelected(canvas.toDataURL('image/png'), sample.name);
        }
      };
      img.src = sample.imageUrl;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Graphic Icon (like WhatFontIs circle icon) */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-24 h-24 rounded-full bg-blue-50 border-4 border-blue-200/80 flex items-center justify-center mb-5 shadow-inner">
          <div className="w-16 h-16 rounded-xl border-2 border-blue-400 bg-white flex flex-col items-center justify-center text-blue-600 shadow-xs">
            <span className="font-serif text-lg font-bold">Abc</span>
            <div className="w-6 h-0.5 bg-blue-300 mt-0.5" />
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
          Arrastra y suelta tu imagen aquí para crear tu fuente
        </h1>
        <p className="mt-3 text-base sm:text-lg text-gray-600 max-w-2xl">
          También puedes pegar una imagen de letras con{' '}
          <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-300 rounded-md">
            Ctrl+V
          </kbd>
          , explorar archivos o probar nuestros ejemplos prediseñados.
        </p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm text-center">
          {errorMsg}
        </div>
      )}

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer border-2 border-dashed rounded-3xl p-10 sm:p-14 text-center transition-all duration-200 bg-white shadow-sm ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[1.01]'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <span className="text-lg font-bold text-gray-900">
              Haz clic para seleccionar un archivo
            </span>
            <span className="text-gray-500 block text-sm mt-1">
              Soporta PNG, JPG, WEBP, SVG o fotos de texto / caligrafía
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-blue-600 font-semibold bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl border border-blue-200 transition-colors">
            <FolderOpen className="w-4 h-4" />
            <span>Examinar archivos</span>
          </div>
        </div>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleUrlSubmit} className="mt-6 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <LinkIcon className="w-4 h-4" />
          </div>
          <input
            type="url"
            value={imageUrlInput}
            onChange={(e) => setImageUrlInput(e.target.value)}
            placeholder="Pegar URL de la imagen (opcional)"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-800 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-gray-900 hover:bg-black text-white text-sm font-semibold rounded-xl transition-colors shadow-xs"
        >
          Cargar URL
        </button>
      </form>

      {/* Advanced Options Accordion */}
      <div className="mt-8 border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Consejos para mejores resultados (Opciones avanzadas)</span>
          </div>
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 text-xs sm:text-sm text-gray-600 space-y-2">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Contraste óptimo:</strong> Letras oscuras sobre fondo claro proporcionan la máxima precisión de vectorizado.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Una línea por recorte:</strong> Recortar de 4 a 12 caracteres seguidos da el mejor balance y orden.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Letras cursivas o unidas:</strong> En el paso de optimización podrás trazar líneas rojas divisorias para separar letras conectadas.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Preset Samples to test immediately (like WhatFontIs Paloma sample) */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            ¿Quieres probarlo ya? Selecciona un ejemplo:
          </h2>
          <span className="text-xs text-blue-600 font-medium">1-clic para cargar</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {SAMPLE_IMAGES.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handlePickSample(sample)}
              className="group cursor-pointer rounded-2xl border border-gray-200 hover:border-blue-500 bg-white hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between"
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 mb-2">
                  {sample.category}
                </span>
                <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                  {sample.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {sample.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:translate-x-1 transition-transform">
                <span>Usar este ejemplo</span>
                <span>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
