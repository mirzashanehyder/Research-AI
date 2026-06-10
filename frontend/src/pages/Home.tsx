import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen, Search, Sparkles, ArrowRight, ArrowUpRight,
  Zap, Brain, Network, FileText, TrendingUp, GitMerge,
  Shield, Globe, Star, ChevronRight,
  Layers, BarChart3, MessageSquare, Upload, Lightbulb,
} from 'lucide-react'
import GalaxyCanvas from '../components/GalaxyCanvas'

// ── animated counter on scroll ────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000) {
  const [value, setValue] = useState(0)
  const [active, setActive] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setActive(true) }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.floor(eased * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])
  return { value, ref }
}

function Counter({ target, suffix, label, color }: { target: number; suffix: string; label: string; color: string }) {
  const { value, ref } = useCountUp(target, 2200)
  const display = target >= 1_000_000
    ? `${(value / 1_000_000).toFixed(value >= 1_000_000 ? 0 : 1)}M`
    : target >= 1_000 ? `${Math.floor(value / 1000)}K` : value
  return (
    <div ref={ref} className="text-center">
      <div className="text-5xl md:text-6xl font-black tabular-nums mb-2" style={{ color, textShadow: `0 0 40px ${color}88` }}>
        {display}{suffix}
      </div>
      <div className="text-slate-400 text-sm font-medium tracking-wide uppercase">{label}</div>
    </div>
  )
}

// ── search suggestions cycle ──────────────────────────────────────────────────

// ── data ─────────────────────────────────────────────────────────────────────
const SOURCES = [
  { name: 'arXiv',            color: '#7C3AED', icon: '⚛',  papers: '2.4M+' },
  { name: 'Semantic Scholar', color: '#3B82F6', icon: '🧠',  papers: '200M+' },
  { name: 'PubMed',           color: '#06B6D4', icon: '🔬',  papers: '36M+'  },
  { name: 'IEEE Xplore',      color: '#A855F7', icon: '⚡',  papers: '5M+'   },
  { name: 'Springer',         color: '#8B5CF6', icon: '📚',  papers: '12M+'  },
  { name: 'Crossref',         color: '#60A5FA', icon: '🔗',  papers: '150M+' },
  { name: 'CORE',             color: '#34D399', icon: '🌍',  papers: '32M+'  },
]

const AGENTS = [
  { icon: Search,    name: 'Research Scout',          desc: 'Autonomously searches 7 sources simultaneously, filters by relevance, and surfaces the most impactful papers for your topic.',         color: '#7C3AED', glow: 'rgba(124,58,237,0.35)' },
  { icon: GitMerge,  name: 'Citation Analyst',         desc: 'Maps citation networks and influence chains. Discovers seminal works and tracks how ideas propagate through academic literature.',    color: '#3B82F6', glow: 'rgba(59,130,246,0.35)'  },
  { icon: Brain,     name: 'Summarization Agent',      desc: 'Generates concise, structured summaries preserving key findings, methodology, and conclusions from any paper or document set.',     color: '#06B6D4', glow: 'rgba(6,182,212,0.35)'   },
  { icon: TrendingUp,name: 'Trend Discovery Agent',    desc: 'Identifies emerging research frontiers by analyzing publication velocity, citation growth, and cross-disciplinary convergence patterns.', color: '#A855F7', glow: 'rgba(168,85,247,0.35)'  },
  { icon: Network,   name: 'Knowledge Graph Agent',    desc: 'Constructs interactive topic relationship maps, revealing conceptual bridges between research domains and suggesting unexplored intersections.', color: '#34D399', glow: 'rgba(52,211,153,0.35)'  },
]

const FEATURES = [
  { icon: Globe,       title: 'Multi-Source Search',     desc: '7 academic databases simultaneously. arXiv, PubMed, IEEE, Semantic Scholar, Springer, Crossref, CORE.' },
  { icon: Brain,       title: 'AI Summaries',            desc: 'Groq-powered Llama 3.3 generates accurate paper summaries and literature reviews in seconds.' },
  { icon: GitMerge,    title: 'Citation Analysis',       desc: 'IEEE, APA, MLA, Chicago formats auto-generated. Full citation network mapping.' },
  { icon: Lightbulb,   title: 'Smart Recommendations',  desc: 'FAISS vector search surfaces 5-8 adjacent research topics aligned with your workspace.' },
  { icon: Layers,      title: 'Knowledge Workspace',     desc: 'Organise papers into workspaces with RAG chat — ask questions, get cited answers.' },
  { icon: Upload,      title: 'PDF Intelligence',        desc: 'Upload any PDF. Automatic chunking, embedding, and integration into your workspace.' },
  { icon: BarChart3,   title: 'Research Gap Analysis',   desc: 'AI identifies 3-5 unexplored gaps in your research domain from workspace papers.' },
  { icon: MessageSquare,'title': 'RAG Chat',             desc: 'Ask anything about your imported papers. AI answers only from your documents, fully cited.' },
  { icon: FileText,    title: 'Doc Space',               desc: 'Rich markdown editor with formatting toolbar for research notes, summaries, and reports.' },
]

const TESTIMONIALS = [
  { name: 'Dr. Sarah Chen',    role: 'Professor, MIT',               text: 'ResearchHub AI compressed weeks of literature review into hours. The citation network mapping alone is worth the switch.',      stars: 5 },
  { name: 'James Kowalski',    role: 'PhD Candidate, Stanford',      text: 'I discovered three critical papers I had completely missed. The Research Scout found connections I never would have made manually.', stars: 5 },
  { name: 'Dr. Amara Osei',    role: 'Research Lead, DeepMind',      text: 'The multi-source search and AI summaries are extraordinary. It feels like having a research assistant who never sleeps.',          stars: 5 },
]

// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const [mouse, setMouse]           = useState({ x: 0, y: 0 })
  const [navScrolled, setNavScrolled] = useState(false)
  const heroRef = useRef<HTMLDivElement>(null)

  // nav blur on scroll
  useEffect(() => {
    const fn = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setMouse({ x: (e.clientX / window.innerWidth - 0.5) * 2, y: (e.clientY / window.innerHeight - 0.5) * 2 })
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#020617', color: '#fff' }} onMouseMove={handleMouseMove}>

      {/* ── global styles ─────────────────────────────────────────────────── */}
      <style>{`
        @keyframes nebula   { 0%,100%{transform:scale(1) translate(0,0) rotate(0deg);opacity:.55} 50%{transform:scale(1.18) translate(40px,-30px) rotate(10deg);opacity:.7} }
        @keyframes float2   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-14px)} }
        @keyframes pulse-glow { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes warp     { 0%{transform:translateZ(0) scale(1) ;opacity:1} 100%{transform:translateZ(600px) scale(18);opacity:0} }
        @keyframes spin-slow { to{transform:rotate(360deg)} }
        @keyframes badge-in  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scanline  { 0%{background-position:0 0} 100%{background-position:0 100%} }
        @keyframes shimmer   { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes card-float { 0%,100%{transform:translateY(0) rotateX(0)} 50%{transform:translateY(-8px) rotateX(1deg)} }
        .nebula { animation: nebula 18s ease-in-out infinite; }
        .nebula2 { animation: nebula 22s ease-in-out infinite reverse; animation-delay:-8s; }
        .float-card { animation: card-float 5s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
        .spin-slow { animation: spin-slow 28s linear infinite; }
        .badge-in { animation: badge-in 0.6s ease-out both; }
        .search-shimmer { background: linear-gradient(90deg,transparent 0%,rgba(124,58,237,.12) 50%,transparent 100%); background-size:220% auto; animation: shimmer 2.5s linear infinite; }
        .warp-ray { animation: warp 1.8s linear infinite; transform-origin: center center; }
        .glass-card { background:rgba(15,23,42,.65); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,.07); }
        .gradient-text { background:linear-gradient(135deg,#E2C4FF 0%,#A855F7 35%,#3B82F6 70%,#06B6D4 100%); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
        .btn-primary { background:linear-gradient(135deg,#7C3AED,#3B82F6); background-size:220% auto; transition:background-position .4s,box-shadow .3s,transform .15s; box-shadow:0 0 32px rgba(124,58,237,.45); }
        .btn-primary:hover { background-position:right center; box-shadow:0 0 56px rgba(124,58,237,.65); transform:translateY(-2px); }
        .source-card { transition:transform .3s,box-shadow .3s; transform-style:preserve-3d; }
        .source-card:hover { transform:translateY(-10px) rotateX(4deg) rotateY(-4deg); }
        .agent-card { transition:transform .25s,box-shadow .25s; }
        .agent-card:hover { transform:translateY(-6px) scale(1.01); }
        .feat-card { transition:transform .25s,border-color .25s,box-shadow .25s; }
        .feat-card:hover { transform:translateY(-4px); border-color:rgba(124,58,237,.45) !important; box-shadow:0 0 28px rgba(124,58,237,.12); }
        .capsule:hover { transform:translateY(-6px) scale(1.01); }
        .capsule { transition:transform .3s; }
      `}</style>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{ background: navScrolled ? 'rgba(2,6,23,.88)' : 'transparent', backdropFilter: navScrolled ? 'blur(20px)' : 'none', borderBottom: navScrolled ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)', boxShadow: '0 0 20px rgba(124,58,237,.5)' }}>
              <BookOpen size={18} className="text-white" />
            </div>
            <span className="font-bold text-white text-lg tracking-tight">ResearchHub <span className="text-violet-400">AI</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'Sources', 'Agents'].map(l => (
              <a key={l} href={`#${l.toLowerCase()}`} className="text-sm text-slate-400 hover:text-white transition-colors">{l}</a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white transition-colors px-4 py-2">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm text-white px-5 py-2.5 rounded-xl font-semibold">Get started</Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">

        {/* nebula blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="nebula absolute w-[700px] h-[700px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(124,58,237,.22),rgba(59,130,246,.08) 55%,transparent 75%)', top: '-15%', left: '-10%' }} />
          <div className="nebula2 absolute w-[600px] h-[600px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(6,182,212,.15),rgba(168,85,247,.06) 50%,transparent 72%)', top: '20%', right: '-12%' }} />
          <div className="nebula absolute w-[500px] h-[500px] rounded-full" style={{ background: 'radial-gradient(circle,rgba(168,85,247,.14),transparent 65%)', bottom: '-10%', left: '30%', animationDelay: '-6s' }} />
          {/* grid */}
          <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'linear-gradient(rgba(124,58,237,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.06) 1px,transparent 1px)', backgroundSize: '72px 72px' }} />
          {/* radial fade */}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%,transparent 30%,rgba(2,6,23,.8) 100%)' }} />
        </div>

        {/* galaxy canvas */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.9 }}>
          <GalaxyCanvas mouse={mouse} />
        </div>

        {/* hero content */}
        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-24 pb-16">

          {/* pill badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold tracking-wide"
            style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.35)', color: '#C084FC' }}>
            <Sparkles size={12} />
            Powered by Groq · Llama 3.3 · FAISS Vector Search
          </div>

          <h1 className="text-6xl md:text-8xl font-black leading-none tracking-tight mb-6">
            <span className="gradient-text">Explore the Universe</span>
            <br /><span className="text-white">of Research</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Search, analyze, summarize, and discover insights across millions of academic papers with AI-powered research agents.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            <Link to="/register" className="btn-primary flex items-center gap-2.5 px-7 py-4 rounded-2xl text-white font-bold text-base">
              <Zap size={17} /> Start Researching
            </Link>
            <Link to="/login" className="flex items-center gap-2.5 px-7 py-4 rounded-2xl font-semibold text-sm text-white"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(12px)' }}>
              Sign in
            </Link>
          </div>

          {/* stat badges */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {[
              { label: '1M+ Research Papers',   delay: '0s'    },
              { label: '100M+ Citations',        delay: '0.12s' },
              { label: '50K+ Researchers',       delay: '0.24s' },
              { label: '7 Research Sources',     delay: '0.36s' },
            ].map(({ label, delay }) => (
              <div key={label} className="badge-in flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium"
                style={{ animationDelay: delay, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#94A3B8' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 animate-bounce">
          <div className="w-px h-12" style={{ background: 'linear-gradient(to bottom,rgba(124,58,237,.6),transparent)' }} />
          <ChevronRight size={14} className="text-violet-500 rotate-90" />
        </div>
      </section>

      {/* ── SOURCES ──────────────────────────────────────────────────────── */}
      <section id="sources" className="py-28 px-6 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%,rgba(59,130,246,.05),transparent)' }} />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-3">Live Data Sources</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">7 Academic Universes.<br /><span className="gradient-text">One Interface.</span></h2>
            <p className="text-slate-500 max-w-xl mx-auto">Every search queries all sources simultaneously — no switching tabs, no missed papers.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {SOURCES.map(({ name, color, icon, papers }, i) => (
              <div key={name} className="source-card glass-card rounded-2xl p-5 flex flex-col items-center gap-3 cursor-default"
                style={{ animationDelay: `${i * 0.1}s`, boxShadow: `0 0 30px ${color}18` }}>
                <div className="text-3xl">{icon}</div>
                <div className="w-10 h-px" style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }} />
                <div className="text-center">
                  <div className="text-xs font-bold text-white mb-0.5">{name}</div>
                  <div className="text-xs" style={{ color }}>{papers} papers</div>
                </div>
                <div className="w-2 h-2 rounded-full pulse-glow" style={{ background: color }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTS ───────────────────────────────────────────────────────── */}
      <section id="agents" className="py-28 px-6 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg,rgba(124,58,237,.04) 0%,transparent 60%)' }} />
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-3">AI-Powered Agents</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Intelligent Research<br /><span className="gradient-text">Agents at Work</span></h2>
            <p className="text-slate-500 max-w-xl mx-auto">Five specialized AI modules working in concert to accelerate every stage of your research process.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AGENTS.map(({ icon: Icon, name, desc, color, glow }, i) => (
              <div key={name} className={`agent-card glass-card rounded-2xl p-7 relative overflow-hidden ${i === 4 ? 'md:col-span-2 lg:col-span-1' : ''}`}
                style={{ boxShadow: `0 0 40px ${glow}` }}>
                {/* bg glow */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                  style={{ background: `radial-gradient(circle,${color}18,transparent 70%)`, transform: 'translate(30%,-30%)' }} />
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 shrink-0"
                    style={{ background: `${color}22`, border: `1px solid ${color}44`, boxShadow: `0 0 20px ${color}33` }}>
                    <Icon size={22} style={{ color }} />
                  </div>
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-bold text-white">{name}</h3>
                    <span className="w-1.5 h-1.5 rounded-full pulse-glow flex-shrink-0" style={{ background: color }} />
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
                    Activate agent <ArrowUpRight size={13} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%,rgba(124,58,237,.08),transparent)' }} />
          <div className="spin-slow absolute w-[600px] h-[600px] rounded-full border border-violet-800/20 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="spin-slow absolute w-[800px] h-[800px] rounded-full border border-blue-900/10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ animationDirection: 'reverse' }} />
        </div>
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Knowledge at <span className="gradient-text">Cosmic Scale</span></h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <Counter target={1_000_000} suffix="+" label="Research Papers"   color="#A855F7" />
            <Counter target={100_000_000} suffix="+" label="Citations"         color="#3B82F6" />
            <Counter target={50_000}    suffix="+" label="Researchers"        color="#06B6D4" />
            <Counter target={7}         suffix=""  label="Research Sources"   color="#A855F7" />
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-violet-400 text-xs font-bold tracking-widest uppercase mb-3">Everything You Need</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Built for Serious<br /><span className="gradient-text">Researchers</span></h2>
            <p className="text-slate-500 max-w-xl mx-auto">From discovery to publication-ready citations — every tool you need in one platform.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="feat-card glass-card rounded-2xl p-6 group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.25)' }}>
                  <Icon size={18} className="text-violet-400" />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 60% at 50% 50%,rgba(59,130,246,.05),transparent)' }} />
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-xs font-bold tracking-widest uppercase mb-3">Researcher Voices</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">Trusted by the<br /><span className="gradient-text">Research Community</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, role, text, stars }) => (
              <div key={name} className="capsule glass-card rounded-3xl p-8 relative overflow-hidden"
                style={{ boxShadow: '0 0 40px rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.15)' }}>
                <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,rgba(59,130,246,.5),transparent)' }} />
                <div className="flex mb-4">
                  {Array.from({ length: stars }).map((_, i) => (
                    <Star key={i} size={13} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-white text-sm font-semibold">{name}</div>
                    <div className="text-slate-500 text-xs">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section className="py-36 px-6 relative overflow-hidden">
        {/* warp rays */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="warp-ray absolute"
              style={{
                width: '2px',
                height: '55vh',
                background: `linear-gradient(to top,transparent,${i % 3 === 0 ? '#7C3AED' : i % 3 === 1 ? '#3B82F6' : '#06B6D4'}66,transparent)`,
                transform: `rotate(${i * 18}deg) translateY(-30vh)`,
                opacity: 0.35,
                animationDelay: `${i * 0.09}s`,
              }} />
          ))}
          <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 55% 55% at 50% 50%,rgba(124,58,237,.14),transparent 70%)' }} />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 text-xs font-semibold"
            style={{ background: 'rgba(124,58,237,.15)', border: '1px solid rgba(124,58,237,.35)', color: '#C084FC' }}>
            <Sparkles size={11} /> Ready for launch
          </div>
          <h2 className="text-5xl md:text-6xl font-black text-white mb-6 leading-tight">
            Ready to Discover the<br /><span className="gradient-text">Next Breakthrough?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Join thousands of researchers navigating the universe of academic knowledge with AI as their co-pilot.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/register" className="btn-primary flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-bold text-base">
              <Zap size={18} /> Launch ResearchHub AI <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="flex items-center gap-2 px-7 py-4 rounded-2xl font-semibold text-sm text-slate-300 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)' }}>
              Sign in <ChevronRight size={15} />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-slate-600">
            <span className="flex items-center gap-1.5"><Shield size={11} className="text-emerald-500" /> SOC 2 Compliant</span>
            <span className="flex items-center gap-1.5"><Globe size={11} className="text-blue-500" /> 99.9% Uptime</span>
            <span className="flex items-center gap-1.5"><Zap size={11} className="text-violet-500" /> Free to start</span>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="border-t py-10 px-6" style={{ borderColor: 'rgba(255,255,255,.05)' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#7C3AED,#3B82F6)' }}>
              <BookOpen size={14} className="text-white" />
            </div>
            <span className="text-slate-400 text-sm font-medium">ResearchHub AI</span>
          </div>
          <p className="text-slate-700 text-xs">© {new Date().getFullYear()} ResearchHub AI. Built for curious minds.</p>
          <div className="flex items-center gap-5">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a key={l} href="#" className="text-slate-600 hover:text-slate-400 text-xs transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
