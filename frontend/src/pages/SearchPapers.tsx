import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PaperCard from '../components/PaperCard';
import { apiSearch, apiGetWorkspaces } from '../utils/api';

export default function SearchPapers() {
  const [query, setQuery]       = useState('');
  const [submitted, setSubmitted] = useState('');
  const [workspaceId, setWorkspaceId] = useState<number | ''>('');

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
  });

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', submitted, workspaceId],
    queryFn: () => apiSearch(submitted, workspaceId as number).then(r => r.data),
    enabled: !!submitted && !!workspaceId,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && workspaceId) setSubmitted(query.trim());
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Search Papers</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Hybrid search across arXiv, IEEE, PubMed, Semantic Scholar, CrossRef, Springer & ACM
          </p>
        </div>

        {/* Search form */}
        <form onSubmit={handleSearch} className="flex gap-3 mb-6 flex-wrap">
          <select value={workspaceId} onChange={e => setWorkspaceId(Number(e.target.value))}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none min-w-45">
            <option value="">Select workspace</option>
            {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
          </select>
          <div className="flex-1 relative min-w-55">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="e.g. transformer attention mechanism…"
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
          </div>
          <button type="submit" disabled={!query.trim() || !workspaceId || isLoading}
            className="px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium text-sm">
            {isLoading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {!workspaceId && (
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">Select a workspace to search within.</p>
        )}

        {/* Results */}
        {isLoading && (
          <div className="flex flex-col items-center py-20 text-slate-400">
            <Loader2 size={36} className="animate-spin mb-3" />
            <p className="text-sm">Querying 7 academic sources…</p>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm">
            <AlertCircle size={16} />
            {(error as any)?.response?.data?.detail ?? 'Search failed. Please try again.'}
          </div>
        )}

        {data && (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-800 dark:text-white">{data.total}</span> results for "{data.query}"
              </p>
              <div className="flex flex-wrap gap-1">
                {data.sources_used.map(s => (
                  <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{s}</span>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              {data.results.map((paper, i) => (
                <PaperCard key={i} paper={paper} defaultWorkspaceId={workspaceId as number} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
