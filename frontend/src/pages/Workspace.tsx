import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Trash2, FileText, CheckSquare, Square, MessageSquare, BookOpen, ExternalLink, Download } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { apiGetPapers, apiDeletePaper, apiChat, apiGetHistory, apiReview, apiGetWorkspaces, type Paper, type ConversationEntry } from '../utils/api';

type Tab = 'papers' | 'chat' | 'review';

export default function Workspace() {
  const { id } = useParams<{ id: string }>();
  const wsId = Number(id);
  const qc = useQueryClient();
  const [tab, setTab]       = useState<Tab>('papers');
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage]   = useState('');
  const [topic, setTopic]       = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; content: string; citations?: any[] }>>([]);

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
    staleTime: 60_000,
  });
  const workspaceName = workspaces.find(w => w.id === wsId)?.name ?? '';
  const workspaceTitle = workspaceName ? workspaceName.replace(/^Workspace\s*#\d+$/, 'Workspace') : '';

  const { data: papers = [], isLoading: papersLoading } = useQuery({
    queryKey: ['papers', wsId],
    queryFn: () => apiGetPapers(wsId).then(r => r.data),
  });

  const downloadPaper = (p: Paper) => {
    const authors = Array.isArray(p.authors) ? p.authors.join(', ') : '';
    const lines = [
      `Title: ${p.title}`,
      authors       ? `Authors: ${authors}`                     : '',
      p.source_website ? `Source: ${p.source_website}`          : '',
      p.publication_date ? `Published: ${p.publication_date}`   : '',
      p.doi         ? `DOI: ${p.doi}`                           : '',
      p.url         ? `URL: ${p.url}`                           : '',
      p.abstract    ? `\nAbstract:\n${p.abstract}`              : '',
    ].filter(Boolean).join('\n');
    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${p.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { data: history = [] } = useQuery<ConversationEntry[]>({
    queryKey: ['history', wsId],
    queryFn: () => apiGetHistory(wsId).then(r => r.data),
    enabled: tab === 'chat',
  });

  const deleteMutation = useMutation({
    mutationFn: (pid: number) => apiDeletePaper(pid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['papers', wsId] }),
  });

  const chatMutation = useMutation({
    mutationFn: () => apiChat({ workspace_id: wsId, message }),
    onSuccess: (res) => {
      setChatHistory(h => [...h, { role: 'ai', content: res.data.response, citations: res.data.citations }]);
      setMessage('');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: () => apiReview(wsId, topic),
  });

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setChatHistory(h => [...h, { role: 'user', content: message }]);
    chatMutation.mutate();
  };

  const toggleSelect = (id: number) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const tabBtn = (t: Tab, label: string, Icon: any) => (
    <button onClick={() => setTab(t)}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${tab === t ? 'bg-violet-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col p-6 lg:p-8 overflow-hidden">
        {/* Header + tabs */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">
            {workspaceName ? workspaceTitle : <span className="text-slate-400">Loading…</span>}
          </h1>
          <div className="flex gap-2 mt-4 flex-wrap">
            {tabBtn('papers', `Papers (${papers.length})`, FileText)}
            {tabBtn('chat', 'AI Chat', MessageSquare)}
            {tabBtn('review', 'Generate Review', BookOpen)}
          </div>
        </div>

        {/* PAPERS TAB */}
        {tab === 'papers' && (
          <div className="flex-1 overflow-auto">
            {papersLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-600" /></div>
            ) : papers.length === 0 ? (
              <div className="text-center py-20 text-slate-400 dark:text-slate-500">
                <FileText size={40} className="mx-auto mb-3" />
                <p>No papers yet. Use Search Papers or Upload PDF to add some.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {papers.map((p: Paper) => (
                  <div key={p.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 flex items-start gap-3 hover:shadow-sm transition-shadow">
                    <button onClick={() => toggleSelect(p.id)} className="mt-0.5 text-violet-600 shrink-0">
                      {selected.includes(p.id) ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-300 dark:text-slate-600" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-800 dark:text-white truncate">{p.title}</p>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="shrink-0 text-violet-500 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-200 transition-colors"
                            title="Open source">
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {Array.isArray(p.authors) ? p.authors.slice(0, 3).join(', ') : ''}
                        {p.source_website && ` · ${p.source_website}`}
                        {p.publication_date && ` · ${p.publication_date}`}
                      </p>
                    </div>
                    <button onClick={() => downloadPaper(p)}
                      title="Download citation"
                      className="shrink-0 p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-400 transition-colors">
                      <Download size={14} />
                    </button>
                    <button onClick={() => { if (confirm('Delete paper?')) deleteMutation.mutate(p.id); }}
                      className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* CHAT TAB */}
        {tab === 'chat' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto pr-1 mb-4 space-y-0">
              {history.map((c, i) => (
                <div key={i}>
                  <ChatMessage role="user" content={c.user_message} timestamp={c.timestamp} />
                  <ChatMessage role="ai" content={c.ai_response} timestamp={c.timestamp} />
                </div>
              ))}
              {chatHistory.map((m, i) => (
                <ChatMessage key={`new-${i}`} role={m.role} content={m.content} citations={m.citations} />
              ))}
              {chatMutation.isPending && (
                <div className="flex mb-4">
                  <div className="mr-2 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => <div key={i} className={`w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce`} style={{ animationDelay: `${i * 0.15}s` }} />)}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <form onSubmit={sendMessage} className="flex gap-3">
              <input value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Ask about papers in this workspace…"
                className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
              <button type="submit" disabled={!message.trim() || chatMutation.isPending}
                className="px-5 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium text-sm">
                Send
              </button>
            </form>
          </div>
        )}

        {/* REVIEW TAB */}
        {tab === 'review' && (
          <div className="flex-1 overflow-auto">
            <div className="max-w-2xl">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                Generate a 5-section structured literature review from all papers in this workspace.
              </p>
              <div className="flex gap-3 mb-6">
                <input value={topic} onChange={e => setTopic(e.target.value)}
                  placeholder="Research topic (e.g. 'transformer architectures in NLP')"
                  className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none text-sm" />
                <button onClick={() => reviewMutation.mutate()} disabled={!topic.trim() || reviewMutation.isPending}
                  className="px-5 py-2.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-2">
                  {reviewMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  {reviewMutation.isPending ? 'Generating…' : 'Generate'}
                </button>
              </div>
              {reviewMutation.data && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6">
                  <MarkdownRenderer content={reviewMutation.data.data.review} />
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
