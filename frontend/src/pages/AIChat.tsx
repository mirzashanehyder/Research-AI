import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, Loader2, BookOpen } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatMessage from '../components/ChatMessage';
import { apiGetWorkspaces, apiChat, apiGetHistory, type Citation } from '../utils/api';

interface LocalMessage {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  timestamp?: string;
}

export default function AIChat() {
  const [wsId, setWsId]         = useState<number | ''>('');
  const [message, setMessage]   = useState('');
  const [localMsgs, setLocalMsgs] = useState<LocalMessage[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['history', wsId],
    queryFn: () => apiGetHistory(wsId as number).then(r => r.data),
    enabled: !!wsId,
  });

  const chatMutation = useMutation({
    mutationFn: () => apiChat({ workspace_id: wsId as number, message }),
    onSuccess: (res) => {
      setLocalMsgs(m => [...m, {
        role: 'ai',
        content: res.data.response,
        citations: res.data.citations,
        timestamp: new Date().toISOString(),
      }]);
      setMessage('');
    },
  });

  useEffect(() => {
    setLocalMsgs([]);
  }, [wsId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMsgs, chatMutation.isPending]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !wsId) return;
    setLocalMsgs(m => [...m, { role: 'user', content: message, timestamp: new Date().toISOString() }]);
    chatMutation.mutate();
  };

  const allMessages: LocalMessage[] = [
    ...history.map(h => ([
      { role: 'user' as const, content: h.user_message, timestamp: h.timestamp },
      { role: 'ai' as const, content: h.ai_response, timestamp: h.timestamp },
    ])).flat(),
    ...localMsgs,
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">AI Chat</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Answers sourced only from your workspace papers</p>
          </div>
          <select value={wsId} onChange={e => setWsId(Number(e.target.value) || '')}
            className="ml-auto text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none">
            <option value="">Select workspace</option>
            {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name} ({ws.paper_count} papers)</option>)}
          </select>
        </div>

        {/* Chat area + Sources panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Messages */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!wsId ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <BookOpen size={48} className="mb-3" />
                  <p className="text-sm">Select a workspace to start chatting</p>
                </div>
              ) : historyLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-violet-600" /></div>
              ) : allMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <p className="text-sm">No messages yet. Ask anything about your papers!</p>
                </div>
              ) : (
                allMessages.map((m, i) => (
                  <ChatMessage key={i} role={m.role} content={m.content} citations={m.citations} timestamp={m.timestamp} />
                ))
              )}
              {chatMutation.isPending && (
                <div className="flex mb-4">
                  <div className="mr-2 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                    <Loader2 size={14} className="animate-spin text-slate-400" />
                  </div>
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-6 pb-6 pt-2 shrink-0">
              <form onSubmit={handleSend} className="flex gap-3">
                <input value={message} onChange={e => setMessage(e.target.value)}
                  disabled={!wsId}
                  placeholder={wsId ? 'Ask a question about your workspace papers…' : 'Select a workspace first'}
                  className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 outline-none text-sm disabled:opacity-50" />
                <button type="submit" disabled={!message.trim() || !wsId || chatMutation.isPending}
                  className="p-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors">
                  <Send size={18} />
                </button>
              </form>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
                Powered by Groq · Llama 3.3 70B · FAISS workspace index
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
