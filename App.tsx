import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { ProgressBar } from './components/ProgressBar';
import { ComicViewer } from './components/ComicViewer';
import { AppStatus, ProcessingState, ComicPage } from './types';
import { analyzePaper, planStory, generateComicPage } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [isCheckingKey, setIsCheckingKey] = useState<boolean>(true);

  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: AppStatus.IDLE,
    progress: 0,
    totalSteps: 0,
    currentStep: 0,
  });

  const [comicPages, setComicPages] = useState<ComicPage[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<string>('');

  useEffect(() => {
    const checkKey = async () => {
      try {
        if ((window as any).aistudio?.hasSelectedApiKey) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          setHasApiKey(hasKey);
        } else {
          // Fallback for environments without the aistudio object
          setHasApiKey(true);
        }
      } catch (e) {
        console.error("Error checking API key status", e);
      } finally {
        setIsCheckingKey(false);
      }
    };
    checkKey();
  }, []);

  const handleApiKeySelect = async () => {
    if ((window as any).aistudio?.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

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
      // Step 1: Analyze
      console.log("Starting analysis...");
      const summary = await analyzePaper(fileBase64, mimeType);
      setAnalysisSummary(summary);
      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.PLANNING,
        progress: 20,
        currentStep: 2
      }));

      // Step 2: Plan
      console.log("Planning story...", summary);
      const plan = await planStory(summary);
      console.log("Plan generated:", plan);
      
      const totalPages = plan.length;
      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.GENERATING_IMAGES,
        progress: 30,
        totalSteps: totalPages,
        currentStep: 0 // Reset for image loop
      }));

      // Step 3: Generate Images (Loop)
      const pages: ComicPage[] = [];
      
      for (let i = 0; i < totalPages; i++) {
        const pagePlan = plan[i];
        
        // Update status for current page
        setProcessingState(prev => ({
          ...prev,
          currentStep: i + 1,
          progress: 30 + ((i / totalPages) * 70) // Distribute remaining 70% progress
        }));

        console.log(`Generating page ${pagePlan.pageNumber}...`);
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
        errorMessage.includes("invalid authentication credentials")
      ) {
        setHasApiKey(false);
        setProcessingState(prev => ({
          ...prev,
          status: AppStatus.IDLE // Reset to idle so they see the login screen
        }));
        alert("Authentication session expired or invalid. Please select your API Key again.");
        return;
      }

      setProcessingState(prev => ({
        ...prev,
        status: AppStatus.ERROR,
        error: errorMessage
      }));
    }
  };

  if (isCheckingKey) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-blue-600 font-bold text-xl animate-pulse">Initializing...</div>
      </div>
    );
  }

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border-4 border-blue-100">
          <div className="text-5xl mb-6">🔐</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-4 font-comic-font">
            Authentication Required
          </h1>
          <p className="text-slate-600 mb-8">
            To generate high-quality comics using <strong>Gemini 3 Pro</strong>, please connect your Google Cloud API Key.
          </p>
          
          <button 
            onClick={handleApiKeySelect}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-500 transition-all transform hover:scale-105 mb-4"
          >
            Connect API Key
          </button>
          
          <div className="text-xs text-slate-400 mt-4">
            <p>Requires a paid GCP project key.</p>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Learn more about billing
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto text-center">
        <header className="mb-12">
          <h1 className="text-5xl font-extrabold text-blue-900 mb-4 tracking-tight drop-shadow-sm font-comic-font">
            Doraemon Paper Comicizer
          </h1>
          <p className="text-xl text-blue-600 font-medium">
            Turn boring papers into fun comics with the help of Gemini!
          </p>
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
  );
};

export default App;