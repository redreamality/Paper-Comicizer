import React, { useState, useEffect } from 'react';
import { X, CheckCircle, XCircle, Loader2, Key, Shield } from 'lucide-react';
import { ServiceType } from '../types/apiKeyTypes';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (openRouterKey: string, crsaiKey: string, selectedService: ServiceType) => Promise<{ openRouter: boolean; crsai: boolean }>;
  initialOpenRouterKey?: string;
  initialCrsaiKey?: string;
  initialService?: ServiceType;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialOpenRouterKey = '',
  initialCrsaiKey = '',
  initialService = 'openrouter'
}) => {
  const [openRouterKey, setOpenRouterKey] = useState(initialOpenRouterKey);
  const [crsaiKey, setCrsaiKey] = useState(initialCrsaiKey);
  const [selectedService, setSelectedService] = useState<ServiceType>(initialService);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<{
    openRouter: boolean | null;
    crsai: boolean | null;
  }>({ openRouter: null, crsai: null });
  const [saveError, setSaveError] = useState<string | null>(null);

  // 当初始值变化时更新状态
  useEffect(() => {
    setOpenRouterKey(initialOpenRouterKey);
    setCrsaiKey(initialCrsaiKey);
    setSelectedService(initialService);
  }, [initialOpenRouterKey, initialCrsaiKey, initialService]);

  // 重置验证状态
  useEffect(() => {
    if (!isOpen) {
      setValidationResults({ openRouter: null, crsai: null });
      setSaveError(null);
    }
  }, [isOpen]);

  const handleSave = async () => {
    if (!openRouterKey.trim() && !crsaiKey.trim()) {
      setSaveError('Please enter at least one API key');
      return;
    }

    setIsValidating(true);
    setSaveError(null);

    try {
      const results = await onSave(openRouterKey, crsaiKey, selectedService);
      setValidationResults(results);

      // 如果至少有一个密钥有效，关闭模态框
      if (results.openRouter || results.crsai) {
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save API keys');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    if (!isValidating) {
      onClose();
    }
  };

  // 按ESC键关闭模态框
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isValidating) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isValidating, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Key className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">API Key Configuration</h2>
          </div>
          <button
            onClick={handleClose}
            disabled={isValidating}
            className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-6">
          {/* OpenRouter API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="openrouter-key" className="block text-sm font-medium text-gray-700">
                OpenRouter API Key
              </label>
              {validationResults.openRouter !== null && (
                <div className="flex items-center space-x-1">
                  {validationResults.openRouter ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">Invalid</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <input
                id="openrouter-key"
                type="password"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                placeholder="sk-or-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isValidating}
                aria-describedby="openrouter-help"
              />
              {openRouterKey && (
                <button
                  type="button"
                  onClick={() => setOpenRouterKey('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear OpenRouter API key"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p id="openrouter-help" className="text-xs text-gray-500">
              <strong className="text-blue-700">🔄 Required for Hybrid Mode:</strong> Used for PDF analysis and story planning (supports multimodal). Get your key from{' '}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                openrouter.ai/keys
              </a>
            </p>
          </div>

          {/* CRSAI API Key */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="crsai-key" className="block text-sm font-medium text-gray-700">
                CRSAI API Key (Optional)
              </label>
              {validationResults.crsai !== null && (
                <div className="flex items-center space-x-1">
                  {validationResults.crsai ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-xs text-green-600">Valid</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <span className="text-xs text-red-600">Invalid</span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="relative">
              <input
                id="crsai-key"
                type="password"
                value={crsaiKey}
                onChange={(e) => setCrsaiKey(e.target.value)}
                placeholder="Your CRSAI API key"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isValidating}
                aria-describedby="crsai-help"
              />
              {crsaiKey && (
                <button
                  type="button"
                  onClick={() => setCrsaiKey('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear CRSAI API key"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <p id="crsai-help" className="text-xs text-gray-500">
              <strong className="text-green-700">⚡ Optional for Hybrid Mode:</strong> Use CRSAI's Nano Banana model for faster/cheaper image generation. OpenRouter handles PDF analysis automatically.
            </p>
          </div>

          {/* Service Selection */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Image Generation Service
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedService('openrouter')}
                disabled={isValidating}
                className={`
                  p-4 rounded-xl border-2 text-center transition-colors
                  ${selectedService === 'openrouter'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
              >
                <div className="font-medium">OpenRouter</div>
                <div className="text-xs mt-1">✨ All-in-one</div>
              </button>
              <button
                type="button"
                onClick={() => setSelectedService('crsai')}
                disabled={isValidating || !crsaiKey.trim()}
                className={`
                  p-4 rounded-xl border-2 text-center transition-colors
                  ${selectedService === 'crsai'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }
                  ${!crsaiKey.trim() ? 'opacity-50 cursor-not-allowed' : ''}
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                title={!crsaiKey.trim() ? "Enter CRSAI API key to enable" : ""}
              >
                <div className="font-medium">CRSAI</div>
                <div className="text-xs mt-1">⚡ Fast images</div>
              </button>
            </div>
            <p className="text-xs text-gray-500 italic">
              💡 Note: PDF analysis always uses OpenRouter (multimodal support)
            </p>
          </div>

          {/* 错误信息 */}
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-center space-x-2 text-red-700">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm">{saveError}</span>
              </div>
            </div>
          )}

          {/* 安全提示 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start space-x-2">
              <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Your API keys are stored locally</p>
                <p className="mt-1">Keys are saved in your browser's localStorage and never sent to our servers.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isValidating}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isValidating || (!openRouterKey.trim() && !crsaiKey.trim())}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <span>Save & Validate</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};