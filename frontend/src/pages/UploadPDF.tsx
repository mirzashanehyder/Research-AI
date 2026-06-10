import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Upload, FileText, X, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { apiGetWorkspaces, apiUploadPDF } from '../utils/api';

export default function UploadPDF() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [wsId, setWsId]     = useState<number | ''>('');
  const [title, setTitle]   = useState('');
  const [file, setFile]     = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ message: string; chunks: number; paper_id: number } | null>(null);
  const [error, setError]   = useState('');

  const { data: workspaces = [] } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
  });

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === 'application/pdf') {
      setFile(dropped);
      if (!title) setTitle(dropped.name.replace(/\.pdf$/i, ''));
    } else {
      setError('Only PDF files are accepted.');
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, ''));
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !wsId || !title.trim()) { setError('All fields are required.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('workspace_id', String(wsId));
      fd.append('title', title.trim());
      const { data } = await apiUploadPDF(fd);
      setResult(data);
      setFile(null);
      setTitle('');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Upload PDF</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Extract text, chunk, and embed a PDF into your workspace for RAG chat
          </p>
        </div>

        <div className="max-w-2xl">
          <form onSubmit={handleUpload} className="space-y-5">
            {/* Workspace */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Workspace *</label>
              <select value={wsId} onChange={e => setWsId(Number(e.target.value))}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none">
                <option value="">Select workspace</option>
                {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Paper title *</label>
              <input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="Auto-filled from filename"
                className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 text-sm focus:ring-2 focus:ring-violet-500 outline-none" />
            </div>

            {/* Drop zone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PDF file *</label>
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                  dragging
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-slate-200 dark:border-slate-600 hover:border-violet-400 dark:hover:border-violet-500 bg-white dark:bg-slate-800'
                }`}>
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText size={24} className="text-violet-600" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null); }}
                      className="ml-2 text-slate-400 hover:text-red-500 transition-colors">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                      Drop PDF here or <span className="text-violet-600">browse</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Supports PDF files up to 50MB</p>
                  </>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm">
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button type="submit" disabled={loading || !file || !wsId || !title.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors font-semibold text-sm">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Processing PDF…</> : <><Upload size={16} /> Upload & Process</>}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-green-800 dark:text-green-300">PDF Processed Successfully</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Paper ID', value: `#${result.paper_id}` },
                  { label: 'Text Chunks', value: result.chunks },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center border border-green-100 dark:border-green-900">
                    <p className="text-lg font-bold text-slate-800 dark:text-white">{value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 dark:text-green-400 mt-3">
                The PDF has been chunked and added to your workspace's FAISS index. You can now chat with it in AI Chat.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
