import React, { useState, useEffect } from 'react';
import { Page } from '../types';
import { getSeoAdvice } from '../services/geminiService';
import SparklesIcon from './icons/SparklesIcon';

interface SeoHelperModalProps {
  page: Page;
  onClose: () => void;
}

const SeoHelperModal: React.FC<SeoHelperModalProps> = ({ page, onClose }) => {
  const [advice, setAdvice] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAdvice = async () => {
      setIsLoading(true);
      const result = await getSeoAdvice(page.url);
      setAdvice(result);
      setIsLoading(false);
    };

    fetchAdvice();
  }, [page.url]);

  const formatAdvice = (text: string) => {
    return text
      .split('\n')
      .map(line => {
        if (line.startsWith('- **') || line.startsWith('* **')) {
          return `<li class="mb-3 pl-2">${line.replace(/[-*]\s/, '').replace(/\*\*/g, '<strong>')}</li>`;
        }
        return line;
      })
      .join('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 transition-opacity duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-700 transform transition-transform duration-300 scale-95 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-indigo-400 flex items-center gap-3">
            <SparklesIcon />
            Gemini SEO Analysis
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <p className="text-slate-400 mb-4">
            AI Recommendations for: <strong className="text-white break-all">{page.url}</strong>
          </p>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
              <p className="text-slate-300 mt-4">Analyzing page with Gemini...</p>
            </div>
          ) : (
            <div className="prose prose-invert text-slate-300 max-w-none">
              <ul className="list-none p-0" dangerouslySetInnerHTML={{ __html: formatAdvice(advice) }} />
            </div>
          )}
        </div>
         <div className="p-4 bg-slate-900/50 border-t border-slate-700 rounded-b-2xl text-right">
            <button
                onClick={onClose}
                className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg transition-colors"
            >
                Close
            </button>
        </div>
      </div>
       <style>{`
        @keyframes scale-in {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-in { animation: scale-in 0.2s ease-out forwards; }
        .prose strong { color: #a5b4fc; } /* prose indigo-300 */
      `}</style>
    </div>
  );
};

export default SeoHelperModal;