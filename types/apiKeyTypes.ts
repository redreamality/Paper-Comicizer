export interface ApiKeyStorage {
  openRouterApiKey: string;
  crsaiApiKey: string;
  lastUpdated: string; // ISO timestamp
  isValid: {
    openRouter: boolean;
    crsai: boolean;
  };
}

export interface ApiKeyContextType {
  openRouterApiKey: string;
  crsaiApiKey: string;
  isValid: {
    openRouter: boolean;
    crsai: boolean;
  };
  lastUpdated: string;
  setApiKeys: (openRouterKey: string, crsaiKey: string) => Promise<{ openRouter: boolean; crsai: boolean }>;
  validateApiKey: (service: 'openrouter' | 'crsai', apiKey: string) => Promise<boolean>;
  clearApiKeys: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

export type ServiceType = 'openrouter' | 'crsai';

export interface ValidationResult {
  openRouter: boolean;
  crsai: boolean;
}