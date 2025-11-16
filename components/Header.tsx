import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-slate-900/80 backdrop-blur-sm shadow-lg border-b border-slate-800 sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8 py-4">
        <h1 className="text-3xl md:text-4xl font-extrabold">
          <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">Auto Indexer</span>
        </h1>
        <p className="text-slate-500 mt-1">Sitemap-driven indexing queue for Google.</p>
      </div>
    </header>
  );
};

export default Header;