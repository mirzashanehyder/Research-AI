import { useState } from 'react';
import { ExternalLink, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { type PaperResult, apiImportPaper, apiGetWorkspaces } from '../utils/api';
import { isAuthenticated } from '../utils/auth';

interface Props {
  paper: PaperResult;
  defaultWorkspaceId?: number;
}

export default function PaperCard({ paper, defaultWorkspaceId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [wsId, setWsId]         = useState<number | ''>(defaultWorkspaceId ?? '');
  const [imported, setImported] = useState(false);

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiGetWorkspaces().then(r => r.data),
    enabled: isAuthenticated(),
  });

  const importMutation = useMutation({
    mutationFn: () =>
      apiImportPaper({
        workspace_id: wsId as number,
        title: paper.title,
        authors: paper.authors,
        abstract: paper.abstract,
        url: paper.url,
        doi: paper.doi,
        publication_date: paper.publication_date,
        source_website: paper.source_website,
        source_type: paper.source_type,
      }),
    onSuccess: () => setImported(true),
  });

  const abstract = paper.abstract || 'No abstract available.';
  const truncated = abstract.length > 280 && !expanded;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
      {/* Badges */}
      <div className="flex flex-wrap gap-2 mb-2">
        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {paper.source_website}
        </span>
        {paper.source_type === 'API' ? (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">Via API</span>
        ) : (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">Via Selenium</span>
        )}
        {paper.publication_date && (
          <span className="text-xs text-slate-500 dark:text-slate-400 self-center">{paper.publication_date}</span>
        )}
      </div>

      <h3 className="font-semibold text-slate-800 dark:text-white mb-1 leading-snug">{paper.title}</h3>

      {paper.authors.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          {paper.authors.slice(0, 4).join(', ')}{paper.authors.length > 4 && ` +${paper.authors.length - 4} more`}
        </p>
      )}

      {paper.doi && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2 font-mono">DOI: {paper.doi}</p>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-1">
        {truncated ? abstract.slice(0, 280) + '…' : abstract}
      </p>
      {abstract.length > 280 && (
        <button onClick={() => setExpanded(e => !e)}
          className="text-xs text-violet-600 dark:text-violet-400 flex items-center gap-1 mb-3 hover:underline">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            <ExternalLink size={12} /> View Original
          </a>
        )}
        {isAuthenticated() && !imported && (
          <div className="flex items-center gap-1 ml-auto">
            <select value={wsId} onChange={e => setWsId(Number(e.target.value))}
              className="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-violet-500 outline-none">
              <option value="">Workspace</option>
              {workspaces?.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
            </select>
            <button disabled={!wsId || importMutation.isPending} onClick={() => importMutation.mutate()}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors">
              <Download size={12} /> {importMutation.isPending ? 'Importing…' : 'Import'}
            </button>
          </div>
        )}
        {imported && <span className="ml-auto text-xs text-green-600 dark:text-green-400 font-medium">✓ Imported</span>}
      </div>
    </div>
  );
}
