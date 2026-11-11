'use client';

import React from 'react';
import { Type, Sparkles, FolderDown, RefreshCw, PlusCircle, HelpCircle } from 'lucide-react';
import { FontProject } from '@/lib/types';

interface NavbarProps {
  project: FontProject;
  onNewProject: () => void;
  onOpenSamples: () => void;
  onAddMoreLetters: () => void;
  glyphCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  onNewProject,
  onOpenSamples,
  onAddMoreLetters,
  glyphCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo and Name */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onNewProject}>
          <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-blue-600 via-indigo-600 to-red-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Type className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-gray-900">
                Font<span className="text-red-600">Creator</span>
              </span>
              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Pro
              </span>
            </div>
            <p className="text-xs text-gray-500 hidden sm:block">
              De imagen a tipografía OpenType & TrueType
            </p>
          </div>
        </div>

        {/* Project info badge */}
        <div className="hidden md:flex items-center gap-3 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-sm">
          <span className="text-gray-500 font-medium">Fuente:</span>
          <span className="font-semibold text-gray-800">{project.name || 'MiTipografia'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-xs">
            {glyphCount} {glyphCount === 1 ? 'glifo' : 'glifos'}
          </span>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSamples}
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors border border-indigo-200/60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ejemplos</span>
          </button>

          {glyphCount > 0 && (
            <button
              onClick={onAddMoreLetters}
              type="button"
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors border border-blue-200/60"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Añadir más letras</span>
            </button>
          )}

          <button
            onClick={onNewProject}
            type="button"
            title="Nuevo proyecto"
            className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
