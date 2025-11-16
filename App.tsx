import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Page, IndexingStatus } from './types';
import Header from './components/Header';
import ManualAddForm from './components/AddPageForm';
import PageList from './components/PageList';
import SeoHelperModal from './components/SeoHelperModal';
import StatusSummary from './components/StatusSummary';
import SitemapDiscover from './components/SitemapDiscover';

// ==================================================================================
// ОБЯЗАТЕЛЬНО: Вставьте сюда НОВЫЙ Client ID после его создания
// ==================================================================================
const CLIENT_ID = 'PASTE_YOUR_NEW_CLIENT_ID_HERE.apps.googleusercontent.com'; // <-- ВСТАВЬТЕ СЮДА ВАШ НОВЫЙ CLIENT ID
const API_KEY = 'AIzaSyDWtpv39WEVxCjv7oPU9HxjBavnaQWlX9I';
// ==================================================================================

const SCOPES = 'https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/indexing';

declare global {
  interface Window {
    gapi: any;
    google: any;
    tokenClient: any;
  }
}

const App: React.FC = () => {
  const [pages, setPages] = useState<Page[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [gapiReady, setGapiReady] = useState(false);
  const [siteUrl, setSiteUrl] = useState('');
  const [tempSiteUrl, setTempSiteUrl] = useState('');

  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState({ processed: 0, total: 0, found: 0 });

  useEffect(() => {
    try {
      const storedPages = localStorage.getItem('indexer-pages');
      if (storedPages) {
        setPages(JSON.parse(storedPages));
      }
      const storedSiteUrl = localStorage.getItem('indexer-siteUrl');
      if (storedSiteUrl) {
        setSiteUrl(storedSiteUrl);
        setTempSiteUrl(storedSiteUrl);
      }
    } catch (error) {
      console.error("Failed to load data from local storage:", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('indexer-pages', JSON.stringify(pages));
      localStorage.setItem('indexer-siteUrl', siteUrl);
    } catch (error) {
      console.error("Failed to save data to local storage:", error);
    }
  }, [pages, siteUrl]);

  const initGapiClient = useCallback(async () => {
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/searchconsole/v1/rest'],
    });
    setGapiReady(true);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (window.gapi && window.google?.accounts?.oauth2) {
        clearInterval(intervalId);
        window.gapi.load('client', initGapiClient);
        window.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          callback: (tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              setIsSignedIn(true);
              window.gapi.client.setToken(tokenResponse);
            }
          },
        });
      }
    }, 100);
    return () => clearInterval(intervalId);
  }, [initGapiClient]);

  const handleAuthClick = () => window.tokenClient?.requestAccessToken({ prompt: 'consent' });
  const handleSignoutClick = () => {
    const token = window.gapi.client.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken(null);
        setIsSignedIn(false);
      });
    }
  };

  const handleSiteUrlSave = () => {
    if (tempSiteUrl.startsWith('http') || tempSiteUrl.startsWith('sc-domain:')) {
      setSiteUrl(tempSiteUrl);
    } else {
      alert("Please enter a valid URL (e.g., https://example.com) or domain property (e.g., sc-domain:example.com)");
    }
  };

  const addPage = useCallback((url: string) => {
    if (url && !pages.some(p => p.url === url)) {
      const newPage: Page = { id: crypto.randomUUID(), url, status: IndexingStatus.PENDING, lastSubmitted: null };
      setPages(prev => [...prev, newPage]);
    }
  }, [pages]);

  const removePage = useCallback((id: string) => setPages(prev => prev.filter(p => p.id !== id)), []);

  const submitPageForIndexing = useCallback(async (id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page) return;
    setPages(prev => prev.map(p => p.id === id ? { ...p, status: IndexingStatus.SUBMITTED, lastSubmitted: new Date().toISOString() } : p));
    try {
      const response = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${window.gapi.client.getToken().access_token}`,
        },
        body: JSON.stringify({ url: page.url, type: 'URL_UPDATED' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);
      setTimeout(() => checkPageIndex(id), 30000);
    } catch (error) {
      console.error('Failed to submit for indexing:', error);
      alert(`Error submitting for indexing: ${error}`);
      setPages(prev => prev.map(p => p.id === id ? { ...p, status: IndexingStatus.FAILED } : p));
    }
  }, [pages]);

  const checkPageIndex = useCallback(async (id: string) => {
    const page = pages.find(p => p.id === id);
    if (!page || !siteUrl) return;
    try {
      const response = await window.gapi.client.searchconsole.urlInspection.index.inspect({ inspectionUrl: page.url, siteUrl });
      const verdict = response.result?.inspectionResult?.indexStatusResult?.verdict;
      let newStatus = IndexingStatus.FAILED;
      if (verdict === 'PASS') newStatus = IndexingStatus.INDEXED;
      else if (['NEUTRAL', 'UNKNOWN'].includes(verdict)) newStatus = IndexingStatus.PENDING;
      setPages(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    } catch (error: any) {
      console.error('Error checking page index:', error);
      alert(`Error checking status: ${error?.result?.error?.message || error.toString()}`);
      setPages(prev => prev.map(p => p.id === id ? { ...p, status: IndexingStatus.FAILED } : p));
    }
  }, [pages, siteUrl]);

  const handleDiscoverPages = useCallback(async (sitemapUrl: string) => {
    setIsDiscovering(true);
    setDiscoveryProgress({ processed: 0, total: 0, found: 0 });

    try {
      // Use a CORS proxy for fetching the sitemap
      const response = await fetch(`https://cors-anywhere.herokuapp.com/${sitemapUrl}`);
      if (!response.ok) throw new Error(`Failed to fetch sitemap. Status: ${response.statusText}`);
      const xmlText = await response.text();
      const urls = xmlText.match(/<loc>(.*?)<\/loc>/g)?.map(tag => tag.replace(/<\/?loc>/g, '')) || [];
      if (urls.length === 0) {
        alert('No URLs found in the sitemap.');
        return;
      }
      setDiscoveryProgress(prev => ({ ...prev, total: urls.length }));
      let foundCount = 0;
      for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        if (!pages.some(p => p.url === url)) {
          const inspectionResponse = await window.gapi.client.searchconsole.urlInspection.index.inspect({ inspectionUrl: url, siteUrl });
          if (inspectionResponse.result?.inspectionResult?.indexStatusResult?.verdict !== 'PASS') {
            foundCount++;
            setPages(prevPages => [...prevPages, { id: crypto.randomUUID(), url, status: IndexingStatus.PENDING, lastSubmitted: null }]);
          }
        }
        setDiscoveryProgress(prev => ({ ...prev, processed: i + 1, found: foundCount }));
      }
    } catch (error) {
      console.error("Sitemap discovery failed:", error);
      alert(`Sitemap discovery failed: ${error}. Make sure CORS Anywhere access is enabled if needed.`);
    } finally {
      setIsDiscovering(false);
    }
  }, [pages, siteUrl]);


  const submitAllPendingPages = () => pages.forEach(p => p.status !== IndexingStatus.INDEXED && submitPageForIndexing(p.id));
  const checkAllStatuses = () => pages.forEach(p => checkPageIndex(p.id));
  const openSeoModal = (page: Page) => { setSelectedPage(page); setIsModalOpen(true); };
  const closeSeoModal = () => { setIsModalOpen(false); setSelectedPage(null); };

  const stats = useMemo(() => pages.reduce((acc, page) => {
    acc.total++;
    acc[page.status.toLowerCase()]++;
    return acc;
  }, { total: 0, indexed: 0, pending: 0, submitted: 0, failed: 0 }), [pages]);

  const renderContent = () => {
    if (!gapiReady) return <div className="text-center p-10">Loading Google API...</div>;
    if (!isSignedIn) return (
      <div className="max-w-md mx-auto mt-20 text-center bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Authentication Required</h2>
        <p className="text-slate-400 mb-6">Sign in with Google to manage site indexing.</p>
        <button onClick={handleAuthClick} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">Sign in with Google</button>
      </div>
    );
    if (!siteUrl) return (
      <div className="max-w-md mx-auto mt-20 bg-slate-800 p-8 rounded-lg shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-bold text-indigo-400 mb-4">Configure Your Site</h2>
        <p className="text-slate-400 mb-6">Enter your site property from Google Search Console (e.g., https://example.com/ or sc-domain:example.com).</p>
        <div className="flex gap-2">
          <input type="text" value={tempSiteUrl} onChange={e => setTempSiteUrl(e.target.value)} placeholder="https://your-website.com/" className="flex-grow w-full bg-slate-700 text-slate-100 border-2 border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <button onClick={handleSiteUrlSave} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg transition-colors">Save</button>
        </div>
        <button onClick={handleSignoutClick} className="text-sm text-slate-500 hover:text-slate-300 mt-6 w-full text-center">Sign out</button>
      </div>
    );
    return (
      <main className="container mx-auto p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <p className="text-slate-400">Site: <strong className="font-bold text-indigo-400">{siteUrl}</strong></p>
          <button onClick={handleSignoutClick} className="text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-1 px-3 rounded-md">Sign Out</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 flex flex-col gap-8">
             <SitemapDiscover onDiscover={handleDiscoverPages} isLoading={isDiscovering} progress={discoveryProgress} />
            <div className="bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-indigo-400 mb-4">Add Page Manually</h2>
              <ManualAddForm onAddPage={addPage} />
            </div>
          </div>
          <div className="lg:col-span-2 bg-slate-800 rounded-xl shadow-2xl p-6 border border-slate-700">
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
              <h2 className="text-3xl font-bold text-indigo-400">Indexing Queue</h2>
              <div className="flex gap-2 flex-wrap">
                <button onClick={checkAllStatuses} disabled={pages.length === 0} className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">Check All</button>
                <button onClick={submitAllPendingPages} disabled={!pages.some(p => p.status !== IndexingStatus.INDEXED)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-slate-600 disabled:cursor-not-allowed">Submit All</button>
              </div>
            </div>
            <StatusSummary stats={stats} />
            <PageList pages={pages} onRemovePage={removePage} onSubmitPage={submitPageForIndexing} onCheckStatusPage={checkPageIndex} onAnalyzePage={openSeoModal} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 font-sans">
      <Header />
      {renderContent()}
      {isModalOpen && selectedPage && <SeoHelperModal page={selectedPage} onClose={closeSeoModal} />}
    </div>
  );
};

export default App;