import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Briefcase, CheckCircle2, KeyRound, Loader2, Sparkles, Target, Wand2 } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { useSettings } from '../../store/useSettings';
import { useUi } from '../../store/useUi';
import { createAiCaller, type AiVia } from '../../lib/ai/aiClient';
import { compactDesignFor } from '../../lib/ai/resumeIntel';
import { MAX_JD_CHARS, MIN_JD_CHARS, runTailor, type JobTarget, type TailorResult } from '../../lib/ai/tailor';
import { containsTerm } from '../../lib/ats/keywords';
import { Modal, TextArea, TextField, Toggle, toast } from '../ui/primitives';

type Outcome = TailorResult & { via?: AiVia };

const methodText = (r: Outcome) => {
  if (r.method === 'offline') return "Reordered offline by relevance to the job — turn on AI to also reword in the job's language.";
  return r.via === 'own-key' ? 'Tailored with AI using your own Gemini key.' : 'Tailored with Resumint AI.';
};

const bulletCount = (r: Outcome) =>
  r.data.experience.reduce((n, e) => n + e.description.split('\n').filter((l) => l.trim()).length, 0);

export const TailorDialog = ({ jd: currentJd }: { jd: string }) => {
  const open = useUi((s) => s.tailorOpen);
  const setOpen = useUi((s) => s.setTailorOpen);
  const docs = useResumeStore((s) => s.docs);
  const activeId = useResumeStore((s) => s.activeId);
  const hasKey = useSettings((s) => Boolean(s.geminiKey));

  const [sourceId, setSourceId] = useState(activeId);
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [jd, setJd] = useState('');
  const [useAi, setUseAi] = useState(true);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);
  const [job, setJob] = useState<JobTarget | null>(null);

  // On open, start from the full/original resume (not a previous tailored copy) and prefill the JD.
  useEffect(() => {
    if (!open) return;
    const active = docs.find((d) => d.id === activeId);
    const baseId = active?.target?.baseId;
    setSourceId(baseId && docs.some((d) => d.id === baseId) ? baseId : activeId);
    setJd((prev) => prev || currentJd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const source = docs.find((d) => d.id === sourceId) ?? docs[0];
  const jdLength = jd.trim().length;
  const canRun = position.trim().length >= 2 && jdLength >= MIN_JD_CHARS && jdLength <= MAX_JD_CHARS && !busy;

  const close = () => {
    if (busy) return;
    setOpen(false);
    setResult(null);
  };

  const run = async () => {
    const target: JobTarget = { company: company.trim(), position: position.trim(), jd: jd.trim() };
    setBusy(true);
    try {
      const ai = useAi ? createAiCaller() : null;
      const r = await runTailor(source.data, target, ai ? ai.call : null);
      setJob(target);
      setResult({ ...r, via: r.method === 'ai' ? ai?.via() : undefined });
    } catch (err) {
      console.error('[tailor]', err);
      toast.error(err instanceof Error ? err.message : 'Tailoring failed.');
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result || !job) return;
    const store = useResumeStore.getState();
    const name = `${job.position}${job.company ? ` — ${job.company}` : ''}`.slice(0, 80);
    const compact = compactDesignFor(result.estimatedPages, result.pages);
    const id = store.createDoc({
      data: result.data,
      name,
      layout: { ...source.layout, order: result.order ?? source.layout.order },
      design: { ...source.design, ...compact },
      target: { company: job.company, position: job.position, baseId: source.target?.baseId ?? source.id, createdAt: Date.now() },
    });
    // The new copy's ATS tab scores against this job right away.
    localStorage.setItem(`resumint:jd:${id}`, job.jd);
    toast.success(`Created “${name}”. Your original resume is untouched.`);
    setOpen(false);
    setResult(null);
    setCompany('');
    setPosition('');
    setJd('');
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Tailor to a job"
      subtitle="Paste a job post — we'll make a copy of your resume focused on that role. Your original stays as it is."
      width={640}
      footer={
        result ? (
          <>
            <button className="btn btn-ghost" onClick={() => setResult(null)}>
              Back
            </button>
            <button className="btn btn-primary" onClick={apply}>
              <CheckCircle2 size={16} /> Create tailored copy
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={close} disabled={busy}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={run} disabled={!canRun}>
              {busy ? <Loader2 size={16} className="spin" /> : <Target size={16} />} {busy ? 'Tailoring…' : 'Tailor resume'}
            </button>
          </>
        )
      }
    >
      {!result ? (
        <div style={{ display: 'grid', gap: 14 }}>
          <label className="field">
            <span className="field-label">Start from</span>
            <select className="input" value={source.id} onChange={(e) => setSourceId(e.target.value)} disabled={busy}>
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {d.target ? ' · tailored' : ''}
                </option>
              ))}
            </select>
            <span className="field-hint">Tailor from your full, original resume — each job gets its own copy.</span>
          </label>
          <div className="grid-2">
            <TextField label="Position" placeholder="e.g. Senior Data Analyst" value={position} maxLength={120} onChange={(e) => setPosition(e.target.value)} disabled={busy} />
            <TextField label="Company (optional)" placeholder="e.g. Swiggy" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} disabled={busy} />
          </div>
          <TextArea
            label="Job description"
            rows={8}
            placeholder="Paste the full job post: responsibilities, requirements, nice-to-haves…"
            value={jd}
            maxLength={MAX_JD_CHARS}
            onChange={(e) => setJd(e.target.value)}
            disabled={busy}
            hint={
              jdLength > 0 && jdLength < MIN_JD_CHARS
                ? 'Paste a bit more of the job post so we can match it well.'
                : `${jdLength.toLocaleString()} / ${MAX_JD_CHARS.toLocaleString()} characters`
            }
          />
          <div className="note" style={{ display: 'grid', gap: 10 }}>
            <div className="import-option">
              <span>
                <Sparkles size={16} />
                <span>
                  <b>Rewrite with AI</b>
                  <small>Reorders and rewords your bullets, summary and skills in the job's language — using only facts already in your resume. Off: offline relevance reordering.</small>
                </span>
              </span>
              <Toggle label="" checked={useAi} onChange={setUseAi} />
            </div>
            {useAi && (
              <button className="chip-btn ai" style={{ justifySelf: 'start' }} onClick={() => useUi.getState().setAiSettingsOpen(true)}>
                <KeyRound size={13} /> {hasKey ? 'Using your Gemini key' : 'Use my own Gemini key (optional)'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <TailorReport r={result} job={job!} bullets={bulletCount(result)} />
      )}
    </Modal>
  );
};

const TailorReport = ({ r, job, bullets }: { r: Outcome; job: JobTarget; bullets: number }) => {
  const text = useMemo(() => JSON.stringify(r.data).toLowerCase(), [r.data]);
  const tags = [
    r.job?.family,
    r.job?.seniority && `${r.job.seniority} level`,
    `${r.pages}-page target · ~${r.estimatedPages} pages`,
  ].filter(Boolean) as string[];

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      <div className="score-hero" style={{ padding: 14 }}>
        <Briefcase size={32} color="var(--brand)" />
        <div>
          <h3 style={{ fontSize: 17 }}>
            {job.position}
            {job.company ? ` at ${job.company}` : ''}
          </h3>
          <p>{methodText(r)}</p>
        </div>
      </div>

      {r.aiError && (
        <div className="note warn" style={{ display: 'flex', gap: 8 }}>
          <AlertTriangle size={16} style={{ flex: 'none' }} />
          <span>AI was unavailable ({r.aiError}) — used offline relevance reordering instead.</span>
        </div>
      )}

      <div className="parsed-summary">
        <div className="stat-box">
          <strong className="tailor-delta">
            {r.coverage.glanceBefore} <ArrowRight size={14} /> {r.coverage.glanceAfter}
          </strong>
          <span>job keywords at first glance</span>
        </div>
        <div className="stat-box">
          <strong>
            {r.coverage.matched}/{r.coverage.total}
          </strong>
          <span>job keywords in resume</span>
        </div>
        <div className="stat-box">
          <strong>{bullets}</strong>
          <span>bullets kept</span>
        </div>
      </div>

      <div className="ai-insight">
        <div className="ai-insight-head">
          <Target size={16} />
          <strong>{r.data.personal.title || job.position}</strong>
        </div>
        <div className="ai-insight-tags">
          {tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {r.job && r.job.mustHave.length > 0 && (
          <>
            <p className="ai-insight-muted">What this job needs most</p>
            <div className="chips">
              {r.job.mustHave.map((k) => (
                <span key={k} className={`chip${containsTerm(text, k.toLowerCase()) ? '' : ' neutral'}`}>
                  {k}
                </span>
              ))}
            </div>
          </>
        )}
        {r.strengths.length > 0 && (
          <ul className="ai-insight-notes">
            {r.strengths.map((s) => (
              <li key={s}>
                <CheckCircle2 size={13} /> {s}
              </li>
            ))}
          </ul>
        )}
        {r.notes.length > 0 && (
          <ul className="ai-insight-notes">
            {r.notes.map((n) => (
              <li key={n}>
                <Wand2 size={13} /> {n}
              </li>
            ))}
          </ul>
        )}
      </div>

      {r.warnings.map((w) => (
        <div key={w} className="note warn" style={{ display: 'flex', gap: 8 }}>
          <AlertTriangle size={16} style={{ flex: 'none' }} />
          <span>{w}</span>
        </div>
      ))}

      {r.gaps.length > 0 && (
        <div>
          <p className="field-hint" style={{ marginBottom: 6 }}>
            The job asks for these but your resume doesn't show them. Add them yourself <b>only if you truly have the experience</b>:
          </p>
          <div className="chips">
            {r.gaps.map((g) => (
              <span key={g} className="chip miss">
                {g}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
