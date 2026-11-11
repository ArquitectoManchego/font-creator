'use client';

import React from 'react';
import { Step } from '@/lib/types';
import { Upload, Crop, Wand2, Keyboard, LayoutGrid, Check } from 'lucide-react';

interface StepsIndicatorProps {
  currentStep: Step;
  onSelectStep: (step: Step) => void;
  maxStepReached: Step;
}

const STEPS_CONFIG: { id: Step; number: number; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'upload', number: 1, label: 'Upload', icon: Upload },
  { id: 'crop', number: 2, label: 'Crop', icon: Crop },
  { id: 'optimize', number: 3, label: 'Optimize', icon: Wand2 },
  { id: 'input', number: 4, label: 'Input', icon: Keyboard },
  { id: 'studio', number: 5, label: 'Font Studio', icon: LayoutGrid },
];

const STEP_ORDER: Step[] = ['upload', 'crop', 'optimize', 'input', 'studio'];

export const StepsIndicator: React.FC<StepsIndicatorProps> = ({
  currentStep,
  onSelectStep,
  maxStepReached,
}) => {
  const currentIndex = STEP_ORDER.indexOf(currentStep);
  const maxIndex = STEP_ORDER.indexOf(maxStepReached);

  return (
    <div className="w-full bg-white border-b border-gray-100 py-3 shadow-2xs">
      <div className="max-w-4xl mx-auto px-4">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between sm:justify-center sm:gap-4 md:gap-8">
            {STEPS_CONFIG.map((step, idx) => {
              const isActive = step.id === currentStep;
              const isPast = idx < currentIndex;
              const isAccessible = idx <= Math.max(maxIndex, currentIndex);
              const Icon = step.icon;

              return (
                <li key={step.id} className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => isAccessible && onSelectStep(step.id)}
                    disabled={!isAccessible}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-600/30 ring-offset-2'
                        : isPast
                        ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'
                        : isAccessible
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                        isActive
                          ? 'bg-white text-blue-600'
                          : isPast
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isPast ? <Check className="w-3 h-3 stroke-[3]" /> : step.number}
                    </span>
                    <span className="hidden sm:inline font-medium tracking-tight">
                      {step.label}
                    </span>
                  </button>

                  {/* Connector line between steps */}
                  {idx < STEPS_CONFIG.length - 1 && (
                    <div
                      className={`hidden md:block w-8 lg:w-12 h-0.5 mx-1 transition-colors duration-200 ${
                        idx < currentIndex ? 'bg-blue-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </div>
  );
};
