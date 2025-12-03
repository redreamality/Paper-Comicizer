import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ApiKeyContextType, ServiceType } from '../types/apiKeyTypes';
import { getStoredApiKeys, saveApiKeys, clearApiKeys, getActiveService } from '../services/apiKeyService';

const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState(() => getStoredApiKeys());
  const [activeService, setActiveService] = useState<ServiceType | null>(() => getActiveService());

  // 监听localStorage变化（其他标签页的修改）
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'paper_comicizer_api_keys') {
        setApiKeys(getStoredApiKeys());
        setActiveService(getActiveService());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 定期检查密钥状态（每5分钟）
  useEffect(() => {
    const interval = setInterval(() => {
      const currentKeys = getStoredApiKeys();
      setApiKeys(currentKeys);
      setActiveService(getActiveService());
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const setApiKeysHandler = async (
    openRouterKey: string,
    crsaiKey: string
  ): Promise<{ openRouter: boolean; crsai: boolean }> => {
    const results = await saveApiKeys(openRouterKey, crsaiKey);

    // 更新本地状态
    const newKeys = getStoredApiKeys();
    setApiKeys(newKeys);
    setActiveService(getActiveService());

    return results;
  };

  const validateApiKey = async (service: ServiceType, apiKey: string): Promise<boolean> => {
    // 这里可以调用apiKeyService中的验证函数
    // 为了简化，我们直接保存并检查结果
    if (service === 'openrouter') {
      const results = await saveApiKeys(apiKey, apiKeys.crsaiApiKey);
      return results.openRouter;
    } else {
      const results = await saveApiKeys(apiKeys.openRouterApiKey, apiKey);
      return results.crsai;
    }
  };

  const clearApiKeysHandler = () => {
    clearApiKeys();
    setApiKeys(getStoredApiKeys());
    setActiveService(null);
  };

  const value: ApiKeyContextType = {
    openRouterApiKey: apiKeys.openRouterApiKey,
    crsaiApiKey: apiKeys.crsaiApiKey,
    isValid: apiKeys.isValid,
    lastUpdated: apiKeys.lastUpdated,
    setApiKeys: setApiKeysHandler,
    validateApiKey,
    clearApiKeys: clearApiKeysHandler,
    isModalOpen,
    openModal,
    closeModal
  };

  return (
    <ApiKeyContext.Provider value={value}>
      {children}
    </ApiKeyContext.Provider>
  );
};

export const useApiKeys = (): ApiKeyContextType => {
  const context = useContext(ApiKeyContext);
  if (context === undefined) {
    throw new Error('useApiKeys must be used within a SettingsProvider');
  }
  return context;
};

// 导出活动服务相关的辅助hook
export const useActiveService = (): {
  activeService: ServiceType | null;
  setActiveService: (service: ServiceType) => void;
} => {
  const [localActiveService, setLocalActiveService] = useState<ServiceType | null>(() => getActiveService());

  // 同步localStorage中的变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'paper_comicizer_api_keys') {
        setLocalActiveService(getActiveService());
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const setService = (service: ServiceType) => {
    // 这里可以添加逻辑来保存服务选择到localStorage
    // 目前我们只是更新本地状态
    setLocalActiveService(service);
  };

  return {
    activeService: localActiveService,
    setActiveService: setService
  };
};