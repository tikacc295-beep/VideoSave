import React, { useState } from 'react';
import PlusIcon from './icons/PlusIcon';

interface ManualAddFormProps {
  onAddPage: (url: string) => void;
}

const ManualAddForm: React.FC<ManualAddFormProps> = ({ onAddPage }) => {
  const [url, setUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      try {
        new URL(url);
        onAddPage(url.trim());
        setUrl('');
      } catch (error) {
        alert('Please enter a valid URL (e.g., https://example.com)');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-center">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/page"
        className="flex-grow w-full bg-slate-700 text-slate-100 border-2 border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
        required
      />
      <button
        type="submit"
        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-5 rounded-lg transition-colors"
      >
        <PlusIcon />
        <span>Add</span>
      </button>
    </form>
  );
};

export default ManualAddForm;