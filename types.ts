export interface PagePlan {
  pageNumber: number;
  description: string;
  visualCue: string;
}

export interface ComicPage {
  pageNumber: number;
  imageUrl: string;
  description: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  PLANNING = 'PLANNING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR',
}

export interface ProcessingState {
  status: AppStatus;
  currentStepDescription?: string;
  progress: number; // 0 to 100
  totalSteps: number;
  currentStep: number;
  error?: string;
}