import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { User, Lock, Mail, Shield, Calendar, CheckCircle, AlertCircle } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import { apiGetMe, apiUpdateMe, type UserProfile } from '../utils/api';

export default function Profile() {
  const qc = useQueryClient();

  const [nameForm, setNameForm]       = useState('');
  const [nameEditing, setNameEditing] = useState(false);
  const [pwForm, setPwForm]           = useState({ current_password: '', new_password: '', confirm: '' });
  const [success, setSuccess]         = useState('');
  const [error, setError]             = useState('');

  const { data: me, isLoading } = useQuery<UserProfile, Error, UserProfile>(['me'], () => apiGetMe().then(r => r.data), {
    onSuccess: (d: UserProfile) => { if (!nameEditing) setNameForm(d.name); },
  });

  const flash = (msg: string, isError = false) => {
    isError ? setError(msg) : setSuccess(msg);
    setTimeout(() => { setSuccess(''); setError(''); }, 3500);
  };

  const nameMutation = useMutation({
    mutationFn: () => apiUpdateMe({ name: nameForm.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['me'] }); setNameEditing(false); flash('Name updated.'); },
    onError: (e: any) => flash(e.response?.data?.detail ?? 'Failed to update name.', true),
  });

  const pwMutation = useMutation({
    mutationFn: () => apiUpdateMe({ current_password: pwForm.current_password, new_password: pwForm.new_password }),
    onSuccess: () => { setPwForm({ current_password: '', new_password: '', confirm: '' }); flash('Password changed.'); },
    onError: (e: any) => flash(e.response?.data?.detail ?? 'Failed to change password.', true),
  });

  const handlePwSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) { flash('New passwords do not match.', true); return; }
    if (pwForm.new_password.length < 6) { flash('Password must be at least 6 characters.', true); return; }
    pwMutation.mutate();
  };

  const roleLabel: Record<string, string> = { researcher: 'Researcher', admin: 'Admin' };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      <main className="flex-1 px-6 py-8 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">Manage your account details</p>

        {/* Flash messages */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-lg px-4 py-3 mb-6 text-sm">
            <CheckCircle size={15} /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 mb-6 text-sm">
            <AlertCircle size={15} /> {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-slate-400 text-sm">Loading…</div>
        ) : me ? (
          <div className="space-y-6">
            {/* Account info card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Account Info</h2>
              <div className="space-y-4">
                {/* Email (read-only) */}
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{me.email}</p>
                  </div>
                </div>

                {/* Role */}
                <div className="flex items-center gap-3">
                  <Shield size={16} className="text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                    <span className="inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
                      {roleLabel[me.role] ?? me.role}
                    </span>
                  </div>
                </div>

                {/* Member since */}
                <div className="flex items-center gap-3">
                  <Calendar size={16} className="text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Member since</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-white">
                      {new Date(me.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Display name card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Display Name</h2>
              <div className="flex items-center gap-3">
                <User size={16} className="text-slate-400 shrink-0" />
                {nameEditing ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      value={nameForm}
                      onChange={e => setNameForm(e.target.value)}
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => nameMutation.mutate()}
                      disabled={!nameForm.trim() || nameMutation.isPending}
                      className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                    >
                      {nameMutation.isPending ? 'Saving…' : 'Save'}
                    </button>
                    <button
                      onClick={() => { setNameEditing(false); setNameForm(me.name); }}
                      className="px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 dark:text-white">{me.name}</p>
                    <button
                      onClick={() => { setNameForm(me.name); setNameEditing(true); }}
                      className="text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Change password card */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-4">Change Password</h2>
              <form onSubmit={handlePwSubmit} className="space-y-3">
                {[
                  { key: 'current_password', label: 'Current password', placeholder: '••••••••' },
                  { key: 'new_password',     label: 'New password',     placeholder: '••••••••' },
                  { key: 'confirm',          label: 'Confirm new password', placeholder: '••••••••' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                    <div className="relative">
                      <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="password"
                        value={(pwForm as any)[key]}
                        onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-violet-500 outline-none"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="submit"
                  disabled={!pwForm.current_password || !pwForm.new_password || !pwForm.confirm || pwMutation.isPending}
                  className="w-full py-2 mt-1 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                >
                  {pwMutation.isPending ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
