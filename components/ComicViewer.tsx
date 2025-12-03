import React, { useState } from 'react';
import { ComicPage } from '../types';
import { exportComicToPDF } from '../utils/pdfExport';

interface ComicViewerProps {
  pages: ComicPage[];
}

export const ComicViewer: React.FC<ComicViewerProps> = ({ pages }) => {
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (pages.length === 0) return null;

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportComicToPDF(pages, 'Paper_Comicizer');
      // Success message could be added here
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('导出 PDF 失败，请重试。');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto mt-8 p-4">
      <div className="flex flex-col lg:flex-row gap-8 bg-white rounded-3xl shadow-2xl overflow-hidden p-6 border-4 border-slate-900">

        {/* Main Image Display */}
        <div className="flex-1 flex justify-center items-center bg-slate-100 rounded-xl p-4 min-h-[500px]">
          <img
            src={pages[selectedPage].imageUrl}
            alt={`Page ${pages[selectedPage].pageNumber}`}
            className="max-h-[80vh] object-contain rounded shadow-lg border-2 border-slate-800"
          />
        </div>

        {/* Navigation & Story Text */}
        <div className="lg:w-1/3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b-2 border-slate-200 pb-2">
              <h2 className="text-3xl font-bold font-comic-font text-blue-600">
                Page {pages[selectedPage].pageNumber}
              </h2>
              <span className="text-slate-400 font-bold">{selectedPage + 1} / {pages.length}</span>
            </div>

            <div className="prose prose-lg mb-8 text-slate-700 leading-relaxed font-comic-font">
              <p>{pages[selectedPage].description}</p>
            </div>
          </div>

          <div className="flex gap-4 justify-center mt-auto">
            <button
              onClick={() => setSelectedPage(Math.max(0, selectedPage - 1))}
              disabled={selectedPage === 0}
              className="flex-1 py-3 px-6 rounded-xl font-bold bg-yellow-400 text-slate-900 shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-yellow-300 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setSelectedPage(Math.min(pages.length - 1, selectedPage + 1))}
              disabled={selectedPage === pages.length - 1}
              className="flex-1 py-3 px-6 rounded-xl font-bold bg-blue-500 text-white shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-400 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Thumbnails */}
      <div className="mt-8 grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
        {pages.map((page, idx) => (
          <button
            key={page.pageNumber}
            onClick={() => setSelectedPage(idx)}
            className={`
              relative aspect-[3/4] rounded-lg overflow-hidden border-4 transition-transform hover:scale-105
              ${selectedPage === idx ? 'border-blue-500 ring-4 ring-blue-200' : 'border-transparent opacity-70 hover:opacity-100'}
            `}
          >
            <img
              src={page.imageUrl}
              alt={`Page ${page.pageNumber}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 right-0 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-tl-lg font-bold">
              {page.pageNumber}
            </div>
          </button>
        ))}
      </div>

      {/* Export PDF Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleExportPDF}
          disabled={isExporting}
          className="
            px-8 py-4
            bg-gradient-to-r from-green-500 to-green-600
            hover:from-green-600 hover:to-green-700
            text-white
            rounded-2xl
            font-bold
            text-lg
            shadow-xl
            disabled:opacity-50
            disabled:cursor-not-allowed
            transition-all
            transform
            hover:scale-105
            active:scale-95
            flex
            items-center
            gap-3
          "
        >
          {isExporting ? (
            <>
              <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>生成中...</span>
            </>
          ) : (
            <>
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>导出为 PDF</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};