'use client';

import React from 'react';
import { SAMPLE_IMAGES, SampleImage } from '@/lib/samples';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface SamplesModalProps {
  onSelectSample: (dataUrl: string, name: string) => void;
  onClose: () => void;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({ onSelectSample, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Ejemplos para pruebas</h3>
              <p className="text-xs text-gray-500">
                Selecciona una imagen de demostración para probar el flujo de WhatFontIs de inmediato.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of samples */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {SAMPLE_IMAGES.map((sample) => (
            <div
              key={sample.id}
              onClick={() => {
                if (sample.generateDataUrl) {
                  const dataUrl = sample.generateDataUrl();
                  if (dataUrl) onSelectSample(dataUrl, sample.name);
                  onClose();
                } else if (sample.imageUrl) {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(img, 0, 0);
                      onSelectSample(canvas.toDataURL('image/png'), sample.name);
                    }
                    onClose();
                  };
                  img.src = sample.imageUrl;
                }
              }}
              className="cursor-pointer group rounded-2xl border border-gray-200 hover:border-blue-500 bg-white p-4 hover:shadow-md transition-all flex items-center justify-between gap-4"
            >
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 mb-1.5">
                  {sample.category}
                </span>
                <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                  {sample.name}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">{sample.description}</p>
              </div>

              <div className="shrink-0 flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                <span>Cargar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
