import { Bot, User } from 'lucide-react';
import type { Citation } from '../utils/api';

interface Props {
  role: 'user' | 'ai';
  content: string;
  citations?: Citation[];
  timestamp?: string;
  compact?: boolean;
}

export default function ChatMessage({ role, content, citations, timestamp, compact }: Props) {
  const isUser = role === 'user';
  const time = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';
  const mb   = compact ? 'mb-2' : 'mb-4';
  const px   = compact ? 'px-3 py-2' : 'px-4 py-3';
  const text = compact ? 'text-xs' : 'text-sm';
  const ava  = compact ? 'w-6 h-6' : 'w-8 h-8';
  const ico  = compact ? 12 : 14;

  if (isUser) {
    return (
      <div className={`flex justify-end ${mb}`}>
        <div className="max-w-[78%]">
          <div className={`bg-violet-600 text-white rounded-2xl rounded-tr-sm ${px} ${text} leading-relaxed shadow`}>
            {content}
          </div>
          {time && <p className="text-[10px] text-slate-400 text-right mt-0.5">{time}</p>}
        </div>
        <div className={`ml-1.5 mt-1 shrink-0 ${ava} rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center`}>
          <User size={ico} className="text-violet-600" />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mb}`}>
      <div className={`mr-1.5 mt-1 shrink-0 ${ava} rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center`}>
        <Bot size={ico} className="text-slate-500 dark:text-slate-300" />
      </div>
      <div className="max-w-[80%]">
        <div className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm ${px} shadow-sm`}>
          <p className={`${text} text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap`}>{content}</p>
          {citations && citations.length > 0 && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Sources:</p>
              {citations.map((c, i) => (
                <div key={i} className="text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                  [{i + 1}] <span className="font-medium text-slate-600 dark:text-slate-300">{c.paper_title}</span>
                  {c.authors.length > 0 && ` — ${c.authors.slice(0, 2).join(', ')}`}
                  {` · ${c.source_website}`}
                </div>
              ))}
            </div>
          )}
        </div>
        {time && <p className="text-[10px] text-slate-400 mt-0.5">{time}</p>}
      </div>
    </div>
  );
}
