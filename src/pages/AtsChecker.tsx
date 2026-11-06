import { useMemo, useState } from 'react';
import { ArrowRight, FileText, Gauge, RefreshCw, Sparkles } from 'lucide-react';
import type { ResumeData } from '../types/resume';
import { useResumeStore } from '../store/useResumeStore';
import { useSettings } from '../store/useSettings';
import { useUi } from '../store/useUi';
import { navigate } from '../lib/router';
import { importResumeFile } from '../lib/parser/importResume';
import { resumeToPlainText } from '../lib/text';
import { defaultLayout } from '../data/sections';
import { getTemplate } from '../data/templates';
import { scoreResume } from '../lib/ats/score';
import { Brand } from '../components/Brand';
import { FileDrop } from '../components/import/ImportDialog';
import { AiReviewCard, AtsReportView } from '../components/ats/AtsReportView';
import { TextArea, toast } from '../components/ui/primitives';

type Source = { kind: 'upload'; name: string; data: ResumeData } | { kind: 'saved'; id: string };

export const AtsChecker = () => {
  const docs = useResumeStore((s) => s.docs);
  const hasKey = useSettings((s) => Boolean(s.geminiKey));
  const [source, setSource] = useState<Source | null>(null);
  const [busy, setBusy] = useState(false);
  const [jd, setJd] = useState('');

  const resolved = useMemo(() => {
    if (!source) return null;
    if (source.kind === 'upload') return { data: source.data, layout: defaultLayout('harvard'), safety: 90, photo: false, name: source.name };
    const d = docs.find((x) => x.id === source.id);
    return d ? { data: d.data, layout: d.layout, safety: getTemplate(d.design.templateId).atsSafety, photo: d.design.showPhoto && !!d.data.personal.photo, name: d.name } : null;
  }, [source, docs]);

  const report = useMemo(
    () => resolved && scoreResume(resolved.data, resolved.layout, { jobDescription: jd, templateSafety: resolved.safety, hasPhoto: resolved.photo }),
    [resolved, jd],
  );

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const r = await importResumeFile(file, hasKey);
      setSource({ kind: 'upload', name: file.name, data: r.data });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  };

  const openInBuilder = () => {
    if (source?.kind !== 'upload') return navigate('/builder', { tab: 'ats' });
    const name = source.data.personal.fullName ? `${source.data.personal.fullName}'s Resume` : 'Imported Resume';
    useResumeStore.getState().createDoc({ data: source.data, name, templateId: 'harvard' });
    navigate('/builder', { tab: 'ats' });
  };

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={() => navigate('/')} />
        <span className="spacer" />
        <button className="icon-btn" onClick={() => useUi.getState().setAiSettingsOpen(true)} title="AI settings" aria-label="AI settings" style={hasKey ? { color: 'var(--brand)' } : undefined}>
          <Sparkles size={18} />
        </button>
        <button className="btn btn-dark btn-sm" onClick={() => navigate('/builder')}>
          Open builder <ArrowRight size={14} />
        </button>
      </header>
      <div className="ats-page">
        <div className="page-title">
          <h1>
            Free <span className="grad-text">ATS score</span> checker
          </h1>
          <p>Upload your resume, paste a job description, and get an instant, explainable score with fixes. Nothing leaves your browser.</p>
        </div>
        <div className="ats-layout">
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="group">
              <h4>1 · Your resume</h4>
              <FileDrop onFile={onFile} busy={busy} label={source?.kind === 'upload' ? `Loaded: ${source.name} — drop another` : 'Drop your resume here'} />
              {docs.length > 0 && (
                <>
                  <p className="field-hint" style={{ textAlign: 'center' }}>or check a resume you built here</p>
                  <div className="chips" style={{ justifyContent: 'center' }}>
                    {docs.map((d) => (
                      <button
                        key={d.id}
                        className="chip-btn"
                        style={source?.kind === 'saved' && source.id === d.id ? { borderColor: 'var(--brand)', color: 'var(--brand-700)' } : undefined}
                        onClick={() => setSource({ kind: 'saved', id: d.id })}
                      >
                        <FileText size={13} /> {d.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="group">
              <h4>2 · Job description</h4>
              <TextArea
                label="Paste the job post (recommended)"
                rows={10}
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description to measure keyword match…"
              />
            </div>
          </div>

          <div style={{ display: 'grid', gap: 12 }}>
            {report && resolved ? (
              <>
                <AtsReportView key={resolved.name} report={report} />
                <AiReviewCard resumeText={resumeToPlainText(resolved.data, resolved.layout)} jobDescription={jd} />
                <button className="btn btn-primary btn-lg" onClick={openInBuilder}>
                  <RefreshCw size={16} /> Fix it in the builder
                </button>
              </>
            ) : (
              <div className="group empty">
                <span className="feature-icon">
                  <Gauge size={22} />
                </span>
                <strong style={{ color: 'var(--ink)' }}>Your report will appear here</strong>
                <span>We check 25+ signals real ATS and recruiters use: parsing, structure, impact, keywords and length.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
