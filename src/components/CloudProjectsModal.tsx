'use client';

import React, { useState, useEffect } from 'react';
import { CloudProjectSummary, listCloudProjects, loadProjectFromCloud, deleteProjectFromCloud } from '@/lib/firebase';
import { FontProject } from '@/lib/types';
import {
  X,
  Cloud,
  FolderOpen,
  Trash2,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Plus
} from 'lucide-react';

interface CloudProjectsModalProps {
  onLoadProject: (project: FontProject) => void;
  onNewProject: () => void;
  onClose: () => void;
  currentProjectId?: string;
}

export const CloudProjectsModal: React.FC<CloudProjectsModalProps> = ({
  onLoadProject,
  onNewProject,
  onClose,
  currentProjectId,
}) => {
  const [projects, setProjects] = useState<CloudProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const list = await listCloudProjects();
      setProjects(list);
    } catch (err) {
      console.error(err);
      setErrorMsg('No se pudieron obtener los proyectos desde Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSelectProject = async (id: string) => {
    try {
      setLoadingId(id);
      const proj = await loadProjectFromCloud(id);
      if (proj) {
        onLoadProject(proj);
        onClose();
      } else {
        alert('No se encontró el proyecto en la base de datos.');
      }
    } catch (err) {
      console.error(err);
      alert('Error cargando el proyecto de la nube.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    if (!confirm(`¿Eliminar definitivamente el proyecto «${name}» de la nube?`)) return;

    const ok = await deleteProjectFromCloud(id);
    if (ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                Proyectos en la Nube (Firebase Firestore)
              </h3>
              <p className="text-xs text-gray-500">
                Tus avances tipográficos guardados en línea para continuar en cualquier momento.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProjects}
              title="Actualizar lista"
              className="p-2 text-gray-500 hover:text-gray-800 hover:bg-white/80 rounded-xl transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-white/80 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMsg}
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Cargando proyectos desde Firebase...</span>
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8">
              <Cloud className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <h4 className="text-sm font-bold text-gray-700">Aún no hay proyectos guardados en la nube</h4>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                Cuando trabajes en una fuente, los cambios se sincronizan automáticamente en Firebase.
              </p>
              <button
                onClick={() => {
                  onNewProject();
                  onClose();
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Empezar nuevo proyecto</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((proj) => {
                const isCurrent = proj.id === currentProjectId;
                const dateStr = new Date(proj.updatedAt).toLocaleString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={proj.id}
                    onClick={() => handleSelectProject(proj.id)}
                    className={`group cursor-pointer rounded-2xl border p-4 transition-all flex items-center justify-between gap-4 ${
                      isCurrent
                        ? 'border-blue-500 bg-blue-50/40 shadow-xs'
                        : 'border-gray-200 bg-white hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-blue-100 text-gray-600 group-hover:text-blue-700 flex items-center justify-center shrink-0 transition-colors">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                            {proj.name}
                          </h4>
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Activo ahora
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            {proj.glyphCount} {proj.glyphCount === 1 ? 'glifo' : 'glifos'}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock className="w-3 h-3" />
                            {dateStr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, proj.id, proj.name)}
                        title="Eliminar proyecto"
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        disabled={loadingId === proj.id}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1"
                      >
                        {loadingId === proj.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>Abrir</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1.5 font-medium text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Conectado a Firebase Firestore
          </span>

          <button
            onClick={() => {
              onNewProject();
              onClose();
            }}
            type="button"
            className="flex items-center gap-1 font-bold text-blue-600 hover:text-blue-800"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Crear nuevo proyecto limpio</span>
          </button>
        </div>
      </div>
    </div>
  );
};
