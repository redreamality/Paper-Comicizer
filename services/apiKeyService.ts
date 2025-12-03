import { ApiKeyStorage, ValidationResult } from '../types/apiKeyTypes';

const STORAGE_KEY = 'paper_comicizer_api_keys';

/**
 * 获取存储的API密钥
 */
export const getStoredApiKeys = (): ApiKeyStorage => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to parse stored API keys:', error);
  }

  // 返回默认值
  return {
    openRouterApiKey: '',
    crsaiApiKey: '',
    lastUpdated: new Date().toISOString(),
    isValid: { openRouter: false, crsai: false }
  };
};

/**
 * 保存API密钥到localStorage
 */
export const saveApiKeys = async (
  openRouterKey: string,
  crsaiKey: string
): Promise<ValidationResult> => {
  // 验证密钥有效性
  const validationResults = await validateApiKeys(openRouterKey, crsaiKey);

  const storage: ApiKeyStorage = {
    openRouterApiKey: openRouterKey,
    crsaiApiKey: crsaiKey,
    lastUpdated: new Date().toISOString(),
    isValid: validationResults
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.error('Failed to save API keys to localStorage:', error);
    throw new Error('Failed to save API keys. Please check browser storage permissions.');
  }

  return validationResults;
};

/**
 * 验证API密钥有效性
 */
const validateApiKeys = async (
  openRouterKey: string,
  crsaiKey: string
): Promise<ValidationResult> => {
  const results: ValidationResult = {
    openRouter: false,
    crsai: false
  };

  // 并行验证两个密钥
  const validationPromises: Promise<void>[] = [];

  if (openRouterKey.trim()) {
    validationPromises.push(
      validateOpenRouterKey(openRouterKey)
        .then(isValid => { results.openRouter = isValid; })
        .catch(() => { results.openRouter = false; })
    );
  }

  if (crsaiKey.trim()) {
    validationPromises.push(
      validateCRSAIKey(crsaiKey)
        .then(isValid => { results.crsai = isValid; })
        .catch(() => { results.crsai = false; })
    );
  }

  await Promise.all(validationPromises);
  return results;
};

/**
 * 验证OpenRouter API密钥
 */
const validateOpenRouterKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey.trim()) return false;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    return response.ok;
  } catch (error) {
    console.error('OpenRouter API key validation failed:', error);
    return false;
  }
};

/**
 * 验证CRSAI API密钥
 */
const validateCRSAIKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey.trim()) return false;

  try {
    // 使用CRSAI的积分验证接口
    const response = await fetch(`https://grsai.dakka.com.cn/client/common/getCredits?apikey=${apiKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // 检查响应状态
    if (!response.ok) {
      console.error('CRSAI validation failed with status:', response.status);
      return false;
    }

    const data = await response.json();
    // 根据文档，code为0表示成功
    return data && data.code === 0;
  } catch (error) {
    console.error('CRSAI API key validation failed:', error);
    return false;
  }
};

/**
 * 清除所有存储的API密钥
 */
export const clearApiKeys = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear API keys:', error);
  }
};

/**
 * 获取指定服务的API密钥（考虑优先级）
 */
export const getApiKey = (service: 'openrouter' | 'crsai'): string => {
  const stored = getStoredApiKeys();

  // 1. 检查localStorage中已验证的密钥
  if (stored[`${service}ApiKey`] && stored.isValid[service]) {
    return stored[`${service}ApiKey`];
  }

  // 2. 检查环境变量
  const envKey = service === 'openrouter'
    ? import.meta.env.VITE_OPENROUTER_API_KEY
    : import.meta.env.VITE_CRSAI_API_KEY;

  if (envKey) return envKey;

  // 3. 对于CRSAI，返回常量中的空字符串
  // 注意：需要从constants.ts导入CRSAI_API_KEY
  return service === 'crsai' ? '' : '';
};

/**
 * 检查是否有任何有效的API密钥
 */
export const hasValidApiKey = (): boolean => {
  const stored = getStoredApiKeys();
  return stored.isValid.openRouter || stored.isValid.crsai;
};

/**
 * 获取当前有效的服务类型
 */
export const getActiveService = (): 'openrouter' | 'crsai' | null => {
  const stored = getStoredApiKeys();
  if (stored.isValid.openRouter) return 'openrouter';
  if (stored.isValid.crsai) return 'crsai';
  return null;
};