import React from 'react';
import { AppStatus, ProcessingState } from '../types';

interface ProgressBarProps {
  state: ProcessingState;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ state }) => {
  if (state.status === AppStatus.IDLE || state.status === AppStatus.COMPLETE) return null;

  const getStatusMessage = () => {
    switch (state.status) {
      case AppStatus.ANALYZING: return "Reading the paper with Doraemon...";
      case AppStatus.PLANNING: return "Planning the storyboard...";
      case AppStatus.GENERATING_IMAGES: return `Drawing Page ${state.currentStep} of ${state.totalSteps}...`;
      case AppStatus.ERROR: return "Oh no! Something went wrong.";
      default: return "Processing...";
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100">
      <div className="flex justify-between items-center mb-2">
        <span className="text-lg font-bold text-slate-700 animate-pulse">{getStatusMessage()}</span>
        <span className="text-sm font-bold text-blue-500">{Math.round(state.progress)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-blue-400 to-indigo-500 h-4 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${state.progress}%` }}
        ></div>
      </div>
      
      {/* Visual Fun */}
      <div className="mt-4 flex justify-center space-x-4">
          <div className={`p-2 rounded-full ${state.status === AppStatus.ANALYZING ? 'bg-blue-100 ring-2 ring-blue-500' : 'opacity-30 grayscale'}`}>
             📄
          </div>
          <div className="h-0.5 w-8 bg-slate-300 self-center"></div>
          <div className={`p-2 rounded-full ${state.status === AppStatus.PLANNING ? 'bg-blue-100 ring-2 ring-blue-500' : 'opacity-30 grayscale'}`}>
             🧠
          </div>
          <div className="h-0.5 w-8 bg-slate-300 self-center"></div>
          <div className={`p-2 rounded-full ${state.status === AppStatus.GENERATING_IMAGES ? 'bg-blue-100 ring-2 ring-blue-500' : 'opacity-30 grayscale'}`}>
             🎨
          </div>
      </div>
    </div>
  );
};