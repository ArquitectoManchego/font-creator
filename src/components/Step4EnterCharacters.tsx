'use client';

import React, { useState } from 'react';
import { ExtractedCharacter } from '@/lib/types';
import { mergeCharacters } from '@/lib/segmentation';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  Combine,
  Sparkles,
  ArrowRight,
  Info,
  Check,
  AlertCircle
} from 'lucide-react';

interface Step4EnterCharactersProps {
  characters: ExtractedCharacter[];
  onComplete: (assignedCharacters: ExtractedCharacter[]) => void;
  onPrevStep: () => void;
}

export const Step4EnterCharacters: React.FC<Step4EnterCharactersProps> = ({
  characters: initialCharacters,
  onComplete,
  onPrevStep,
}) => {
  const [charsList, setCharsList] = useState<ExtractedCharacter[]>(initialCharacters);
  const [showSpecks, setShowSpecks] = useState(false);
  const [draggedCharId, setDraggedCharId] = useState<string | null>(null);
  const [bulkTextInput, setBulkTextInput] = useState('');

  // Count specks
  const specksCount = charsList.filter((c) => c.isSpeck).length;

  // Filter visible items
  const visibleChars = charsList.filter((c) => showSpecks || !c.isSpeck);

  const handleCharChange = (id: string, newChar: string) => {
    // Take the first grapheme or allow 1 character (or accented letters)
    const val = newChar.trim().slice(-1) || '';
    setCharsList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, char: val } : c))
    );
  };

  const handleDelete = (id: string) => {
    setCharsList((prev) => prev.filter((c) => c.id !== id));
  };

  // Drag and drop merging
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedCharId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedCharId;
    setDraggedCharId(null);

    if (!sourceId || sourceId === targetId) return;

    const sourceChar = charsList.find((c) => c.id === sourceId);
    const targetChar = charsList.find((c) => c.id === targetId);
    if (!sourceChar || !targetChar) return;

    // Merge source into target
    const merged = mergeCharacters(targetChar, sourceChar);

    setCharsList((prev) =>
      prev
        .map((c) => (c.id === targetId ? merged : c))
        .filter((c) => c.id !== sourceId)
    );
  };

  // Click-to-merge with next character
  const handleMergeWithAdjacent = (indexInVisible: number) => {
    if (indexInVisible >= visibleChars.length - 1) return;
    const current = visibleChars[indexInVisible];
    const next = visibleChars[indexInVisible + 1];

    const merged = mergeCharacters(current, next);

    setCharsList((prev) =>
      prev
        .map((c) => (c.id === current.id ? merged : c))
        .filter((c) => c.id !== next.id)
    );
  };

  // Bulk distribute text (e.g. typing "Paloma" assigns P, a, l, o, m, a to the non-speck boxes)
  const handleDistributeBulkText = () => {
    if (!bulkTextInput.trim()) return;
    const letters = Array.from(bulkTextInput.trim());
    let letterIdx = 0;

    setCharsList((prev) =>
      prev.map((c) => {
        if (!c.isSpeck && letterIdx < letters.length) {
          const char = letters[letterIdx];
          letterIdx++;
          return { ...c, char };
        }
        return c;
      })
    );
  };

  const handleProceed = () => {
    // Validate that at least one character is assigned
    const validChars = charsList.filter((c) => c.char.trim() !== '');
    if (validChars.length === 0) {
      alert('Por favor escribe al menos un carácter debajo de las letras antes de continuar.');
      return;
    }
    onComplete(charsList);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header matching WhatFontIs Image 5 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Ingresar Caracteres (Enter Characters)
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Revisa cada letra recortada y escribe el carácter correspondiente en el recuadro inferior.
          </p>
        </div>

        {/* Quick bulk assignment helper */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-2xl">
          <input
            type="text"
            value={bulkTextInput}
            onChange={(e) => setBulkTextInput(e.target.value)}
            placeholder="Ej: Paloma"
            className="px-3 py-1.5 text-xs font-medium rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleDistributeBulkText}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-2xs"
          >
            <span>Asignar palabra</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Specks and Merging Notification Banner (Matching Image 5) */}
      <div className="mt-6 bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-blue-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs sm:text-sm">
            <p className="font-semibold">
              {specksCount > 0 ? (
                <>Ocultamos {specksCount} fragmento(s) o motas pequeñas que probablemente no sean letras.</>
              ) : (
                <>Todas las letras identificadas están listas.</>
              )}
            </p>
            <p className="text-blue-700/80 text-xs mt-0.5">
              Si una letra quedó dividida en varias partes (ej. el punto de la «i» o tilde «ñ»), arrástralas una sobre otra o usa el botón unir.
            </p>
          </div>
        </div>

        {specksCount > 0 && (
          <button
            type="button"
            onClick={() => setShowSpecks(!showSpecks)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50 transition-colors shadow-2xs shrink-0"
          >
            {showSpecks ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showSpecks ? 'Ocultar fragmentos pequeños' : `Mostrar todas las piezas (${specksCount})`}</span>
          </button>
        )}
      </div>

      {/* Characters Cards Grid (Matching WhatFontIs Image 5) */}
      <div className="mt-8">
        {visibleChars.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-gray-200 p-8">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-800">No se detectaron letras en este recorte</h3>
            <p className="text-sm text-gray-500 mt-1">
              Prueba regresar al paso de recorte u optimización para ajustar el umbral de tinta o líneas de corte.
            </p>
            <button
              onClick={onPrevStep}
              className="mt-4 px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100"
            >
              Regresar y ajustar
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-4 sm:gap-6 justify-center sm:justify-start">
            {visibleChars.map((item, index) => {
              const isAssigned = item.char.trim() !== '';

              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, item.id)}
                  className={`group relative flex flex-col items-center bg-white rounded-2xl border-2 transition-all p-3 duration-200 select-none shadow-xs ${
                    draggedCharId === item.id
                      ? 'opacity-40 scale-95 border-dashed border-blue-400'
                      : isAssigned
                      ? 'border-blue-500/70 shadow-md shadow-blue-500/10'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {/* Speck indicator badge */}
                  {item.isSpeck && (
                    <span className="absolute -top-2 left-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      Mota/Punto
                    </span>
                  )}

                  {/* Top card actions */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {index < visibleChars.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMergeWithAdjacent(index)}
                        title="Unir con la siguiente pieza"
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <Combine className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      title="Eliminar este recuadro"
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Cropped Letter Preview Container */}
                  <div className="w-24 h-32 sm:w-28 sm:h-36 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center p-2 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.dataUrl}
                      alt={`Glyph ${item.char || 'preview'}`}
                      className="max-h-full max-w-full object-contain filter drop-shadow-xs"
                    />
                  </div>

                  {/* Character Input Box (Matching WhatFontIs Image 5) */}
                  <div className="mt-3 w-full flex flex-col items-center">
                    <input
                      type="text"
                      maxLength={2}
                      value={item.char}
                      onChange={(e) => handleCharChange(item.id, e.target.value)}
                      placeholder="?"
                      className={`w-14 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all uppercase focus:outline-hidden ${
                        isAssigned
                          ? 'border-blue-600 bg-blue-50/50 text-blue-700 shadow-inner'
                          : 'border-gray-300 bg-white text-gray-900 focus:border-blue-500'
                      }`}
                    />
                    <span className="text-[10px] text-gray-400 mt-1 font-mono">
                      {item.bbox.width}x{item.bbox.height}px
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-12 flex items-center justify-between pt-6 border-t border-gray-200">
        <button
          onClick={onPrevStep}
          type="button"
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors text-sm sm:text-base"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>ANTERIOR (Optimize)</span>
        </button>

        <button
          onClick={handleProceed}
          type="button"
          className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold shadow-lg shadow-red-600/30 transition-all transform hover:scale-[1.02] text-sm sm:text-base"
        >
          <span>GUARDAR Y CREAR FUENTE (Font Studio)</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
