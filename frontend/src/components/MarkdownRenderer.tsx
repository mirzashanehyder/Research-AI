import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function MarkdownRenderer({ content }: { content: string }) {
  const components: any = {
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold text-slate-800 dark:text-white mt-5 mb-2 pb-1 border-b border-slate-200 dark:border-slate-600">{children}</h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-bold text-slate-800 dark:text-white mt-4 mb-2">{children}</h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-3 mb-1.5">{children}</h3>
    ),
    p: ({ children }: any) => (
      <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 leading-relaxed">{children}</p>
    ),
    strong: ({ children }: any) => (
      <strong className="font-semibold text-slate-800 dark:text-white">{children}</strong>
    ),
    em: ({ children }: any) => (
      <em className="italic text-slate-600 dark:text-slate-300">{children}</em>
    ),
    ul: ({ children }: any) => (
      <ul className="list-disc list-outside pl-5 text-sm text-slate-700 dark:text-slate-300 mb-3 space-y-1">{children}</ul>
    ),
    ol: ({ children }: any) => (
      <ol className="list-decimal list-outside pl-5 text-sm text-slate-700 dark:text-slate-300 mb-3 space-y-1">{children}</ol>
    ),
    li: ({ children }: any) => <li className="leading-relaxed">{children}</li>,
    blockquote: ({ children }: any) => (
      <blockquote className="border-l-4 border-violet-400 pl-4 italic text-slate-500 dark:text-slate-400 my-3">{children}</blockquote>
    ),
    hr: () => <hr className="border-slate-200 dark:border-slate-600 my-4" />,
    a: ({ children, href }: any) => (
      <a href={href} className="text-violet-600 dark:text-violet-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
    ),
    pre: ({ children }: any) => (
      <pre className="bg-slate-100 dark:bg-slate-700 rounded-lg p-4 overflow-x-auto my-3 text-xs font-mono leading-relaxed">{children}</pre>
    ),
    code: ({ inline, children }: any) =>
      inline
        ? <code className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-xs font-mono text-violet-700 dark:text-violet-300">{children}</code>
        : <code className="font-mono text-xs">{children}</code>,
    table: ({ children }: any) => (
      <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-600">
        <table className="min-w-full text-xs border-collapse">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-violet-50 dark:bg-violet-900/20">{children}</thead>
    ),
    th: ({ children }: any) => (
      <th className="px-4 py-2.5 text-left font-semibold text-violet-800 dark:text-violet-300 border-b border-slate-200 dark:border-slate-600 whitespace-nowrap">
        {children}
      </th>
    ),
    tbody: ({ children }: any) => <tbody>{children}</tbody>,
    tr: ({ children }: any) => (
      <tr className="border-b border-slate-100 dark:border-slate-700 last:border-0 even:bg-slate-50/60 dark:even:bg-slate-700/20 hover:bg-violet-50/40 dark:hover:bg-violet-900/10 transition-colors">
        {children}
      </tr>
    ),
    td: ({ children }: any) => (
      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 align-top">{children}</td>
    ),
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
