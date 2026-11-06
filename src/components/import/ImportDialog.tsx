import { useRef, useState } from 'react';
import { CheckCircle2, FileUp, Loader2, Sparkles } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { useSettings } from '../../store/useSettings';
import { useUi } from '../../store/useUi';
import { ACCEPTED_RESUME_TYPES } from '../../lib/parser/extractText';
import { importResumeFile, type ImportResult } from '../../lib/parser/importResume';
import { Modal, Toggle, toast } from '../ui/primitives';

export const FileDrop = ({ onFile, busy, label = 'Drop your resume here' }: { onFile: (f: File) => void; busy?: boolean; label?: string }) => {
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
      <strong>{busy ? 'Reading your resume…' : label}</strong>
      <small>PDF, DOCX, TXT or a Resumint .json backup · up to 10 MB · processed in your browser</small>
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

export const ImportDialog = () => {
  const open = useUi((s) => s.importOpen);
  const setOpen = useUi((s) => s.setImportOpen);
  const hasKey = useSettings((s) => Boolean(s.geminiKey));
  const [useAi, setUseAi] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mode, setMode] = useState<'new' | 'replace'>('new');

  const close = () => {
    setOpen(false);
    setResult(null);
  };

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      setResult(await importResumeFile(file, useAi && hasKey));
    } catch (err) {
      console.error('[import]', err);
      toast.error(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setBusy(false);
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
          <FileDrop onFile={onFile} busy={busy} />
          <div className="note" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              <Sparkles size={16} />
              {hasKey ? 'AI parsing (Gemini) gives the most accurate result.' : 'Smart offline parser enabled. Add a free Gemini key for AI-grade accuracy.'}
            </span>
            {hasKey ? (
              <Toggle label="" checked={useAi} onChange={setUseAi} />
            ) : (
              <button className="chip-btn ai" onClick={() => useUi.getState().setAiSettingsOpen(true)}>
                Connect
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
              <p>
                {result.method === 'json' ? 'Restored from backup exactly.' : result.method === 'ai' ? 'Parsed with Gemini AI.' : 'Parsed with the offline smart parser — double-check dates and titles.'}
              </p>
            </div>
          </div>
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
