import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, BookOpen, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { apiForgotPassword, apiVerifyOtp } from '../utils/api'

type Step = 'email' | 'otp' | 'password' | 'done'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step,       setStep]     = useState<Step>('email')
  const [email,      setEmail]    = useState('')
  const [otp,        setOtp]      = useState(['', '', '', '', '', ''])
  const [newPw,      setNewPw]    = useState('')
  const [confirmPw,  setConfirmPw]= useState('')
  const [otpCode,    setOtpCode]  = useState('')
  const [showPw,     setShowPw]   = useState(false)
  const [loading,    setLoading]  = useState(false)
  const [error,      setError]    = useState('')
  const [resendSecs, setResend]   = useState(0)
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])

  // countdown for resend
  useEffect(() => {
    if (resendSecs <= 0) return
    const id = setTimeout(() => setResend(s => s - 1), 1000)
    return () => clearTimeout(id)
  }, [resendSecs])

  // auto-focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp') setTimeout(() => otpRefs.current[0]?.focus(), 120)
  }, [step])

  const handleOtpKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus()
    }
  }

  const handleOtpChange = (i: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[i] = digit
    setOtp(next)
    if (digit && i < 5) otpRefs.current[i + 1]?.focus()
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setOtp(text.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const sendOtp = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) { setError('Enter a valid email address'); return }
    setError('')
    setLoading(true)
    try {
      await apiForgotPassword(email)
      setOtp(['', '', '', '', '', ''])
      setOtpCode('')
      setStep('otp')
      setResend(60)
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const verifyAndProceed = () => {
    const code = otp.join('')
    if (code.length < 6) { setError('Enter the full 6-digit OTP'); return }
    setError('')
    setOtpCode(code)
    setStep('password')
  }

  const submitPassword = async () => {
    if (!otpCode) { setError('Please verify the OTP before resetting your password.'); setStep('otp'); return }
    if (newPw.length < 6)     { setError('Password must be at least 6 characters'); return }
    if (newPw !== confirmPw)  { setError('Passwords do not match'); return }
    setError('')
    setLoading(true)
    try {
      await apiVerifyOtp({ email, otp: otpCode, new_password: newPw })
      setStep('done')
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to reset password.')
      setStep('otp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#020817' }}>
      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fp-card { animation: slideUp .35s ease-out both; }
        .otp-box:focus { border-color:rgba(124,58,237,.6); box-shadow:0 0 0 3px rgba(124,58,237,.18); }
      `}</style>

      {/* background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-96 h-96 rounded-full" style={{ background:'radial-gradient(circle,rgba(124,58,237,.18),transparent 70%)', top:'-8%', left:'-5%' }} />
        <div className="absolute w-80 h-80 rounded-full" style={{ background:'radial-gradient(circle,rgba(59,130,246,.12),transparent 70%)', bottom:'5%', right:'-3%' }} />
      </div>

      <div className="fp-card w-full max-w-md relative z-10"
        style={{ background:'rgba(15,23,42,.8)', backdropFilter:'blur(24px)', border:'1px solid rgba(255,255,255,.08)', borderRadius:24, padding:'44px 40px', boxShadow:'0 30px 60px rgba(0,0,0,.5)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
            <BookOpen size={17} className="text-white" />
          </div>
          <span className="text-white font-bold text-base">ResearchHub <span className="text-violet-400">AI</span></span>
        </div>

        {/* ── STEP: EMAIL ─────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Forgot password?</h2>
            <p className="text-slate-500 text-sm mb-8">Enter your account email and we'll send you a 6-digit OTP.</p>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4 px-3 py-2 rounded-xl" style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="mb-5">
              <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Email address</label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOtp()}
                  placeholder="you@university.edu"
                  className="w-full pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 rounded-xl outline-none"
                  style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)', transition:'border-color .2s,box-shadow .2s' }}
                />
              </div>
            </div>

            <button onClick={sendOtp} disabled={loading}
              className="w-full py-3.5 text-white font-semibold rounded-xl text-sm disabled:opacity-55"
              style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)', boxShadow:'0 0 28px rgba(124,58,237,.35)' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Sending OTP…</span> : 'Send OTP'}
            </button>
          </>
        )}

        {/* ── STEP: OTP ───────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <button onClick={() => setStep('email')} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs mb-6 transition-colors">
              <ArrowLeft size={13} /> Back
            </button>
            <h2 className="text-2xl font-bold text-white mb-1">Check your email</h2>
            <p className="text-slate-500 text-sm mb-2">We sent a 6-digit code to</p>
            <p className="text-violet-400 font-medium text-sm mb-8">{email}</p>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4 px-3 py-2 rounded-xl" style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* OTP boxes */}
            <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={el => { otpRefs.current[i] = el }}
                  value={d}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKey(i, e)}
                  maxLength={1}
                  className="otp-box w-12 h-14 text-center text-2xl font-bold text-white rounded-xl outline-none transition-all"
                  style={{ background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)' }}
                  inputMode="numeric"
                />
              ))}
            </div>

            <button onClick={verifyAndProceed}
              className="w-full py-3.5 text-white font-semibold rounded-xl text-sm mb-4"
              style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)', boxShadow:'0 0 28px rgba(124,58,237,.35)' }}>
              Verify OTP
            </button>

            <p className="text-center text-xs text-slate-600">
              Didn't receive it?{' '}
              {resendSecs > 0
                ? <span className="text-slate-500">Resend in {resendSecs}s</span>
                : <button onClick={async () => { setLoading(true); await apiForgotPassword(email).catch(() => {}); setOtp(['', '', '', '', '', '']); setOtpCode(''); setResend(60); setLoading(false); }} className="text-violet-400 hover:text-violet-300 transition-colors">Resend OTP</button>
              }
            </p>
          </>
        )}

        {/* ── STEP: NEW PASSWORD ──────────────────────────────── */}
        {step === 'password' && (
          <>
            <h2 className="text-2xl font-bold text-white mb-1">Set new password</h2>
            <p className="text-slate-500 text-sm mb-8">Choose a strong password for your account.</p>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm mb-4 px-3 py-2 rounded-xl" style={{ background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)' }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">New Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-10 py-3 text-sm text-white placeholder-slate-600 rounded-xl outline-none"
                    style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-300 transition-colors">
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-2 uppercase tracking-widest">Confirm Password</label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
                  <input
                    type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && submitPassword()}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 rounded-xl outline-none"
                    style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.09)' }}
                  />
                </div>
              </div>
            </div>

            <button onClick={submitPassword} disabled={loading}
              className="w-full py-3.5 text-white font-semibold rounded-xl text-sm disabled:opacity-55"
              style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)', boxShadow:'0 0 28px rgba(124,58,237,.35)' }}>
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 size={15} className="animate-spin" /> Resetting…</span> : 'Reset Password'}
            </button>
          </>
        )}

        {/* ── STEP: DONE ──────────────────────────────────────── */}
        {step === 'done' && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)' }}>
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Password reset!</h2>
            <p className="text-slate-400 text-sm mb-8">Your password has been updated successfully.<br />You can now sign in with your new password.</p>
            <button onClick={() => navigate('/login')}
              className="w-full py-3.5 text-white font-semibold rounded-xl text-sm"
              style={{ background:'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
              Go to Sign in
            </button>
          </div>
        )}

        {/* Back to login */}
        {step !== 'done' && (
          <p className="text-center text-xs text-slate-600 mt-6">
            Remember your password?{' '}
            <Link to="/login" className="text-violet-400 hover:text-violet-300 transition-colors font-medium">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}
