import React, { useState } from 'react';
import { Page, IndexingStatus } from '../types';
import TrashIcon from './icons/TrashIcon';
import SparklesIcon from './icons/SparklesIcon';
import ClockIcon from './icons/ClockIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface PageItemProps {
  page: Page;
  onRemove: (id: string) => void;
  onSubmit: (id: string) => void;
  onCheckStatus: (id: string) => void;
  onAnalyze: (page: Page) => void;
}

const statusStyles: { [key in IndexingStatus]: { text: string; bg: string; border: string } } = {
  [IndexingStatus.PENDING]: { text: 'text-slate-300', bg: 'bg-slate-700/50', border: 'border-slate-600' },
  [IndexingStatus.SUBMITTED]: { text: 'text-blue-300', bg: 'bg-blue-900/50', border: 'border-blue-700' },
  [IndexingStatus.INDEXED]: { text: 'text-green-300', bg: 'bg-green-900/50', border: 'border-green-700' },
  [IndexingStatus.FAILED]: { text: 'text-red-300', bg: 'bg-red-900/50', border: 'border-red-700' },
};

const PageItem: React.FC<PageItemProps> = ({ page, onRemove, onSubmit, onCheckStatus, onAnalyze }) => {
  const [isChecking, setIsChecking] = useState(false);
  const style = statusStyles[page.status];
  
  const handleCheckStatus = async () => {
    setIsChecking(true);
    await onCheckStatus(page.id);
    setIsChecking(false);
  };
  
  const submittedDate = page.lastSubmitted ? new Date(page.lastSubmitted) : null;

  return (
    <div className={`p-4 rounded-lg border-l-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${style.bg} ${style.border}`}>
      <div className="flex-grow min-w-0">
        <p className="text-white font-medium truncate" title={page.url}>{page.url}</p>
        <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.bg} ${style.text} border ${style.border}`}>
             {page.status}
           </span>
           {submittedDate && (
             <p className="text-slate-400 text-xs">
               Submitted: {submittedDate.toLocaleDateString()}
             </p>
           )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 flex-shrink-0 flex-wrap">
        <button 
          onClick={handleCheckStatus}
          disabled={isChecking}
          className="flex items-center gap-2 text-sm bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-3 rounded-md transition-colors duration-200 disabled:bg-slate-500 disabled:cursor-wait"
        >
          {isChecking ? <><ClockIcon className="animate-spin h-4 w-4" /> Checking</> : <><CheckCircleIcon /> Check</>}
        </button>
        {page.status !== IndexingStatus.INDEXED && (
          <button 
            onClick={() => onSubmit(page.id)}
            className="text-sm bg-indigo-700 hover:bg-indigo-600 text-white font-semibold py-2 px-3 rounded-md transition-colors duration-200"
          >
            Index Now
          </button>
        )}
        <button onClick={() => onAnalyze(page)} className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-md transition-colors" title="Analyze with Gemini">
          <SparklesIcon />
        </button>
        <button onClick={() => onRemove(page.id)} className="p-2 bg-red-800 hover:bg-red-700 text-white rounded-md transition-colors" title="Remove Page">
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

export default PageItem;