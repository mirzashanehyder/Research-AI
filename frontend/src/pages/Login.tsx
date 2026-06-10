import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Mail, Lock, Eye, EyeOff, BookOpen, Brain, Network,
  FileText, Quote, X, CheckCircle2, AlertCircle,
} from 'lucide-react'
import { apiLogin } from '../utils/api'
import { setToken } from '../utils/auth'
import GlobeCanvas from '../components/GlobeCanvas'

// ── animated counter ──────────────────────────────────────────────────────────
function useCounter(target: number, duration = 2200, delay = 600) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const id = setTimeout(() => {
      const start = performance.now()
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1)
        const eased = 1 - Math.pow(1 - p, 3)
        setVal(Math.floor(eased * target))
        if (p < 1) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    }, delay)
    return () => clearTimeout(id)
  }, [target, duration, delay])
  return val
}

// ── types ─────────────────────────────────────────────────────────────────────
type Toast = { id: string; type: 'success' | 'error'; message: string }

// ── floating icon data ────────────────────────────────────────────────────────
const ICONS = [
  { Icon: BookOpen, top: '14%', left: '8%',   delay: '0s',    dur: '6s'  },
  { Icon: Brain,    top: '28%', right: '7%',   delay: '1.2s',  dur: '7.5s'},
  { Icon: FileText, top: '52%', left: '5%',    delay: '2.1s',  dur: '5.5s'},
  { Icon: Network,  top: '68%', right: '9%',   delay: '0.7s',  dur: '8s'  },
  { Icon: Quote,    top: '38%', left: '3%',    delay: '3s',    dur: '6.5s'},
  { Icon: BookOpen, top: '80%', left: '12%',   delay: '1.8s',  dur: '7s'  },
]

// ── stat counter display ──────────────────────────────────────────────────────
function Stat({ value, suffix, label, color }: {
  value: number; suffix: string; label: string; color: string
}) {
  return (
    <div>
      <div className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value >= 1_000_000
          ? `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`
          : value >= 1_000
          ? `${Math.floor(value / 1000)}K`
          : value}
        {suffix}
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate()

  const [form, setForm]       = useState({ email: '', password: '', remember: false })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const [errors, setErrors]   = useState<{ email?: string; password?: string }>({})
  const [toasts, setToasts]   = useState<Toast[]>([])
  const [mouse, setMouse]     = useState({ x: 0, y: 0 })
  const [mounted, setMounted] = useState(false)

  const papersCount      = useCounter(1_000_000, 2500, 800)
  const researchersCount = useCounter(50_000, 2000, 1100)

  useEffect(() => setMounted(true), [])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString()
    setToasts(t => [...t, { id, type, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4500)
  }, [])

  const validate = () => {
    const e: typeof errors = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email'
    if (!form.password) e.password = 'Password is required'
    else if (form.password.length < 6) e.password = 'At least 6 characters'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await apiLogin(form)
      setToken(data.access_token, data.role)
      addToast('success', 'Signed in! Redirecting to dashboard…')
      setTimeout(() => navigate('/dashboard'), 1100)
    } catch (err: any) {
      addToast('error', err.response?.data?.detail ?? 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    setMouse({
      x: (e.clientX / window.innerWidth  - 0.5) * 2,
      y: (e.clientY / window.innerHeight - 0.5) * 2,
    })
  }

  return (
    <div
      className="min-h-screen flex overflow-hidden select-none"
      style={{ background: '#020817' }}
      onMouseMove={handleMouseMove}
    >

      {/* ── keyframes ──────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0)   rotate(0deg)  scale(1);    }
          33%     { transform: translateY(-13px) rotate(7deg)  scale(1.06); }
          66%     { transform: translateY(7px)  rotate(-5deg) scale(0.97); }
        }
        @keyframes blob {
          0%,100% { transform: scale(1)   translate(0,0); }
          33%     { transform: scale(1.12) translate(28px,-44px); }
          66%     { transform: scale(0.9) translate(-18px,20px); }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(26px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity:0; }
          to   { opacity:1; }
        }
        @keyframes toastIn {
          from { opacity:0; transform:translateX(80px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes btnShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .float-icon { animation: float var(--dur,6s) ease-in-out infinite;
                      animation-delay: var(--delay,0s); }
        .blob       { animation: blob 9s ease-in-out infinite; }
        .slide-up   { animation: slideUp 0.55s ease-out both; }
        .fade-in    { animation: fadeIn  0.9s ease-out both;  }
        .toast-in   { animation: toastIn 0.3s ease-out; }
        .btn-shimmer {
          background: linear-gradient(135deg,#7C3AED 0%,#3B82F6 45%,#7C3AED 100%);
          background-size: 220% auto;
          transition: background-position 0.5s, box-shadow 0.3s, transform 0.15s;
        }
        .btn-shimmer:hover:not(:disabled) {
          background-position: right center;
          box-shadow: 0 0 36px rgba(124,58,237,0.55), 0 0 80px rgba(124,58,237,0.2);
          transform: translateY(-1px);
        }
        .btn-shimmer:active:not(:disabled) { transform: translateY(0); }
        .glass-input {
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .glass-input:focus {
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 3px rgba(124,58,237,0.14), 0 0 20px rgba(124,58,237,0.12);
          outline: none;
        }
        .glass-input.err { border-color: rgba(239,68,68,0.55) !important; }
      `}</style>

      {/* ── background layers ───────────────────────────────────────────────── */}
      {/* grid */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: 'linear-gradient(rgba(124,58,237,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.04) 1px,transparent 1px)',
        backgroundSize: '64px 64px',
      }} />
      {/* gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="blob absolute w-[480px] h-[480px] rounded-full"
          style={{ background:'radial-gradient(circle,rgba(124,58,237,.16),transparent 70%)', top:'5%', left:'2%' }} />
        <div className="blob absolute w-96 h-96 rounded-full"
          style={{ background:'radial-gradient(circle,rgba(59,130,246,.12),transparent 70%)', bottom:'10%', right:'3%', animationDelay:'-4s' }} />
        <div className="blob absolute w-72 h-72 rounded-full"
          style={{ background:'radial-gradient(circle,rgba(168,85,247,.1),transparent 70%)', top:'45%', left:'40%', animationDelay:'-7s' }} />
      </div>
      {/* light rays */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background:'conic-gradient(from 200deg at 38% 55%,transparent 0deg,rgba(124,58,237,.025) 55deg,transparent 110deg)',
      }} />

      {/* ── LEFT PANEL — globe ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-col relative w-[62%] overflow-hidden">

        {/* Three.js canvas */}
        <div className="absolute inset-0">
          <GlobeCanvas mouse={mouse} />
        </div>

        {/* floating academic icons */}
        {ICONS.map(({ Icon, top, left, right, delay, dur }, i) => (
          <div
            key={i}
            className="float-icon absolute z-10 w-10 h-10 flex items-center justify-center rounded-xl"
            style={{
              '--dur': dur, '--delay': delay,
              top, left, right,
              background: 'rgba(124,58,237,0.11)',
              border: '1px solid rgba(124,58,237,0.25)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 18px rgba(124,58,237,0.18)',
            } as React.CSSProperties}
          >
            <Icon size={17} className="text-violet-400" />
          </div>
        ))}

        {/* branding + stats */}
        <div
          className={`absolute bottom-0 left-0 right-0 p-12 ${mounted ? 'fade-in' : 'opacity-0'}`}
          style={{ background:'linear-gradient(to top,rgba(2,8,23,.97) 0%,rgba(2,8,23,.6) 55%,transparent 100%)' }}
        >
          <div className="max-w-lg">
            {/* logo */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)', boxShadow:'0 0 24px rgba(124,58,237,.55)' }}>
                <BookOpen size={21} className="text-white" />
              </div>
              <div>
                <span className="text-white font-bold text-xl tracking-tight">ResearchHub AI</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-slate-500">Live · 7 sources active</span>
                </div>
              </div>
            </div>

            <h2 className="text-4xl font-bold text-white mb-3 leading-snug">
              Your intelligent academic<br/>research assistant
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-sm">
              Search, analyze, summarize, and organize research from multiple academic sources using AI.
            </p>

            {/* counters */}
            <div className="flex gap-10">
              <Stat value={papersCount}      suffix="+" label="Research Papers"  color="#A855F7" />
              <Stat value={researchersCount} suffix="+" label="Researchers"      color="#3B82F6" />
              <Stat value={7}               suffix=""  label="Academic Sources"  color="#A855F7" />
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — form ─────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10 relative">

        {/* mobile logo */}
        <div className="lg:hidden absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
            <BookOpen size={16} className="text-white" />
          </div>
          <span className="text-white font-semibold">ResearchHub AI</span>
        </div>

        {/* card */}
        <div
          className={`w-full max-w-md ${mounted ? 'slide-up' : 'opacity-0'}`}
          style={{
            background: 'rgba(15,23,42,0.78)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '24px',
            padding: '44px 40px',
            boxShadow: '0 30px 60px rgba(0,0,0,.55), 0 0 0 1px rgba(124,58,237,.1), inset 0 1px 0 rgba(255,255,255,.05)',
          }}
        >
          {/* header */}
          <div className="mb-9">
            <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm">Sign in to your research workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* email */}
            <div className="slide-up" style={{ animationDelay: '0.08s' }}>
              <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">
                Email address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input
                  type="email"
                  value={form.email}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(ex => ({ ...ex, email: '' })) }}
                  placeholder="you@university.edu"
                  className={`glass-input w-full pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 rounded-xl ${errors.email ? 'err' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                  <AlertCircle size={11} />{errors.email}
                </p>
              )}
            </div>

            {/* password */}
            <div className="slide-up" style={{ animationDelay: '0.16s' }}>
              <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(ex => ({ ...ex, password: '' })) }}
                  placeholder="••••••••"
                  className={`glass-input w-full pl-10 pr-11 py-3 text-sm text-white placeholder-slate-600 rounded-xl ${errors.password ? 'err' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors z-10"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {errors.password && (
                <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                  <AlertCircle size={11} />{errors.password}
                </p>
              )}
            </div>

            {/* remember + forgot */}
            <div className="slide-up flex items-center justify-between pt-0.5" style={{ animationDelay: '0.22s' }}>
              <label
                className="flex items-center gap-2.5 cursor-pointer group"
                onClick={() => setForm(f => ({ ...f, remember: !f.remember }))}
              >
                <div
                  className="w-4 h-4 rounded flex items-center justify-center transition-all shrink-0"
                  style={{
                    background: form.remember
                      ? 'linear-gradient(135deg,#7C3AED,#3B82F6)'
                      : 'rgba(255,255,255,0.06)',
                    border: form.remember ? 'none' : '1px solid rgba(255,255,255,0.14)',
                    boxShadow: form.remember ? '0 0 10px rgba(124,58,237,0.4)' : 'none',
                  }}
                >
                  {form.remember && (
                    <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-violet-500 hover:text-violet-400 transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* submit */}
            <button
              type="submit"
              disabled={loading}
              className="slide-up btn-shimmer w-full py-3.5 text-white font-semibold rounded-xl text-sm disabled:opacity-55 disabled:cursor-not-allowed"
              style={{
                animationDelay: '0.3s',
                boxShadow: '0 0 28px rgba(124,58,237,0.35)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2.5">
                  <svg className="w-4 h-4" style={{ animation:'spin 0.8s linear infinite' }}
                    viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in to ResearchHub'}
            </button>
          </form>

          {/* sign-up */}
          <p className="text-center text-xs text-slate-600 mt-7">
            New to ResearchHub?{' '}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium transition-colors">
              Create a free account
            </Link>
          </p>

          {/* security footer */}
          <div className="mt-6 pt-6 border-t border-white/[.05] flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[11px] text-slate-700">256-bit SSL · SOC 2 compliant · Zero data retention</span>
          </div>
        </div>
      </div>

      {/* ── toasts ─────────────────────────────────────────────────────────── */}
      <div className="fixed top-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div
            key={t.id}
            className="toast-in flex items-center gap-3 px-4 py-3.5 rounded-2xl min-w-[280px] max-w-xs"
            style={{
              background: t.type === 'success' ? 'rgba(16,185,129,.12)' : 'rgba(239,68,68,.12)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid ${t.type === 'success' ? 'rgba(16,185,129,.3)' : 'rgba(239,68,68,.3)'}`,
              boxShadow: `0 8px 32px ${t.type === 'success' ? 'rgba(16,185,129,.1)' : 'rgba(239,68,68,.1)'}`,
            }}
          >
            {t.type === 'success'
              ? <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              : <AlertCircle  size={16} className="text-red-400 shrink-0" />
            }
            <p className={`text-sm flex-1 ${t.type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>
              {t.message}
            </p>
            <button
              onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}
              className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 ml-1"
            >
              <X size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
