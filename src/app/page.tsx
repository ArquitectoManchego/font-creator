'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Step, CropBox, CutStroke, OptimizationSettings, ExtractedCharacter, FontProject } from '@/lib/types';
import { segmentCharacters } from '@/lib/segmentation';
import { saveProjectToCloud } from '@/lib/firebase';
import { Navbar } from '@/components/Navbar';
import { StepsIndicator } from '@/components/StepsIndicator';
import { Step1Upload } from '@/components/Step1Upload';
import { Step2Crop } from '@/components/Step2Crop';
import { Step3Optimize } from '@/components/Step3Optimize';
import { Step4EnterCharacters } from '@/components/Step4EnterCharacters';
import { Step5FontStudio } from '@/components/Step5FontStudio';
import { SamplesModal } from '@/components/SamplesModal';
import { CloudProjectsModal } from '@/components/CloudProjectsModal';

const DEFAULT_PROJECT: FontProject = {
  id: 'proj_default',
  name: 'MiFuente',
  family: 'MiFuenteCustom',
  author: 'Font Creator User',
  glyphs: {},
  unitsPerEm: 1000,
  ascender: 800,
  descender: -200,
  capHeight: 700,
  xHeight: 500,
  defaultLetterSpacing: 350,
};

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [maxStepReached, setMaxStepReached] = useState<Step>('upload');

  // Pipeline Data
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedCanvas, setCroppedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [cropBox, setCropBox] = useState<CropBox | null>(null);
  const [cutStrokes, setCutStrokes] = useState<CutStroke[]>([]);
  const [extractedCharacters, setExtractedCharacters] = useState<ExtractedCharacter[]>([]);

  // Font Project (accumulates glyphs across multiple images)
  const [project, setProject] = useState<FontProject>(DEFAULT_PROJECT);

  // Cloud Sync State (Firebase Firestore)
  const [cloudStatus, setCloudStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modals
  const [showSamplesModal, setShowSamplesModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);

  // Load saved project from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('font_creator_project');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.glyphs && Object.keys(parsed.glyphs).length > 0) {
          setProject(parsed);
          setCurrentStep('studio');
          setMaxStepReached('studio');
          setCloudStatus('saved');
        }
      }
    } catch (e) {
      console.warn('Could not load saved project from localStorage:', e);
    }
  }, []);

  // Auto-sync project to Firebase and localStorage
  const syncToCloud = useCallback(async (projectToSync: FontProject) => {
    if (Object.keys(projectToSync.glyphs).length === 0) return;
    try {
      setCloudStatus('saving');
      await saveProjectToCloud(projectToSync);
      setCloudStatus('saved');
    } catch (err) {
      console.error('Firebase autosave error:', err);
      setCloudStatus('error');
    }
  }, []);

  const handleUpdateProject = (updated: FontProject) => {
    setProject(updated);
    try {
      localStorage.setItem('font_creator_project', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save project to localStorage:', e);
    }

    // Debounced autosave to Firebase (1.2s delay to prevent excessive writes)
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      syncToCloud(updated);
    }, 1200);
  };

  const handleManualSaveToCloud = async () => {
    if (Object.keys(project.glyphs).length === 0) {
      alert('Aún no has agregado letras al proyecto para guardar.');
      return;
    }
    await syncToCloud(project);
    alert(`¡Proyecto «${project.name}» guardado con éxito en Firebase Firestore!`);
  };

  const handleLoadCloudProject = (loadedProject: FontProject) => {
    setProject(loadedProject);
    try {
      localStorage.setItem('font_creator_project', JSON.stringify(loadedProject));
    } catch (e) {}
    setOriginalImage(null);
    setCroppedCanvas(null);
    setCropBox(null);
    setCutStrokes([]);
    setExtractedCharacters([]);
    setCurrentStep('studio');
    setMaxStepReached('studio');
    setCloudStatus('saved');
  };

  const handleNewProject = () => {
    if (
      Object.keys(project.glyphs).length > 0 &&
      !confirm('¿Deseas iniciar un nuevo proyecto? Esto limpiará las letras de la mesa de trabajo (los proyectos guardados en la nube permanecerán intactos).')
    ) {
      return;
    }
    const fresh: FontProject = {
      ...DEFAULT_PROJECT,
      id: `proj_${Date.now()}`,
      glyphs: {},
    };
    setProject(fresh);
    localStorage.removeItem('font_creator_project');
    setOriginalImage(null);
    setCroppedCanvas(null);
    setCropBox(null);
    setCutStrokes([]);
    setExtractedCharacters([]);
    setCurrentStep('upload');
    setMaxStepReached('upload');
    setCloudStatus('idle');
  };

  // Step 1: Upload Complete
  const handleImageSelected = (dataUrl: string, name?: string) => {
    setOriginalImage(dataUrl);
    if (name && project.name === 'MiFuente') {
      const cleanName = name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '');
      if (cleanName) {
        setProject((p) => ({ ...p, name: cleanName, family: cleanName }));
      }
    }
    setCurrentStep('crop');
    setMaxStepReached('crop');
  };

  // Step 2: Crop Complete
  const handleCropComplete = (canvas: HTMLCanvasElement, box: CropBox) => {
    setCroppedCanvas(canvas);
    setCropBox(box);
    setCurrentStep('optimize');
    setMaxStepReached('optimize');
  };

  // Step 3: Optimize Complete (with Red Separator Cut Lines)
  const handleOptimizeComplete = (
    processedBinaryCanvas: HTMLCanvasElement,
    cuts: CutStroke[],
    settings: OptimizationSettings
  ) => {
    setCutStrokes(cuts);

    // Segment characters taking into account separator cut strokes!
    const characters = segmentCharacters(processedBinaryCanvas, cuts);
    setExtractedCharacters(characters);

    setCurrentStep('input');
    setMaxStepReached('input');
  };

  // Step 4: Enter Characters Complete (add to project glyphs)
  const handleEnterCharactersComplete = (assignedList: ExtractedCharacter[]) => {
    const updatedGlyphs = { ...project.glyphs };

    for (const item of assignedList) {
      const char = item.char;
      if (char && char.trim() !== '') {
        updatedGlyphs[char] = item;
      }
    }

    const updatedProject: FontProject = {
      ...project,
      glyphs: updatedGlyphs,
    };

    handleUpdateProject(updatedProject);
    setCurrentStep('studio');
    setMaxStepReached('studio');
  };

  // Add more letters from a new image (starting complete workflow without losing font)
  const handleAddMoreLetters = () => {
    setOriginalImage(null);
    setCroppedCanvas(null);
    setCropBox(null);
    setCutStrokes([]);
    setExtractedCharacters([]);
    setCurrentStep('upload');
  };

  const glyphCount = Object.keys(project.glyphs).length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-gray-900 selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar with Cloud status */}
      <Navbar
        project={project}
        onNewProject={handleNewProject}
        onOpenSamples={() => setShowSamplesModal(true)}
        onAddMoreLetters={handleAddMoreLetters}
        onOpenCloudModal={() => setShowCloudModal(true)}
        onSaveToCloud={handleManualSaveToCloud}
        cloudStatus={cloudStatus}
        glyphCount={glyphCount}
      />

      {/* Steps Indicator Progress Wizard */}
      <StepsIndicator
        currentStep={currentStep}
        onSelectStep={(s) => setCurrentStep(s)}
        maxStepReached={maxStepReached}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentStep === 'upload' && (
          <Step1Upload
            onImageSelected={handleImageSelected}
            onOpenSamples={() => setShowSamplesModal(true)}
          />
        )}

        {currentStep === 'crop' && originalImage && (
          <Step2Crop
            imageSrc={originalImage}
            initialCrop={cropBox || undefined}
            onCropComplete={handleCropComplete}
            onPrevStep={() => setCurrentStep('upload')}
          />
        )}

        {currentStep === 'optimize' && croppedCanvas && (
          <Step3Optimize
            croppedCanvas={croppedCanvas}
            onOptimizeComplete={handleOptimizeComplete}
            onPrevStep={() => setCurrentStep('crop')}
          />
        )}

        {currentStep === 'input' && (
          <Step4EnterCharacters
            characters={extractedCharacters}
            onComplete={handleEnterCharactersComplete}
            onPrevStep={() => setCurrentStep('optimize')}
          />
        )}

        {currentStep === 'studio' && (
          <Step5FontStudio
            project={project}
            onUpdateProject={handleUpdateProject}
            onAddMoreLettersFromImage={handleAddMoreLetters}
          />
        )}
      </main>

      {/* Cloud Projects Modal (Firebase Firestore) */}
      {showCloudModal && (
        <CloudProjectsModal
          currentProjectId={project.id}
          onLoadProject={handleLoadCloudProject}
          onNewProject={handleNewProject}
          onClose={() => setShowCloudModal(false)}
        />
      )}

      {/* Samples Modal */}
      {showSamplesModal && (
        <SamplesModal
          onSelectSample={(dataUrl, name) => {
            handleImageSelected(dataUrl, name);
          }}
          onClose={() => setShowSamplesModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-6 text-center text-xs text-gray-500">
        <p>
          FontCreator Pro — Extracción, segmentación y vectorización de tipografías desde imágenes | Sincronizado con Firebase Firestore
        </p>
      </footer>
    </div>
  );
}
