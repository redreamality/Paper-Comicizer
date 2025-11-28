import React, { useCallback, useState } from 'react';

interface FileUploadProps {
  onFileSelect: (fileBase64: string, mimeType: string) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 data (remove "data:application/pdf;base64," prefix)
      const base64Data = result.split(',')[1];
      onFileSelect(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-4 border-dashed rounded-3xl p-12 text-center transition-all duration-300
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-white'}
          ${isLoading ? 'opacity-50 pointer-events-none' : 'hover:border-blue-400'}
        `}
      >
        <div className="mb-6">
          <svg className="w-20 h-20 mx-auto text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-slate-700 mb-2">Upload Academic Paper</h3>
        <p className="text-slate-500 mb-6">Drag & drop your PDF here, or click to browse</p>
        
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />
        
        <button className="px-8 py-3 bg-blue-500 text-white rounded-full font-bold shadow-lg transform transition hover:scale-105">
          Select PDF
        </button>
      </div>
    </div>
  );
};