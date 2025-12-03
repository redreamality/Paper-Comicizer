import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProgressBar } from './components/ProgressBar';
import { ComicViewer } from './components/ComicViewer';
import { SettingsButton } from './components/SettingsButton';
import { ApiKeyModal } from './components/ApiKeyModal';
import { SettingsProvider, useApiKeys } from './components/SettingsProvider';
import { AppStatus, ProcessingState, ComicPage } from './types';
import { analyzePaper as analyzePaperOpenRouter, planStory as planStoryOpenRouter, generateComicPage as generateComicPageOpenRouter } from './services/geminiService';
import { analyzePaper as analyzePaperCRSAI, planStory as planStoryCRSAI, generateComicPage as generateComicPageCRSAI } from './services/crsaiService';
import { getStoredApiKeys, hasValidApiKey } from './services/apiKeyService';

type ApiService = 'openrouter' | 'crsai';

// 内部组件，使用SettingsProvider的上下文
const AppContent: React.FC = () => {
  const {
    openRouterApiKey,
    crsaiApiKey,
    isValid,
    setApiKeys,
    isModalOpen,
    openModal,
    closeModal
  } = useApiKeys();

  const [apiService, setApiService] = useState<ApiService>('openrouter');
  const [hasApiKey, setHasApiKey] = useState<boolean>(() => {
    // 检查是否有任何有效的API密钥
    return hasValidApiKey();
  });

  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: AppStatus.IDLE,
    progress: 0,
    totalSteps: 0,
    currentStep: 0,
  });

  const [comicPages, setComicPages] = useState<ComicPage[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');

  const handleFileSelect = async (fileBase64: string, mimeType: string) => {
    // Reset state
    setComicPages([]);
    setAnalysisSummary('');
    setProcessingState({
      status: AppStatus.ANALYZING,
      progress: 5,
      totalSteps: 3,
      currentStep: 1,
    });

    try {
      // 混合方案：OpenRouter用于PDF分析和文本处理，CRSAI用于图像生成
      // Hybrid approach: OpenRouter for PDF analysis and text, CRSAI for image generation

      // Step 1: Analyze - 始终使用OpenRouter（支持PDF多模态）
      // Always use OpenRouter for analysis (supports PDF multimodal)
      console.log('Starting analysis with OpenRouter (PDF support)...');
      const summary = await analyzePaperOpenRouter(fileBase64, mimeType);
      setAnalysisSummary(summary);
      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.PLANNING,
        progress: 20,
        currentStep: 2
      }));

      // Step 2: Plan - 始终使用OpenRouter（文本处理稳定）
      // Always use OpenRouter for planning (stable text processing)
      console.log("Planning story with OpenRouter...", summary);
      const plan = await planStoryOpenRouter(summary);
      console.log("Plan generated:", plan);

      const totalPages = plan.length;
      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.GENERATING_IMAGES,
        progress: 30,
        totalSteps: totalPages,
        currentStep: 0 // Reset for image loop
      }));

      // Step 3: Generate Images - 根据用户选择的服务
      // Use selected service for image generation
      const generateComicPage = apiService === 'crsai' ? generateComicPageCRSAI : generateComicPageOpenRouter;
      const imageServiceName = apiService === 'crsai' ? 'CRSAI (nano-banana)' : 'OpenRouter (Gemini)';

      const pages: ComicPage[] = [];

      for (let i = 0; i < totalPages; i++) {
        const pagePlan = plan[i];

        // Update status for current page
        setProcessingState(prev => ({
          ...prev,
          currentStep: i + 1,
          progress: 30 + ((i / totalPages) * 70) // Distribute remaining 70% progress
        }));

        console.log(`Generating page ${pagePlan.pageNumber} with ${imageServiceName}...`);
        const generatedPage = await generateComicPage(summary, pagePlan);
        pages.push(generatedPage);

        // Update local pages state to allow progressive loading
        setComicPages([...pages]);
      }

      // Complete
      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.COMPLETE,
        progress: 100
      }));

    } catch (error: any) {
      console.error("Workflow failed", error);

      const errorMessage = error.message || JSON.stringify(error);

      // Check for authentication errors to trigger re-auth flow
      if (
        errorMessage.includes("UNAUTHENTICATED") ||
        errorMessage.includes("401") ||
        errorMessage.includes("Requested entity was not found") ||
        errorMessage.includes("invalid authentication credentials") ||
        errorMessage.includes("API Key not found") ||
        errorMessage.includes("Please configure your API key")
      ) {
        setHasApiKey(false);
        setProcessingState(prev => ({
          ...prev,
          status: AppStatus.IDLE // Reset to idle
        }));

        // 打开设置弹框而不是显示alert
        openModal();

        // 显示用户友好的错误信息
        const serviceName = apiService === 'crsai' ? 'CRSAI' : 'OpenRouter';
        console.error(`${serviceName} API Key is missing or invalid. Please configure your API key in the settings.`);
        return;
      }

      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.ERROR,
        error: errorMessage
      }));
    }
  };

  // 当没有有效API密钥时，显示引导界面
  if (!hasApiKey) {
    return (
      <>
        <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-4 border-blue-100">
            <div className="text-5xl mb-6">🔑</div>
            <h1 className="text-2xl font-bold text-slate-900 mb-4 font-comic-font">
              API Key Required
            </h1>
            <p className="text-slate-600 mb-6">
              To use Paper Comicizer, you need to configure at least one API key.
              Click the settings button in the top right corner to get started.
            </p>

            <div className="space-y-4 mb-8">
              <div className="bg-blue-50 rounded-2xl p-4 text-left text-sm text-blue-700">
                <div className="font-bold mb-2">OpenRouter (Recommended)</div>
                <p>For text analysis and image generation. Get your key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="underline">openrouter.ai/keys</a></p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-left text-sm text-green-700">
                <div className="font-bold mb-2">CRSAI (Optional)</div>
                <p>Alternative AI service for both text analysis and image generation.</p>
              </div>
            </div>

            <button
              onClick={openModal}
              className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105"
            >
              Configure API Keys
            </button>
          </div>
        </div>

        {/* 设置弹框 */}
        <ApiKeyModal
          isOpen={isModalOpen}
          onClose={closeModal}
          onSave={async (openRouterKey, crsaiKey, selectedService) => {
            const results = await setApiKeys(openRouterKey, crsaiKey);
            // 如果保存成功，更新hasApiKey状态
            if (results.openRouter || results.crsai) {
              setHasApiKey(true);
            }
            return results;
          }}
          initialOpenRouterKey={openRouterApiKey}
          initialCrsaiKey={crsaiApiKey}
          initialService={apiService}
        />
      </>
    );
  }

  return (
    <div>
      {/* 设置按钮 */}
      <SettingsButton onClick={openModal} />

      {/* 设置弹框 */}
      <ApiKeyModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={async (openRouterKey, crsaiKey, selectedService) => {
          const results = await setApiKeys(openRouterKey, crsaiKey);
          // 如果用户选择了不同的服务，更新apiService状态
          if (selectedService !== apiService) {
            setApiService(selectedService);
          }
          return results;
        }}
        initialOpenRouterKey={openRouterApiKey}
        initialCrsaiKey={crsaiApiKey}
        initialService={apiService}
      />

      <div className="min-h-screen bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <header className="mb-12">
            <h1 className="text-5xl font-extrabold text-blue-900 mb-4 tracking-tight drop-shadow-sm font-comic-font">
              AGI比特君 哆啦A梦漫画测试
            </h1>
            <p className="text-xl text-blue-600 font-medium">
              Turn boring papers into fun comics with the help of AI!
            </p>

            {/* API Service Selector - 现在在弹框中配置，这里只显示当前状态 */}
            <div className="mt-8 max-w-md mx-auto">
              <div className="bg-white p-4 rounded-xl shadow-md border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Current Configuration:
                  </label>
                  <button
                    onClick={openModal}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Change
                  </button>
                </div>
                <div className="space-y-2 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">OpenRouter:</span>
                    <span className={`text-sm font-medium ${isValid.openRouter ? 'text-green-600' : 'text-red-600'}`}>
                      {isValid.openRouter ? '✓ Configured' : '✗ Not configured'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">CRSAI:</span>
                    <span className={`text-sm font-medium ${isValid.crsai ? 'text-green-600' : 'text-gray-600'}`}>
                      {isValid.crsai ? '✓ Configured' : 'Optional'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Image Service:</span>
                    <span className="text-sm font-medium text-blue-600">
                      {apiService === 'openrouter' ? 'OpenRouter (Gemini)' : 'CRSAI (Nano Banana)'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                  <div className="font-semibold mb-1">🔄 Hybrid Mode Active</div>
                  <ul className="space-y-1 text-xs">
                    <li>📄 <strong>PDF Analysis:</strong> OpenRouter (Gemini) - supports multimodal</li>
                    <li>📝 <strong>Story Planning:</strong> OpenRouter (Gemini)</li>
                    <li>🎨 <strong>Image Generation:</strong> {apiService === 'openrouter' ? 'OpenRouter (Gemini)' : 'CRSAI (Nano Banana)'}</li>
                  </ul>
                  <div className="mt-2 text-xs italic">
                    {apiService === 'openrouter' ? (
                      <span>✨ All-in-one: Full OpenRouter workflow</span>
                    ) : (
                      <span>⚡ Best of both: OpenRouter for PDF + CRSAI for images</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main>
            {processingState.status === AppStatus.IDLE && (
              <div className="animate-fade-in-up">
                <FileUpload
                  onFileSelect={handleFileSelect}
                  isLoading={false}
                />
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl mx-auto">
                  <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-blue-400">
                    <div className="text-3xl mb-2">📄</div>
                    <h3 className="font-bold text-lg mb-2">1. Upload Paper</h3>
                    <p className="text-slate-600">Upload any academic PDF. We support research papers, essays, and technical documents.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-yellow-400">
                    <div className="text-3xl mb-2">🤖</div>
                    <h3 className="font-bold text-lg mb-2">2. AI Analysis</h3>
                    <p className="text-slate-600">Doraemon reads the paper and summarizes the key concepts for Nobita (and you!).</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-md border-b-4 border-red-400">
                    <div className="text-3xl mb-2">🎨</div>
                    <h3 className="font-bold text-lg mb-2">3. Comic Generation</h3>
                    <p className="text-slate-600">We generate a unique visual story to explain the complex topics step-by-step.</p>
                  </div>
                </div>
              </div>
            )}

            {processingState.status !== AppStatus.IDLE && processingState.status !== AppStatus.COMPLETE && (
              <ProgressBar state={processingState} />
            )}

            {processingState.status === AppStatus.ERROR && (
              <div className="mt-8 p-6 bg-red-100 text-red-700 rounded-xl max-w-2xl mx-auto border border-red-200">
                <h3 className="font-bold text-xl mb-2">Error</h3>
                <p>{processingState.error || "An unexpected error occurred."}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  Try Again
                </button>
              </div>
            )}

            {comicPages.length > 0 && (
              <div className="animate-fade-in">
                <ComicViewer pages={comicPages} />
                {processingState.status === AppStatus.COMPLETE && (
                  <div className="mt-8">
                    <button
                      onClick={() => window.location.reload()}
                      className="px-8 py-3 bg-slate-800 text-white rounded-full font-bold shadow-lg hover:bg-slate-700 transition"
                    >
                      Process Another Paper
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// 主App组件，包装SettingsProvider
const App: React.FC = () => {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
};

export default App;
