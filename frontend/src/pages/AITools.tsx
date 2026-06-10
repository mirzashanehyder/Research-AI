import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { BookOpen, TrendingUp, Quote, GitCompare, Lightbulb, FileText, Loader2, CheckSquare, Square } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  apiGetWorkspaces, apiGetPapers,
  apiReview, apiResearchGaps, apiCitations,
  apiCompare, apiRecommend, apiSummarize,
} from '../utils/api';

type Tool = 'summary' | 'review' | 'gaps' | 'citations' | 'compare' | 'recommend';

const TOOLS: { id: Tool; label: string; icon: any; desc: string; needsPapers: boolean }[] = [
  { id: 'summary',   label: 'Paper Summary',     icon: FileText,   desc: 'Concise summary of selected papers',          needsPapers: true },
  { id: 'review',    label: 'Literature Review',  icon: BookOpen,   desc: '5-section structured academic review',        needsPapers: false },
  { id: 'gaps',      label: 'Research Gaps',      icon: TrendingUp, desc: 'Identify 3-5 gaps from workspace papers',     needsPapers: false },
  { id: 'citations', label: 'Citations',          icon: Quote,      desc: 'IEEE, APA, MLA & Chicago for a paper',        needsPapers: true },
  { id: 'compare',   label: 'Compare Papers',     icon: GitCompare, desc: 'Markdown comparison table across papers',     needsPapers: true },
  { id: 'recommend', label: 'Recommendations',   icon: Lightbulb,  desc: '5-8 adjacent research topic suggestions',     needsPapers: false },
];

export default function AITools() {
  const [wsId, setWsId]       = useState<number | ''>('');
  const [activeTool, setActiveTool] = useState<Tool | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [topic, setTopic]     = useState('');
  const [result, setResult]   = useState<string | null>(null);

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
  });

  const { data: papers = [] } = useQuery({
    queryKey: ['papers', wsId],
    queryFn: () => apiGetPapers(wsId as number).then(r => r.data),
    enabled: !!wsId,
  });

  const toggle = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const runMutation = useMutation({
    mutationFn: async () => {
      switch (activeTool) {
        case 'summary':   return apiSummarize(selected).then(r => r.data.summary);
        case 'review':    return apiReview(wsId as number, topic).then(r => r.data.review);
        case 'gaps':      return apiResearchGaps(wsId as number).then(r => r.data.gaps);
        case 'citations': {
          const r = await apiCitations(selected[0]);
          const c = r.data.citations;
          return `**${r.data.title}**\n\nIEEE:\n${c['IEEE']}\n\nAPA:\n${c['APA']}\n\nMLA:\n${c['MLA']}\n\nChicago:\n${c['Chicago']}`;
        }
        case 'compare':   return apiCompare(selected).then(r => r.data.comparison);
        case 'recommend': return apiRecommend(wsId as number).then(r => r.data.recommendations.join('\n\n'));
        default: return '';
      }
    },
    onSuccess: (data) => setResult(data as string),
  });

  const canRun = () => {
    if (!wsId) return false;
    const tool = TOOLS.find(t => t.id === activeTool);
    if (!tool) return false;
    if (tool.needsPapers) {
      if (activeTool === 'citations') return selected.length === 1;
      return selected.length >= (activeTool === 'compare' ? 2 : 1);
    }
    if (activeTool === 'review') return !!topic.trim();
    return true;
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">AI Tools</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Academic writing and analysis tools powered by Groq</p>
        </div>

        {/* Workspace selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Workspace</label>
          <select value={wsId} onChange={e => { setWsId(Number(e.target.value) || ''); setSelected([]); setResult(null); }}
            className="text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none">
            <option value="">Select workspace</option>
            {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tool cards */}
          <div className="lg:col-span-1 space-y-3">
            {TOOLS.map(({ id, label, icon: Icon, desc }) => (
              <button key={id} onClick={() => { setActiveTool(id); setResult(null); }}
                className={`w-full text-left p-4 rounded-xl border transition-all ${activeTool === id
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-600'}`}>
                <div className="flex items-center gap-3 mb-1">
                  <Icon size={16} className={activeTool === id ? 'text-violet-600' : 'text-slate-500 dark:text-slate-400'} />
                  <span className={`text-sm font-semibold ${activeTool === id ? 'text-violet-700 dark:text-violet-300' : 'text-slate-700 dark:text-slate-200'}`}>{label}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 pl-7">{desc}</p>
              </button>
            ))}
          </div>

          {/* Config + Output */}
          <div className="lg:col-span-2 space-y-4">
            {activeTool && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <h3 className="font-semibold text-slate-800 dark:text-white mb-4">
                  {TOOLS.find(t => t.id === activeTool)?.label}
                </h3>

                {/* Topic input for review */}
                {activeTool === 'review' && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Topic</label>
                    <input value={topic} onChange={e => setTopic(e.target.value)}
                      placeholder="e.g. transformer architectures in NLP"
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
                  </div>
                )}

                {/* Paper selector for paper-dependent tools */}
                {TOOLS.find(t => t.id === activeTool)?.needsPapers && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        Select paper{activeTool !== 'citations' ? 's' : ''}
                        {activeTool === 'citations' && ' (exactly 1)'}
                        {activeTool === 'compare' && ' (at least 2)'}
                      </label>
                      {selected.length > 0 && (
                        <span className="text-xs text-violet-600 dark:text-violet-400">{selected.length} selected</span>
                      )}
                    </div>
                    {!wsId ? (
                      <p className="text-xs text-slate-400">Select a workspace first</p>
                    ) : papers.length === 0 ? (
                      <p className="text-xs text-slate-400">No papers in this workspace</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {papers.map(p => (
                          <button key={p.id} onClick={() => toggle(p.id)}
                            className={`w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-xs transition-colors ${selected.includes(p.id)
                              ? 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                            {selected.includes(p.id) ? <CheckSquare size={12} /> : <Square size={12} className="text-slate-300" />}
                            <span className="truncate">{p.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => runMutation.mutate()} disabled={!canRun() || runMutation.isPending}
                  className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium text-sm">
                  {runMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {runMutation.isPending ? 'Running…' : 'Run'}
                </button>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Result</h3>
                  <button onClick={() => navigator.clipboard.writeText(result)}
                    className="text-xs text-violet-600 dark:text-violet-400 hover:underline">Copy</button>
                </div>
                <div className="max-h-[32rem] overflow-y-auto pr-1">
                  <MarkdownRenderer content={result} />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
