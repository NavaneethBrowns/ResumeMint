import { useMemo, useState } from 'react';
import {
  ArrowRight, CheckCircle2, Download, FileUp, Gauge, Heart, LayoutTemplate, Lock, Palette, ShieldCheck, Sparkles, Target, Wand2, Zap,
} from 'lucide-react';
import { TEMPLATES } from '../data/templates';
import { defaultLayout, designForTemplate, sampleResume } from '../data/sections';
import { navigate } from '../lib/router';
import { Brand } from '../components/Brand';
import { ResumeThumb } from '../components/resume/ResumePreview';
import { ScoreRing } from '../components/ats/AtsReportView';
import type { TemplateDef } from '../types/resume';

const CATEGORIES = ['All', 'ATS Classic', 'Modern', 'Creative', 'Executive'] as const;

const FEATURES = [
  { icon: LayoutTemplate, title: '13 designer templates', text: 'From Harvard-classic to gradient sidebars. Switch instantly — your content reflows perfectly.' },
  { icon: Target, title: 'Tailor to each job', text: 'Paste a job post and get a copy of your resume reordered and reworded to match it — keywords, not fiction.' },
  { icon: Gauge, title: 'Live ATS score', text: '25+ checks across parsing, keywords, impact and length, updating as you type.' },
  { icon: FileUp, title: 'Import any resume', text: 'Drop a PDF or DOCX. We extract and rearrange everything into your chosen format.' },
  { icon: Palette, title: 'Deep customisation', text: 'Colours, 12 fonts, spacing, margins, section order, sidebar placement and custom titles.' },
  { icon: Download, title: '6 export formats', text: 'PDF with real text, Word DOCX, PNG, HTML, plain text and a re-importable backup.' },
  { icon: Wand2, title: 'Optional AI polish', text: 'Bring a free Gemini key to rewrite bullets, parse tricky files and get a recruiter review.' },
];

const thumbDoc = (t: TemplateDef, data = sampleResume()) => ({
  data,
  layout: defaultLayout(t.id),
  design: designForTemplate(t.id),
});

export const Landing = () => {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All');
  const sample = useMemo(() => sampleResume(), []);
  const thumbs = useMemo(() => TEMPLATES.map((t) => ({ t, doc: thumbDoc(t, sample) })), [sample]);
  const shown = thumbs.filter((x) => cat === 'All' || x.t.category === cat);
  const start = (template?: string) => navigate('/builder', template ? { template } : undefined);

  return (
    <div className="landing">
      <section className="hero">
        <div className="aurora-blob b1" />
        <div className="aurora-blob b2" />
        <div className="aurora-blob b3" />
        <div className="hero-grid-bg" />
        <nav className="nav">
          <Brand light onClick={() => navigate('/')} />
          <div className="nav-links">
            <a href="#templates">Templates</a>
            <a href="#features">Features</a>
            <a href="#/ats">ATS checker</a>
            <a href="#/support" className="nav-support">
              <Heart size={15} /> Support us
            </a>
            <button className="btn btn-glass btn-sm" onClick={() => start()}>
              Open builder
            </button>
          </div>
        </nav>

        <div className="hero-inner">
          <div>
            <span className="eyebrow">
              <b>NEW</b> Tailor your resume to any job with AI
            </span>
            <h1>
              Resumes that look <span className="grad-text">stunning</span> and read perfectly to every ATS.
            </h1>
            <p className="hero-lead">
              Build, import and perfect your resume in minutes. Pick from 13 handcrafted templates, tune every detail, and watch your ATS score climb in real time.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={() => start()}>
                Build my resume <ArrowRight size={18} />
              </button>
              <button className="btn btn-glass btn-lg" onClick={() => navigate('/ats')}>
                <Gauge size={18} /> Check ATS score
              </button>
            </div>
            <div className="hero-proof">
              <span><CheckCircle2 size={16} /> Free, no sign-up</span>
              <span><Lock size={16} /> Data stays in your browser</span>
              <span><Zap size={16} /> Import PDF / DOCX</span>
            </div>
          </div>

          <div className="hero-visual" aria-hidden>
            <div className="hero-card back">
              <ResumeThumb doc={thumbs[3].doc} width={300} />
            </div>
            <div className="hero-card main">
              <ResumeThumb doc={thumbs[0].doc} width={360} />
            </div>
            <div className="hero-badge score">
              <ScoreRing score={92} size={54} stroke={6} />
              <div>
                <small>ATS score</small>
                <strong>Excellent match</strong>
              </div>
            </div>
            <div className="hero-badge kw">
              <span className="feature-icon" style={{ margin: 0, width: 40, height: 40 }}>
                <Sparkles size={18} />
              </span>
              <div>
                <small>Keywords matched</small>
                <strong>18 / 21 · React, AWS, Kafka</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-strip">
        <div className="stat"><strong className="grad-text">13</strong><span>Templates</span></div>
        <div className="stat"><strong className="grad-text">25+</strong><span>ATS checks</span></div>
        <div className="stat"><strong className="grad-text">6</strong><span>Export formats</span></div>
        <div className="stat"><strong className="grad-text">100%</strong><span>Private & local</span></div>
      </div>

      <section className="section" id="features">
        <div className="section-head">
          <span className="kicker">Everything you need</span>
          <h2>Designed like a product, built for getting hired.</h2>
          <p>The polish of premium resume builders — without paywalls, watermarks or accounts.</p>
        </div>
        <div className="features">
          {FEATURES.map((f) => (
            <div key={f.title} className="feature">
              <span className="feature-icon"><f.icon size={22} /></span>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" id="templates" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="kicker">Template gallery</span>
          <h2>Pick a look. Change it anytime.</h2>
          <p>Every template is fully customisable and exports with real, ATS-readable text.</p>
        </div>
        <div className="gallery-filters">
          {CATEGORIES.map((c) => (
            <button key={c} className={`filter-pill${cat === c ? ' active' : ''}`} onClick={() => setCat(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="gallery">
          {shown.map(({ t, doc }) => (
            <button key={t.id} className="tpl-card" onClick={() => start(t.id)}>
              <div className="tpl-frame">
                <ResumeThumb doc={doc} width={260} />
                <div className="tpl-overlay">
                  <span className="btn btn-primary btn-sm">Use {t.name}</span>
                </div>
              </div>
              <div className="tpl-meta">
                <div>
                  <strong>{t.name}</strong>
                  <small>{t.tagline}</small>
                </div>
                <span className={`ats-badge${t.atsSafety < 85 ? ' mid' : ''}`}>ATS {t.atsSafety}</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-head">
          <span className="kicker">How it works</span>
          <h2>From blank page to interview-ready.</h2>
        </div>
        <div className="steps">
          <div className="step">
            <h3>Start or import</h3>
            <p>Begin from a polished example, a blank page, or drop in your existing PDF/DOCX resume.</p>
          </div>
          <div className="step">
            <h3>Design & refine</h3>
            <p>Choose a template, tweak colours and layout, and follow live ATS tips to strengthen every line.</p>
          </div>
          <div className="step">
            <h3>Tailor & export</h3>
            <p>Paste a job description, close keyword gaps, then download as PDF, DOCX and more.</p>
          </div>
        </div>
      </section>

      <div className="cta-band">
        <div className="cta-inner">
          <div>
            <h2>Your next role starts with a better resume.</h2>
            <p>No account. No watermark. Just a resume you're proud to send.</p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => start()}>
              Start building <ArrowRight size={18} />
            </button>
            <button className="btn btn-glass btn-lg" onClick={() => navigate('/builder', { import: '1' })}>
              <FileUp size={18} /> Import resume
            </button>
          </div>
        </div>
      </div>

      <footer className="footer">
        <ShieldCheck size={14} style={{ verticalAlign: -2 }} /> Resumint stores everything in your browser's local storage. © {new Date().getFullYear()}
        <a href="#/support" className="footer-link">
          <Heart size={13} /> Support us
        </a>
      </footer>
    </div>
  );
};
