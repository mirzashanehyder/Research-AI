import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { apiRegister, apiLogin } from '../utils/api';
import { setToken } from '../utils/auth';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm]       = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('All fields are required.'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true); setError('');
    try {
      await apiRegister(form);
      const { data } = await apiLogin({ email: form.email, password: form.password });
      setToken(data.access_token, data.role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2 bg-violet-600">
        <BookOpen className="text-white/80 mb-6" size={48} />
        <h1 className="text-4xl font-bold text-white mb-4">Start your research journey</h1>
        <p className="text-violet-200 text-lg leading-relaxed max-w-sm">
          Create an account to access AI-powered paper discovery, RAG chat, literature reviews, and more.
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <BookOpen className="text-violet-600" size={28} />
            <span className="text-xl font-bold text-slate-800 dark:text-white">ResearchHub AI</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Create account</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">Free forever. No credit card required.</p>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name',     label: 'Full name',  icon: User,  type: 'text',     placeholder: 'Jane Smith' },
              { key: 'email',    label: 'Email',      icon: Mail,  type: 'email',    placeholder: 'you@example.com' },
              { key: 'password', label: 'Password',   icon: Lock,  type: 'password', placeholder: '••••••••' },
            ].map(({ key, label, icon: Icon, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
                <div className="relative">
                  <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={type} value={(form as any)[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none text-sm" />
                </div>
              </div>
            ))}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
