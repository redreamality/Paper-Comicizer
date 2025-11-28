import React, { useState } from 'react';
import { ComicPage } from '../types';

interface ComicViewerProps {
  pages: ComicPage[];
}

export const ComicViewer: React.FC<ComicViewerProps> = ({ pages }) => {
  const [selectedPage, setSelectedPage] = useState<number>(0);

  if (pages.length === 0) return null;

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
    </div>
  );
};