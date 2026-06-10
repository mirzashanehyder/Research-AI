import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, FileText, Save, Loader2, Eye, Edit3, Download,
         Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered, Quote, Code, Minus } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MarkdownRenderer from '../components/MarkdownRenderer';
import {
  apiGetWorkspaces, apiGetDocuments, apiCreateDocument,
  apiUpdateDocument, apiDeleteDocument, type Document,
} from '../utils/api';

const DOC_TYPES = ['note', 'summary', 'literature_review', 'report', 'pdf'] as const;

type ToolbarAction = {
  icon: any;
  label: string;
  prefix: string;
  suffix?: string;
  block?: boolean;
};

const TOOLBAR: (ToolbarAction | 'sep')[] = [
  { icon: Heading1,     label: 'Heading 1',      prefix: '# ',     block: true },
  { icon: Heading2,     label: 'Heading 2',      prefix: '## ',    block: true },
  { icon: Heading3,     label: 'Heading 3',      prefix: '### ',   block: true },
  'sep',
  { icon: Bold,         label: 'Bold',           prefix: '**', suffix: '**' },
  { icon: Italic,       label: 'Italic',         prefix: '_',  suffix: '_'  },
  { icon: Code,         label: 'Inline code',    prefix: '`',  suffix: '`'  },
  'sep',
  { icon: List,         label: 'Bullet list',    prefix: '- ', block: true },
  { icon: ListOrdered,  label: 'Numbered list',  prefix: '1. ', block: true },
  { icon: Quote,        label: 'Blockquote',     prefix: '> ', block: true },
  { icon: Minus,        label: 'Divider',        prefix: '\n---\n', block: true },
];

export default function DocSpace() {
  const qc = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [wsId, setWsId]         = useState<number | ''>('');
  const [active, setActive]     = useState<Document | null>(null);
  const [editTitle, setEditTitle]   = useState('');
  const [editContent, setEditContent] = useState('');
  const [dirty, setDirty]       = useState(false);
  const [preview, setPreview]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType]   = useState<string>('note');

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
  });

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ['documents', wsId],
    queryFn: () => apiGetDocuments(wsId as number).then(r => r.data),
    enabled: !!wsId,
  });

  const createMutation = useMutation({
    mutationFn: () => apiCreateDocument({ workspace_id: wsId as number, title: newTitle, type: newType }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['documents', wsId] });
      setCreating(false);
      setNewTitle('');
      openDoc(res.data);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => apiUpdateDocument(active!.id, { title: editTitle, content: editContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', wsId] });
      setDirty(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDeleteDocument(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', wsId] });
      if (active?.id === deleteMutation.variables) setActive(null);
    },
  });

  const openDoc = (doc: Document) => {
    setActive(doc);
    setEditTitle(doc.title);
    setEditContent(doc.content ?? '');
    setDirty(false);
    setPreview(false);
  };

  const downloadDoc = (doc: Document) => {
    const content = `# ${doc.title}\n\n${doc.content ?? ''}`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${doc.title.replace(/[^a-z0-9]/gi, '_') || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Insert markdown at cursor / around selection
  const applyFormat = useCallback((action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const before  = editContent.slice(0, start);
    const selected = editContent.slice(start, end);
    const after   = editContent.slice(end);

    let newContent: string;
    let cursorPos: number;

    if (action.block) {
      // Prepend prefix to the current line
      const lineStart = before.lastIndexOf('\n') + 1;
      const lineContent = editContent.slice(lineStart, end || editContent.length);
      const alreadyApplied = lineContent.startsWith(action.prefix);
      const newLine = alreadyApplied
        ? lineContent.slice(action.prefix.length)
        : action.prefix + lineContent;
      newContent = editContent.slice(0, lineStart) + newLine + after.slice(lineContent.length - (end - lineStart));
      cursorPos = lineStart + newLine.length;
    } else {
      const suffix = action.suffix ?? '';
      newContent = before + action.prefix + selected + suffix + after;
      cursorPos  = start + action.prefix.length + selected.length + suffix.length;
    }

    setEditContent(newContent);
    setDirty(true);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(cursorPos, cursorPos);
    }, 0);
  }, [editContent]);

  // Ctrl+S to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      if (dirty) saveMutation.mutate();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      applyFormat({ icon: Bold, label: 'Bold', prefix: '**', suffix: '**' });
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      applyFormat({ icon: Italic, label: 'Italic', prefix: '_', suffix: '_' });
    }
  };

  const typeColor: Record<string, string> = {
    note: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    summary: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    literature_review: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    report: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    pdf: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 flex overflow-hidden">

        {/* Left panel — document list */}
        <div className="w-72 shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">Workspace</p>
            <select value={wsId} onChange={e => { setWsId(Number(e.target.value)); setActive(null); }}
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none">
              <option value="">Select workspace</option>
              {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {!wsId ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8 px-4">Select a workspace to view documents</p>
            ) : isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="animate-spin text-violet-600" size={20} /></div>
            ) : docs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8 px-4">No documents yet</p>
            ) : (
              docs.map(doc => (
                <div key={doc.id} onClick={() => openDoc(doc)}
                  className={`group flex items-start gap-2 px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${active?.id === doc.id ? 'bg-violet-50 dark:bg-violet-900/20 border-l-2 border-l-violet-500' : ''}`}>
                  <FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{doc.title}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium mt-0.5 inline-block ${typeColor[doc.type] ?? typeColor.note}`}>
                      {doc.type.replace('_', ' ')}
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); downloadDoc(doc); }}
                    title="Download document"
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-slate-700 transition-all mt-0.5 shrink-0">
                    <Download size={12} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); if (confirm('Delete document?')) deleteMutation.mutate(doc.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all mt-0.5 shrink-0">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {wsId && (
            <div className="p-3 border-t border-slate-100 dark:border-slate-700">
              {creating ? (
                <div className="space-y-2">
                  <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                    placeholder="Document title" autoFocus
                    className="w-full text-sm px-2.5 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none" />
                  <select value={newType} onChange={e => setNewType(e.target.value)}
                    className="w-full text-sm px-2.5 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none">
                    {DOC_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={() => setCreating(false)}
                      className="flex-1 text-xs py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => createMutation.mutate()} disabled={!newTitle.trim() || createMutation.isPending}
                      className="flex-1 text-xs py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors">
                      {createMutation.isPending ? '…' : 'Create'}
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors font-medium justify-center">
                  <Plus size={13} /> New Document
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right panel — editor */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
              <FileText size={48} className="mb-3" />
              <p className="text-sm">Select or create a document to start editing</p>
            </div>
          ) : (
            <>
              {/* Title bar */}
              <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                <input value={editTitle} onChange={e => { setEditTitle(e.target.value); setDirty(true); }}
                  className="flex-1 text-base font-semibold text-slate-800 dark:text-white bg-transparent border-none outline-none focus:ring-0 placeholder-slate-300"
                  placeholder="Document title" />
                <div className="flex items-center gap-2">
                  {/* Download note */}
                  <button
                    onClick={() => {
                      const blob = new Blob([editContent], { type: 'text/markdown;charset=utf-8' });
                      const url  = URL.createObjectURL(blob);
                      const a    = document.createElement('a');
                      a.href     = url;
                      a.download = `${editTitle.replace(/[^a-z0-9]/gi, '_') || 'document'}.md`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Download as Markdown"
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                    <Download size={12} /> Download
                  </button>
                  {/* Preview / Edit toggle */}
                  <button onClick={() => setPreview(v => !v)}
                    title={preview ? 'Edit' : 'Preview'}
                    className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border transition-colors font-medium ${preview
                      ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                    {preview ? <Edit3 size={12} /> : <Eye size={12} />}
                    {preview ? 'Edit' : 'Preview'}
                  </button>
                  <button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-40 transition-colors font-medium">
                    {saveMutation.isPending ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    {saveMutation.isPending ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                  </button>
                </div>
              </div>

              {/* Formatting toolbar — only in edit mode */}
              {!preview && (
                <div className="flex items-center gap-0.5 px-4 py-1.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 shrink-0 flex-wrap">
                  {TOOLBAR.map((item, i) =>
                    item === 'sep' ? (
                      <div key={i} className="w-px h-5 bg-slate-200 dark:bg-slate-600 mx-1" />
                    ) : (
                      <button key={i} onClick={() => applyFormat(item)} title={item.label}
                        className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition-colors">
                        <item.icon size={14} />
                      </button>
                    )
                  )}
                  <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 pr-1 hidden sm:block">
                    Ctrl+B Bold · Ctrl+I Italic · Ctrl+S Save
                  </span>
                </div>
              )}

              {/* Editor / Preview */}
              {preview ? (
                <div className="flex-1 overflow-auto px-10 py-8 bg-white dark:bg-slate-900">
                  {editContent.trim() ? (
                    <MarkdownRenderer content={editContent} />
                  ) : (
                    <p className="text-slate-400 dark:text-slate-500 text-sm italic">Nothing to preview yet.</p>
                  )}
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={e => { setEditContent(e.target.value); setDirty(true); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Start writing… Markdown is supported."
                  className="flex-1 w-full resize-none px-8 py-6 text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-900 outline-none border-none focus:ring-0 font-mono"
                />
              )}

              {/* Footer */}
              <div className="px-6 py-2 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500 shrink-0">
                <span>{editContent.split(/\s+/).filter(Boolean).length} words</span>
                <span>{editContent.length} chars</span>
                <span className="ml-auto">
                  Last saved: {active.updated_at ? new Date(active.updated_at).toLocaleString() : 'never'}
                </span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
