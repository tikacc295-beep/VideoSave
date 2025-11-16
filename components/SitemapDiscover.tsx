import React, { useState } from 'react';

interface SitemapDiscoverProps {
    onDiscover: (sitemapUrl: string) => void;
    isLoading: boolean;
    progress: {
        processed: number;
        total: number;
        found: number;
    }
}

const SitemapDiscover: React.FC<SitemapDiscoverProps> = ({ onDiscover, isLoading, progress }) => {
    const [sitemapUrl, setSitemapUrl] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (sitemapUrl.trim()) {
            onDiscover(sitemapUrl);
        }
    }
    
    const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

    return (
        <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
            <h2 className="text-2xl font-bold text-indigo-400 mb-4">Sitemap Discovery</h2>
            <p className="text-slate-400 mb-4 text-sm">Automatically find and add all unindexed pages from your sitemap.</p>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="url"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    placeholder="https://example.com/sitemap.xml"
                    className="flex-grow w-full bg-slate-700 text-slate-100 border-2 border-slate-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    required
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-5 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed"
                    disabled={isLoading}
                >
                    {isLoading ? 'Scanning...' : 'Scan'}
                </button>
            </form>
            {isLoading && (
                 <div className="mt-4">
                    <div className="w-full bg-slate-700 rounded-full h-2.5">
                        <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progressPercentage}%`, transition: 'width 0.3s ease-in-out' }}></div>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                        <span>{`Processed: ${progress.processed} / ${progress.total}`}</span>
                        <span>{`Found: ${progress.found} new pages`}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SitemapDiscover;
