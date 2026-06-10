import { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  MessageSquare, X, Send, Loader2, BookOpen,
  Minimize2, Maximize2, ChevronDown, Expand, Shrink,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { isAuthenticated } from '../utils/auth';
import { apiGetWorkspaces, apiChat, apiGetHistory, type Citation } from '../utils/api';
import ChatMessage from './ChatMessage';

interface LocalMessage {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  timestamp?: string;
}

const PROTECTED_PATHS = ['/dashboard', '/search', '/tools', '/upload', '/docs', '/workspace', '/profile', '/chat'];
const MIN_W = 300;
const MAX_W = 860;
const MIN_H = 320;
const DEFAULT_W = 370;
const DEFAULT_H = 520;

export default function ChatBot() {
  const location = useLocation();

  const [open,       setOpen]   = useState(false);
  const [minimized,  setMin]    = useState(false);
  const [fullscreen, setFs]     = useState(false);
  const [size,       setSize]   = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [wsId,       setWsId]   = useState<number | ''>('');
  const [message,    setMsg]    = useState('');
  const [localMsgs,  setLocal]  = useState<LocalMessage[]>([]);

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);
  const sizeRef     = useRef(size); // keep current size in ref for drag handlers
  sizeRef.current = size;

  const showBot = isAuthenticated() &&
    PROTECTED_PATHS.some(p => location.pathname.startsWith(p));

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
    enabled: showBot,
    staleTime: 60_000,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['history', wsId],
    queryFn: () => apiGetHistory(wsId as number).then(r => r.data),
    enabled: !!wsId && open,
  });

  const chatMutation = useMutation({
    mutationFn: () => apiChat({ workspace_id: wsId as number, message }),
    onSuccess: (res) => {
      setLocal(m => [...m, {
        role: 'ai',
        content: res.data.response,
        citations: res.data.citations,
        timestamp: new Date().toISOString(),
      }]);
      setMsg('');
    },
  });

  // ── scroll helpers ──────────────────────────────────────────────────────────
  const scrollBottom = useCallback((instant = false) => {
    const el = messagesRef.current;
    if (!el) return;
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  // jump to bottom instantly when panel opens or history loads
  useEffect(() => {
    if (open && !minimized) {
      const id = setTimeout(() => scrollBottom(true), 60);
      return () => clearTimeout(id);
    }
  }, [open, minimized, scrollBottom]);

  useEffect(() => {
    if (open && !minimized) scrollBottom(true);
  }, [history, open, minimized, scrollBottom]);

  // smooth scroll on new messages / pending state
  useEffect(() => {
    scrollBottom(false);
  }, [localMsgs, chatMutation.isPending, scrollBottom]);

  useEffect(() => { setLocal([]); }, [wsId]);

  useEffect(() => {
    if (open && !minimized) setTimeout(() => inputRef.current?.focus(), 130);
  }, [open, minimized]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !wsId || chatMutation.isPending) return;
    setLocal(m => [...m, { role: 'user', content: message, timestamp: new Date().toISOString() }]);
    chatMutation.mutate();
  };

  const allMessages: LocalMessage[] = [
    ...history.map(h => ([
      { role: 'user' as const, content: h.user_message, timestamp: h.timestamp },
      { role: 'ai'   as const, content: h.ai_response,  timestamp: h.timestamp },
    ])).flat(),
    ...localMsgs,
  ];

  // ── drag-to-resize ──────────────────────────────────────────────────────────
  // Panel is anchored to bottom-right, so:
  //   dragging top edge  → grows upward (increases height)
  //   dragging left edge → grows leftward (increases width)
  const startResize = useCallback((
    e: React.MouseEvent,
    dir: 'top' | 'left' | 'corner',
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const { w: sw, h: sh } = sizeRef.current;
    const maxH = window.innerHeight - 100;

    const onMove = (mv: MouseEvent) => {
      const dx = mv.clientX - startX; // positive = right
      const dy = mv.clientY - startY; // positive = down
      setSize(prev => ({
        w: dir !== 'top'
          ? Math.max(MIN_W, Math.min(MAX_W,  sw - dx))  // left edge → drag left to grow
          : prev.w,
        h: dir !== 'left'
          ? Math.max(MIN_H, Math.min(maxH,   sh - dy))  // top edge  → drag up to grow
          : prev.h,
      }));
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      document.body.style.cursor    = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor     = dir === 'top' ? 'ns-resize' : dir === 'left' ? 'ew-resize' : 'nwse-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  }, []);

  if (!showBot) return null;

  const panelW = fullscreen ? '100vw' : `${size.w}px`;
  const panelH = fullscreen ? '100vh' : minimized ? '52px' : `${size.h}px`;

  return (
    <>
      {/* ── keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes bot-slide-up {
          from { opacity:0; transform:translateY(20px) scale(.96); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
        .bot-panel { animation: bot-slide-up .2s ease-out both; }
        .resize-h  { cursor:ns-resize;   position:absolute; top:0; left:8px; right:8px; height:6px; z-index:10; }
        .resize-w  { cursor:ew-resize;   position:absolute; top:8px; left:0; bottom:8px; width:6px; z-index:10; }
        .resize-c  { cursor:nwse-resize; position:absolute; top:0; left:0; width:14px; height:14px; z-index:11; }
        .resize-h:hover,.resize-w:hover,.resize-c:hover { background:rgba(124,58,237,.18); border-radius:4px; }
      `}</style>

      <div className={`fixed z-50 flex flex-col items-end gap-3 ${fullscreen ? 'inset-0' : 'bottom-6 right-6'}`}>

        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        {open && (
          <div
            className="bot-panel flex flex-col overflow-hidden relative"
            style={{
              width: panelW,
              height: panelH,
              transition: minimized || fullscreen ? 'height 0.22s cubic-bezier(.4,0,.2,1)' : 'none',
              background: '#fff',
              borderRadius: fullscreen ? 0 : 16,
              border: '1px solid rgba(0,0,0,.09)',
              boxShadow: fullscreen ? 'none' : '0 24px 64px rgba(0,0,0,.22), 0 0 0 1px rgba(124,58,237,.14)',
            }}
          >
            {/* ── resize handles (hidden in fullscreen/minimized) ── */}
            {!fullscreen && !minimized && (
              <>
                <div className="resize-h" onMouseDown={e => startResize(e, 'top')} />
                <div className="resize-w" onMouseDown={e => startResize(e, 'left')} />
                <div className="resize-c" onMouseDown={e => startResize(e, 'corner')} />
              </>
            )}

            {/* ── Header ────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-2.5 px-4 py-3 shrink-0 select-none"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#4F46E5)', borderBottom: '1px solid rgba(255,255,255,.1)' }}
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <BookOpen size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold leading-tight">Research Assistant</p>
                <p className="text-white/60 text-xs truncate">
                  {wsId ? 'Workspace active · Llama 3.3' : 'Select a workspace to chat'}
                </p>
              </div>

              {/* size reset (only in non-fullscreen, non-minimized) */}
              {!fullscreen && !minimized && (
                <button
                  onClick={() => setSize({ w: DEFAULT_W, h: DEFAULT_H })}
                  className="text-white/50 hover:text-white transition-colors p-1 rounded text-[10px] font-mono leading-none"
                  title="Reset size"
                >
                  ↺
                </button>
              )}

              {/* fullscreen toggle */}
              <button
                onClick={() => { setFs(f => !f); setMin(false); }}
                className="text-white/70 hover:text-white transition-colors p-1 rounded"
                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreen ? <Shrink size={14} /> : <Expand size={14} />}
              </button>

              {/* minimize (only in non-fullscreen) */}
              {!fullscreen && (
                <button
                  onClick={() => setMin(m => !m)}
                  className="text-white/70 hover:text-white transition-colors p-1 rounded"
                  title={minimized ? 'Restore' : 'Minimise'}
                >
                  {minimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                </button>
              )}

              <button
                onClick={() => { setOpen(false); setFs(false); setMin(false); }}
                className="text-white/70 hover:text-white transition-colors p-1 rounded"
                title="Close"
              >
                <X size={14} />
              </button>
            </div>

            {/* ── Body (hidden when minimized) ─────────────────────── */}
            {!minimized && (
              <>
                {/* Workspace selector */}
                <div className="px-3 pt-2.5 pb-2 shrink-0 border-b border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800">
                  <select
                    value={wsId}
                    onChange={e => setWsId(Number(e.target.value) || '')}
                    className="w-full text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none"
                  >
                    <option value="">— Select workspace —</option>
                    {workspaces.map(ws => (
                      <option key={ws.id} value={ws.id}>{ws.name} ({ws.paper_count} papers)</option>
                    ))}
                  </select>
                </div>

                {/* Messages */}
                <div
                  ref={messagesRef}
                  className="flex-1 overflow-y-auto px-3 py-3 bg-slate-50 dark:bg-slate-900"
                >
                  {!wsId ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-10">
                      <MessageSquare size={32} className="mb-2 opacity-30" />
                      <p className="text-xs text-center">Select a workspace above<br />to start asking questions</p>
                    </div>
                  ) : allMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 py-10">
                      <BookOpen size={28} className="mb-2 opacity-30" />
                      <p className="text-xs text-center">No messages yet.<br />Ask anything about your papers!</p>
                    </div>
                  ) : (
                    allMessages.map((m, i) => (
                      <ChatMessage
                        key={i}
                        role={m.role}
                        content={m.content}
                        citations={m.citations}
                        timestamp={m.timestamp}
                        compact={!fullscreen}
                      />
                    ))
                  )}
                  {chatMutation.isPending && (
                    <div className="flex items-center gap-2 pl-2 py-2">
                      <Loader2 size={13} className="animate-spin text-violet-500" />
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {/* scroll anchor */}
                  <div style={{ height: 1 }} />
                </div>

                {/* ── Resize grip indicator ─────────────────────────── */}
                {!fullscreen && (
                  <div
                    className="absolute bottom-[52px] right-2 opacity-20 pointer-events-none"
                    aria-hidden
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      {[[2,8],[5,8],[8,8],[5,5],[8,5],[8,2]].map(([x,y],i) => (
                        <circle key={i} cx={x} cy={y} r="1.2" fill="#94A3B8" />
                      ))}
                    </svg>
                  </div>
                )}

                {/* Input */}
                <div className="px-3 pb-3 pt-2 shrink-0 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
                  <form onSubmit={handleSend} className="flex gap-2">
                    <input
                      ref={inputRef}
                      value={message}
                      onChange={e => setMsg(e.target.value)}
                      disabled={!wsId}
                      placeholder={wsId ? 'Ask about your papers…' : 'Select workspace first'}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 text-xs focus:ring-2 focus:ring-violet-500 outline-none disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!message.trim() || !wsId || chatMutation.isPending}
                      className="p-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-40 transition-colors shrink-0"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    Groq · Llama 3.3 70B · FAISS
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Toggle FAB (hidden when fullscreen) ──────────────────────────── */}
        {!fullscreen && (
          <button
            onClick={() => { setOpen(o => !o); setMin(false); }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 relative shrink-0"
            style={{
              background: open ? '#4F46E5' : 'linear-gradient(135deg,#7C3AED,#4F46E5)',
              boxShadow: '0 8px 32px rgba(124,58,237,.5)',
            }}
            title="AI Research Assistant"
          >
            {open
              ? <ChevronDown size={22} className="text-white" />
              : <MessageSquare size={22} className="text-white" />
            }
            {!open && allMessages.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white text-[9px] text-white flex items-center justify-center font-bold">
                {Math.min(allMessages.length, 9)}
              </span>
            )}
          </button>
        )}
      </div>
    </>
  );
}
