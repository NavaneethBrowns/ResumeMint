import { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileUp, KeyRound, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { useSettings } from '../../store/useSettings';
import { useUi } from '../../store/useUi';
import { compactDesignFor, type ImportStage } from '../../lib/ai/resumeIntel';
import { ACCEPTED_RESUME_TYPES } from '../../lib/parser/extractText';
import { importResumeFile, type ImportResult } from '../../lib/parser/importResume';
import { Modal, Toggle, toast } from '../ui/primitives';

export const FileDrop = ({
  onFile,
  busy,
  label = 'Drop your resume here',
  busyLabel = 'Reading your resume…',
  hint = 'PDF, DOCX, TXT or a Resumint .json backup · up to 10 MB · processed in your browser',
}: {
  onFile: (f: File) => void;
  busy?: boolean;
  label?: string;
  busyLabel?: string;
  hint?: string;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => (e.preventDefault(), setDrag(true))}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const f = e.dataTransfer.files?.[0];
        if (f && !busy) onFile(f);
      }}
    >
      <span className="dz-icon">{busy ? <Loader2 size={24} className="spin" /> : <FileUp size={24} />}</span>
      <strong>{busy ? busyLabel : label}</strong>
      <small>{hint}</small>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={ACCEPTED_RESUME_TYPES}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
    </div>
  );
};

const summarise = (r: ImportResult) => [
  { label: 'Experience', n: r.data.experience.length },
  { label: 'Education', n: r.data.education.length },
  { label: 'Skills', n: r.data.skills.reduce((s, g) => s + g.skills.split(',').filter(Boolean).length, 0) },
  { label: 'Projects', n: r.data.projects.length },
  { label: 'Certifications', n: r.data.certifications.length },
  { label: 'Other', n: r.data.awards.length + r.data.languages.length + r.data.interests.length + r.data.volunteer.length },
];

const STAGE_LABEL: Record<ImportStage | 'reading', string> = {
  reading: 'Reading your resume…',
  analysing: 'Reading the room — profiling your career…',
  tightening: 'Condensing to fit your page budget…',
};

const SENIORITY_LABEL: Record<string, string> = {
  student: 'Student', entry: 'Entry level', mid: 'Mid level', senior: 'Senior', lead: 'Lead', executive: 'Executive',
};

const methodText = (r: ImportResult) => {
  if (r.method === 'json') return 'Restored from backup exactly.';
  if (r.method === 'heuristic') return 'Parsed with the offline smart parser — double-check dates and titles.';
  return r.insight?.via === 'own-key' ? 'Analysed with AI using your Gemini key.' : 'Analysed with Resumint AI.';
};

const Insight = ({ r }: { r: ImportResult }) => {
  const i = r.insight;
  if (!i) return null;
  const p = i.profile;
  const facts = [
    p.domain && `${p.domain}${p.industry ? ` · ${p.industry}` : ''}`,
    `${SENIORITY_LABEL[p.seniority]}${p.yearsExperience ? ` · ${p.yearsExperience} yrs` : ''}`,
    `${p.pageTarget}-page target · ${i.estimatedPages <= p.pageTarget ? 'fits' : `~${i.estimatedPages} pages`}`,
  ].filter(Boolean);
  return (
    <div className="ai-insight">
      <div className="ai-insight-head">
        <Sparkles size={16} />
        <strong>{p.primaryRole || 'Career profile'}</strong>
      </div>
      <div className="ai-insight-tags">
        {facts.map((f) => (
          <span key={f as string}>{f}</span>
        ))}
      </div>
      {p.trajectory && <p className="ai-insight-line">{p.trajectory}</p>}
      {p.rationale && <p className="ai-insight-muted">{p.rationale}</p>}
      {i.notes.length > 0 && (
        <ul className="ai-insight-notes">
          {i.notes.map((n) => (
            <li key={n}>
              <Wand2 size={13} /> {n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const ImportDialog = () => {
  const open = useUi((s) => s.importOpen);
  const setOpen = useUi((s) => s.setImportOpen);
  const hasKey = useSettings((s) => Boolean(s.geminiKey));
  const [useAi, setUseAi] = useState(true);
  const [optimise, setOptimise] = useState(true);
  const [stage, setStage] = useState<ImportStage | 'reading' | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'new' | 'replace'>('new');

  const close = () => {
    setOpen(false);
    setResult(null);
  };

  const onFile = async (file: File) => {
    setStage('reading');
    try {
      setResult(await importResumeFile(file, { ai: useAi, optimise, onStage: setStage }));
    } catch (err) {
      console.error('[import]', err);
      toast.error(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setStage(null);
    }
  };

  const apply = () => {
    if (!result) return;
    const store = useResumeStore.getState();
    const name = result.data.personal.fullName ? `${result.data.personal.fullName}'s Resume` : 'Imported Resume';
    if (mode === 'new') store.createDoc({ data: result.data, name, templateId: result.design?.templateId });
    else store.updateData(() => result.data);
    if (result.layout) store.updateLayout(() => result.layout!);
    if (result.design) store.updateDesign(result.design);
    const insight = result.insight;
    if (insight) {
      store.updateLayout((l) => ({ ...l, order: insight.order }));
      const compact = compactDesignFor(insight.estimatedPages, insight.profile.pageTarget);
      if (compact) store.updateDesign(compact);
    }
    toast.success('Resume imported — review each section and pick a template.');
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Import an existing resume"
      subtitle="We'll extract your details and arrange them into any template."
      width={600}
      footer={
        result && (
          <>
            <button className="btn btn-ghost" onClick={() => setResult(null)}>
              Choose another file
            </button>
            <button className="btn btn-primary" onClick={apply}>
              <CheckCircle2 size={16} /> Use this content
            </button>
          </>
        )
      }
    >
      {!result ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <FileDrop
            onFile={onFile}
            busy={stage !== null}
            busyLabel={stage ? STAGE_LABEL[stage] : undefined}
            hint={
              useAi
                ? 'PDF, DOCX, TXT or a Resumint .json backup · up to 10 MB · text is analysed by Google Gemini'
                : 'PDF, DOCX, TXT or a Resumint .json backup · up to 10 MB · processed in your browser'
            }
          />
          <div className="note" style={{ display: 'grid', gap: 10 }}>
            <div className="import-option">
              <span>
                <Sparkles size={16} />
                <span>
                  <b>Smart AI import</b>
                  <small>Profiles your domain, seniority and career path, then arranges sections the way recruiters read them.</small>
                </span>
              </span>
              <Toggle label="" checked={useAi} onChange={setUseAi} />
            </div>
            {useAi && (
              <div className="import-option">
                <span>
                  <Wand2 size={16} />
                  <span>
                    <b>Recruiter-ready rewrite</b>
                    <small>Concise, impact-first bullets on one page — two pages only when your experience warrants it. Turn off to keep your exact wording.</small>
                  </span>
                </span>
                <Toggle label="" checked={optimise} onChange={setOptimise} />
              </div>
            )}
            {useAi && (
              <button className="chip-btn ai" style={{ justifySelf: 'start' }} onClick={() => useUi.getState().setAiSettingsOpen(true)}>
                <KeyRound size={13} /> {hasKey ? 'Using your Gemini key' : 'Use my own Gemini key (optional)'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="score-hero" style={{ padding: 14 }}>
            <CheckCircle2 size={36} color="#10b981" />
            <div>
              <h3 style={{ fontSize: 17 }}>{result.data.personal.fullName || 'Resume parsed'}</h3>
              <p>{methodText(result)}</p>
            </div>
          </div>
          {result.aiError && (
            <div className="note warn" style={{ display: 'flex', gap: 8 }}>
              <AlertTriangle size={16} style={{ flex: 'none' }} />
              <span>AI was unavailable ({result.aiError}) — used the offline parser instead.</span>
            </div>
          )}
          <Insight r={result} />
          {result.insight?.warnings.map((w) => (
            <div key={w} className="note warn" style={{ display: 'flex', gap: 8 }}>
              <AlertTriangle size={16} style={{ flex: 'none' }} />
              <span>{w}</span>
            </div>
          ))}
          <div className="parsed-summary">
            {summarise(result).map((s) => (
              <div key={s.label} className="stat-box">
                <strong>{s.n}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
          <label className={`option-card${mode === 'new' ? ' active' : ''}`}>
            <input type="radio" name="mode" checked={mode === 'new'} onChange={() => setMode('new')} />
            <div>
              <strong>Create a new resume</strong>
              <small>Keeps your current resume untouched.</small>
            </div>
          </label>
          <label className={`option-card${mode === 'replace' ? ' active' : ''}`}>
            <input type="radio" name="mode" checked={mode === 'replace'} onChange={() => setMode('replace')} />
            <div>
              <strong>Replace current content</strong>
              <small>Keeps your chosen template & design. Undo is available.</small>
            </div>
          </label>
        </div>
      )}
    </Modal>
  );
};
