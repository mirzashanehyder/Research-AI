import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, Trash2, FolderOpen, FileText, X, AlertCircle, Search, Wrench, Upload, ChevronRight } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { apiGetWorkspaces, apiCreateWorkspace, apiDeleteWorkspace } from '../utils/api';

const QUICK_TOOLS = [
  {
    to: '/search',
    icon: Search,
    label: 'Search Papers',
    desc: 'Query 7 academic databases simultaneously',
    color: '#7C3AED',
    bg: 'rgba(124,58,237,.08)',
    border: 'rgba(124,58,237,.2)',
  },
  {
    to: '/tools',
    icon: Wrench,
    label: 'AI Tools',
    desc: 'Literature review, citations, gap analysis',
    color: '#3B82F6',
    bg: 'rgba(59,130,246,.08)',
    border: 'rgba(59,130,246,.2)',
  },
  {
    to: '/upload',
    icon: Upload,
    label: 'Upload PDF',
    desc: 'Embed any PDF into your workspace',
    color: '#06B6D4',
    bg: 'rgba(6,182,212,.08)',
    border: 'rgba(6,182,212,.2)',
  },
  {
    to: '/docs',
    icon: FileText,
    label: 'Doc Space',
    desc: 'Write and manage research notes',
    color: '#A855F7',
    bg: 'rgba(168,85,247,.08)',
    border: 'rgba(168,85,247,.2)',
  },
];

export default function Dashboard() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [formErr, setFormErr] = useState('');

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: () => apiCreateWorkspace(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      setShowModal(false);
      setForm({ name: '', description: '' });
    },
    onError: (err: any) => setFormErr(err.response?.data?.detail ?? 'Failed to create workspace.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDeleteWorkspace(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspaces'] }),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setFormErr('Workspace name is required.'); return; }
    setFormErr('');
    createMutation.mutate();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage your research workspaces</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors font-medium text-sm">
            <Plus size={16} /> New Workspace
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Workspaces', value: workspaces.length },
            { label: 'Total Papers', value: workspaces.reduce((s, w) => s + w.paper_count, 0) },
            { label: 'Avg Papers/WS', value: workspaces.length ? Math.round(workspaces.reduce((s, w) => s + w.paper_count, 0) / workspaces.length) : 0 },
            { label: 'Active', value: workspaces.filter(w => w.paper_count > 0).length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-2xl font-bold text-violet-600">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Tools */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {QUICK_TOOLS.map(({ to, icon: Icon, label, desc, color, bg, border }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-col gap-3 p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md"
                style={{ background: bg, borderColor: border }}
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
                    <Icon size={17} style={{ color }} />
                  </div>
                  <ChevronRight size={14} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Workspace grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 animate-pulse h-40" />
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20">
            <FolderOpen size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-slate-500 dark:text-slate-400 mb-4">No workspaces yet</p>
            <button onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors text-sm font-medium">
              Create your first workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workspaces.map(ws => (
              <div key={ws.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-6 hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => navigate(`/workspace/${ws.id}`)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                    <FolderOpen size={20} className="text-violet-600" />
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('Delete this workspace?')) deleteMutation.mutate(ws.id); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-white mb-1">{ws.name}</h3>
                {ws.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2">{ws.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                  <FileText size={12} />
                  {ws.paper_count} paper{ws.paper_count !== 1 ? 's' : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">New Workspace</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            {formErr && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm mb-4">
                <AlertCircle size={14} /> {formErr}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. NLP Papers 2024"
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Optional description…" rows={3}
                  className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none resize-none" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-60">
                  {createMutation.isPending ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
