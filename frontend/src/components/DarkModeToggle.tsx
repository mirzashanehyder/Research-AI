import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function DarkModeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [dark]);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return (
    <button
      onClick={() => setDark(d => !d)}
      className={`flex items-center gap-2 rounded-lg text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${iconOnly ? 'justify-center p-2' : 'px-3 py-2 w-full'}`}
      aria-label="Toggle dark mode"
      title={iconOnly ? (dark ? 'Light mode' : 'Dark mode') : undefined}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
      {!iconOnly && <span>{dark ? 'Light mode' : 'Dark mode'}</span>}
    </button>
  );
}
