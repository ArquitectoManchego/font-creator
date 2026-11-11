'use client';

import React, { useState, useMemo } from 'react';
import { FontProject, ExtractedCharacter } from '@/lib/types';
import { downloadFontFile, exportZipPackage } from '@/lib/fontGenerator';
import { GlyphEditorModal } from './GlyphEditorModal';
import {
  Download,
  PlusCircle,
  Edit3,
  Sliders,
  Type,
  Sparkles,
  Layers,
  RotateCcw,
  CheckCircle,
  FileCode,
  FolderArchive,
  Eye,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface Step5FontStudioProps {
  project: FontProject;
  onUpdateProject: (updatedProject: FontProject) => void;
  onAddMoreLettersFromImage: () => void;
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'.split('');
const NUMBERS = '0123456789'.split('');
const PUNCTUATION = ['!', '?', '.', ',', ':', ';', '-', '_', '(', ')', '@', '#', '$', '%', '&', '¿', '¡', 'Ñ', 'ñ', 'á', 'é', 'í', 'ó', 'ú'];

type TabCategory = 'all' | 'uppercase' | 'lowercase' | 'numbers' | 'symbols';

export const Step5FontStudio: React.FC<Step5FontStudioProps> = ({
  project,
  onUpdateProject,
  onAddMoreLettersFromImage,
}) => {
  // Live preview testing text (like "OLAHALLO" in Image 6)
  const [testText, setTestText] = useState('OLAHALLO');
  const [fontSize, setFontSize] = useState(56);
  const [letterSpacing, setLetterSpacing] = useState(8);
  const [activeTab, setActiveTab] = useState<TabCategory>('all');
  const [editingCharKey, setEditingCharKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Glyph counts
  const totalGlyphsCount = Object.keys(project.glyphs).length;

  // Selected tab characters
  const tabCharacters = useMemo(() => {
    switch (activeTab) {
      case 'uppercase':
        return UPPERCASE;
      case 'lowercase':
        return LOWERCASE;
      case 'numbers':
        return NUMBERS;
      case 'symbols':
        return PUNCTUATION;
      case 'all':
      default:
        // Unique union of standard characters + any custom characters in project
        const standard = [...UPPERCASE, ...LOWERCASE, ...NUMBERS, ...PUNCTUATION];
        const extra = Object.keys(project.glyphs).filter((c) => !standard.includes(c));
        return [...standard, ...extra];
    }
  }, [activeTab, project.glyphs]);

  // Handle glyph update from editor
  const handleSaveGlyph = (updatedGlyph: ExtractedCharacter, newCharKey: string) => {
    const newGlyphs = { ...project.glyphs };
    if (editingCharKey && editingCharKey !== newCharKey) {
      delete newGlyphs[editingCharKey];
    }
    newGlyphs[newCharKey] = updatedGlyph;

    onUpdateProject({
      ...project,
      glyphs: newGlyphs,
    });
    setEditingCharKey(null);
  };

  const handleDeleteGlyph = (charKey: string) => {
    const newGlyphs = { ...project.glyphs };
    delete newGlyphs[charKey];
    onUpdateProject({
      ...project,
      glyphs: newGlyphs,
    });
    setEditingCharKey(null);
  };

  const handleExportOTF = async () => {
    try {
      setIsExporting(true);
      await downloadFontFile(project, 'otf');
      setExportSuccessMsg('¡Fuente OpenType (.OTF) descargada exitosamente!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Error generando archivo OTF. Revisa que haya al menos una letra válida.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTTF = async () => {
    try {
      setIsExporting(true);
      await downloadFontFile(project, 'ttf');
      setExportSuccessMsg('¡Fuente TrueType (.TTF) descargada exitosamente!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Error generando archivo TTF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      await exportZipPackage(project);
      setExportSuccessMsg('¡Paquete ZIP con vectores SVG y manifiesto descargado!');
      setTimeout(() => setExportSuccessMsg(null), 4000);
    } catch (err) {
      console.error(err);
      alert('Error exportando paquete ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Top Banner & Title */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Font Studio (Mesa de Tipografía)
            </h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-1 rounded-full">
              {totalGlyphsCount} {totalGlyphsCount === 1 ? 'glifo listo' : 'glifos listos'}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Vista cuadrícula estilo extensión de Illustrator (Fontself). Previsualiza en tiempo real, edita caracteres o añade más imágenes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add more letters button (key requirement from user) */}
          <button
            onClick={onAddMoreLettersFromImage}
            type="button"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/25 transition-all transform hover:scale-[1.02]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Añadir más letras (Otra imagen)</span>
          </button>

          {/* Export OTF */}
          <button
            onClick={handleExportOTF}
            disabled={totalGlyphsCount === 0 || isExporting}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs sm:text-sm font-bold shadow-xs disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Exportar .OTF</span>
          </button>

          {/* Export TTF */}
          <button
            onClick={handleExportTTF}
            disabled={totalGlyphsCount === 0 || isExporting}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs sm:text-sm font-semibold shadow-2xs disabled:opacity-50 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Exportar .TTF</span>
          </button>

          {/* Export ZIP */}
          <button
            onClick={handleExportZip}
            disabled={totalGlyphsCount === 0 || isExporting}
            type="button"
            title="Descargar paquete con archivos SVG vectoriales y proyecto JSON"
            className="p-2.5 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 shadow-2xs disabled:opacity-50 transition-all"
          >
            <FolderArchive className="w-4 h-4" />
          </button>
        </div>
      </div>

      {exportSuccessMsg && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{exportSuccessMsg}</span>
        </div>
      )}

      {/* Live Interactive Font Preview Bar (Matching Image 6 with "OLAHALLO") */}
      <div className="mt-8 bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-gray-100 gap-4">
          <div className="flex items-center gap-2">
            <Type className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
              Prueba de Texto en Vivo (Live Preview)
            </h3>
          </div>

          {/* Size & Spacing Sliders */}
          <div className="flex items-center gap-6 text-xs text-gray-600 font-semibold">
            <div className="flex items-center gap-2">
              <span>Tamaño:</span>
              <input
                type="range"
                min="24"
                max="100"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-24 accent-blue-600 cursor-pointer"
              />
              <span className="font-mono text-gray-800">{fontSize}px</span>
            </div>

            <div className="flex items-center gap-2">
              <span>Espaciado:</span>
              <input
                type="range"
                min="0"
                max="30"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-24 accent-blue-600 cursor-pointer"
              />
              <span className="font-mono text-gray-800">{letterSpacing}px</span>
            </div>
          </div>
        </div>

        {/* Text Input to type arbitrary text */}
        <div className="mt-4">
          <input
            type="text"
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Escribe aquí para probar tu fuente..."
            className="w-full px-4 py-3 rounded-xl border border-gray-300 text-gray-900 font-sans text-base focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-gray-50/50"
          />
        </div>

        {/* Rendered Output Area */}
        <div className="mt-4 min-h-[120px] bg-slate-50 border border-gray-200 rounded-2xl p-6 flex items-center overflow-x-auto">
          {testText.length === 0 ? (
            <span className="text-gray-400 italic text-sm">El texto de prueba aparecerá aquí...</span>
          ) : (
            <div className="flex items-baseline flex-nowrap" style={{ gap: `${letterSpacing}px` }}>
              {Array.from(testText).map((char, index) => {
                const glyph = project.glyphs[char] || project.glyphs[char.toUpperCase()] || project.glyphs[char.toLowerCase()];

                if (char === ' ') {
                  return (
                    <div
                      key={`space-${index}`}
                      style={{ width: `${fontSize * 0.4}px`, height: `${fontSize}px` }}
                      className="inline-block shrink-0"
                    />
                  );
                }

                if (glyph) {
                  return (
                    <div
                      key={`${char}-${index}`}
                      style={{
                        height: `${fontSize}px`,
                      }}
                      className="inline-flex items-end shrink-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={glyph.dataUrl}
                        alt={char}
                        style={{
                          height: `${fontSize * 0.9}px`,
                          maxWidth: 'none',
                        }}
                        className="object-contain filter drop-shadow-2xs select-none"
                      />
                    </div>
                  );
                }

                // Fallback rendering for characters not yet captured in font
                return (
                  <span
                    key={`fallback-${index}`}
                    style={{ fontSize: `${fontSize * 0.8}px` }}
                    className="font-sans font-bold text-gray-400 border border-dashed border-gray-300 px-1 rounded-sm select-none"
                    title={`Carácter «${char}» no capturado aún`}
                  >
                    {char}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'uppercase', label: 'Mayúsculas (A-Z)' },
            { id: 'lowercase', label: 'Minúsculas (a-z)' },
            { id: 'numbers', label: 'Números (0-9)' },
            { id: 'symbols', label: 'Signos y Acentos' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabCategory)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-500 font-medium">
          Haz clic en cualquier letra para abrir el editor y retocar trazos.
        </div>
      </div>

      {/* Main Glyph Grid (Matching Illustrator extension / Fontself Maker Image 6) */}
      <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 sm:gap-4">
        {tabCharacters.map((char) => {
          const glyph = project.glyphs[char];
          const isFilled = !!glyph;

          return (
            <div
              key={char}
              onClick={() => {
                if (isFilled) {
                  setEditingCharKey(char);
                }
              }}
              className={`group relative flex flex-col items-center justify-between rounded-2xl border-2 transition-all duration-200 p-2.5 select-none ${
                isFilled
                  ? 'bg-white border-blue-500/80 shadow-xs hover:shadow-md hover:border-blue-600 cursor-pointer transform hover:-translate-y-0.5'
                  : 'bg-gray-50/70 border-dashed border-gray-300 opacity-60 hover:opacity-100'
              }`}
              style={{ minHeight: '130px' }}
            >
              {/* Slot Header Label */}
              <div className="w-full flex items-center justify-between text-xs px-1">
                <span className="font-mono font-bold text-gray-500">{char}</span>
                {isFilled && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                )}
              </div>

              {/* Glyph Box with Baseline Guidelines */}
              <div className="relative w-full flex-1 my-1 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden p-1">
                {/* Guideline line */}
                <div className="absolute inset-x-0 bottom-4 border-b border-red-300/40 pointer-events-none" />

                {isFilled ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={glyph.dataUrl}
                    alt={`Glyph ${char}`}
                    className="max-h-20 max-w-full object-contain filter drop-shadow-2xs"
                  />
                ) : (
                  <span className="font-serif text-3xl font-light text-gray-200 select-none">
                    {char}
                  </span>
                )}

                {/* Edit overlay icon */}
                {isFilled && (
                  <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <div className="bg-white/95 text-blue-700 p-1.5 rounded-lg shadow-sm">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Character Info */}
              <div className="w-full text-center">
                <span className="text-[10px] font-semibold text-gray-400 block truncate">
                  {isFilled ? 'Editar' : 'Vacío'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Glyph Editor Modal */}
      {editingCharKey && project.glyphs[editingCharKey] && (
        <GlyphEditorModal
          glyph={project.glyphs[editingCharKey]}
          charKey={editingCharKey}
          onSave={handleSaveGlyph}
          onDelete={handleDeleteGlyph}
          onClose={() => setEditingCharKey(null)}
        />
      )}
    </div>
  );
};
