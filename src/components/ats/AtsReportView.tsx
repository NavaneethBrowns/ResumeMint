import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Loader2, Sparkles, XCircle } from 'lucide-react';
import type { AtsReport, CheckStatus } from '../../lib/ats/score';
import { AiError, aiReviewResume, type AiReview } from '../../lib/ai/gemini';
import { useSettings } from '../../store/useSettings';
import { useUi } from '../../store/useUi';
import { toast } from '../ui/primitives';

export const scoreColor = (score: number): string => (score >= 80 ? '#10b981' : score >= 60 ? '#0ea5e9' : score >= 45 ? '#f59e0b' : '#e11d48');

export const ScoreRing = ({ score, size = 96, stroke = 9 }: { score: number; size?: number; stroke?: number }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <svg className="ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`ATS score ${score} of 100`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e4ece9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fontSize={size * 0.3} fill="#0b1f1c">
        {score}
      </text>
    </svg>
  );
};

const STATUS_ICON: Record<CheckStatus, typeof CheckCircle2> = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle };

export const AtsReportView = ({ report }: { report: AtsReport }) => {
  const [open, setOpen] = useState<string | null>(report.categories.find((c) => c.score < 100)?.id ?? null);
  const { stats, keywords } = report;
  return (
    <>
      <div className="score-hero">
        <ScoreRing score={report.score} />
        <div>
          <h3>{report.grade}</h3>
          <p>
            {report.score >= 80
              ? 'Your resume should parse cleanly and rank well.'
              : 'Fix the highlighted items below to climb above 80 — the zone where most ATS shortlist.'}
          </p>
        </div>
      </div>

      <div className="stat-grid">
        <div className="stat-box"><strong>{stats.words}</strong><span>words</span></div>
        <div className="stat-box"><strong>{stats.bullets}</strong><span>bullets</span></div>
        <div className="stat-box"><strong>{stats.quantified}</strong><span>with numbers</span></div>
        <div className="stat-box"><strong>{stats.actionLed}</strong><span>action-led</span></div>
      </div>

      {report.categories.map((cat) => {
        const isOpen = open === cat.id;
        const issues = cat.checks.filter((c) => c.status !== 'pass').length;
        return (
          <div key={cat.id} className="cat">
            <div className="cat-head" onClick={() => setOpen(isOpen ? null : cat.id)}>
              <div>
                <strong>{cat.label}</strong>
                <div className="field-hint">{issues ? `${issues} to improve` : 'All good'}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <strong style={{ color: scoreColor(cat.score) }}>{cat.score}%</strong>
                <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : undefined, transition: 'transform .3s' }} />
              </div>
            </div>
            <div className="bar">
              <i style={{ width: `${cat.score}%`, background: scoreColor(cat.score) }} />
            </div>
            {isOpen && (
              <div className="checks">
                {cat.checks.map((ch) => {
                  const Icon = STATUS_ICON[ch.status];
                  return (
                    <div key={ch.id} className="check">
                      <Icon size={18} className={`ic-${ch.status}`} />
                      <div>
                        <strong>{ch.label}</strong>
                        <span>{ch.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {keywords.fromJob ? (
        <div className="group">
          <h4>Keyword match · {Math.round(keywords.coverage * 100)}%</h4>
          {keywords.matched.length > 0 && (
            <div className="chips">
              {keywords.matched.map((k) => <span key={k} className="chip">{k}</span>)}
            </div>
          )}
          {keywords.missing.length > 0 && (
            <>
              <p className="field-hint">Missing from your resume:</p>
              <div className="chips">
                {keywords.missing.map((k) => <span key={k} className="chip miss">{k}</span>)}
              </div>
            </>
          )}
        </div>
      ) : (
        keywords.matched.length > 0 && (
          <div className="group">
            <h4>Recognised keywords</h4>
            <div className="chips">
              {keywords.matched.map((k) => <span key={k} className="chip neutral">{k}</span>)}
            </div>
          </div>
        )
      )}
    </>
  );
};

/** Optional Gemini-powered recruiter review. */
export const AiReviewCard = ({
  resumeText, jobDescription, onApplySummary,
}: { resumeText: string; jobDescription?: string; onApplySummary?: (summary: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<AiReview | null>(null);
  const hasKey = useSettings((s) => Boolean(s.geminiKey));
  const openSettings = useUi((s) => s.setAiSettingsOpen);

  const run = async () => {
    if (!hasKey) return openSettings(true);
    setBusy(true);
    try {
      setReview(await aiReviewResume(resumeText, jobDescription));
    } catch (err) {
      toast.error(err instanceof AiError ? err.message : 'AI review failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ai-card">
      <h4>
        <Sparkles size={16} color="#10b981" /> AI recruiter review
      </h4>
      {!review && (
        <>
          <p className="field-hint" style={{ margin: '6px 0 12px' }}>
            Get a second opinion from Gemini: strengths, concrete edits, missing keywords and a rewritten summary.
          </p>
          <button className="btn btn-primary btn-sm" onClick={run} disabled={busy}>
            {busy ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
            {busy ? 'Reviewing…' : hasKey ? 'Run AI review' : 'Connect free Gemini key'}
          </button>
        </>
      )}
      {review && (
        <>
          <p style={{ marginTop: 8 }}>{review.verdict}</p>
          {review.strengths.length > 0 && (<><div className="label">Strengths</div><ul>{review.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
          {review.improvements.length > 0 && (<><div className="label">Improve</div><ul>{review.improvements.map((s, i) => <li key={i}>{s}</li>)}</ul></>)}
          {review.missingKeywords.length > 0 && (
            <>
              <div className="label">Keywords to consider</div>
              <div className="chips" style={{ marginTop: 6 }}>{review.missingKeywords.map((k) => <span key={k} className="chip miss">{k}</span>)}</div>
            </>
          )}
          {review.rewrittenSummary && (
            <>
              <div className="label">Suggested summary</div>
              <p style={{ marginTop: 4, color: 'var(--ink-2)' }}>{review.rewrittenSummary}</p>
              {onApplySummary && (
                <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => (onApplySummary(review.rewrittenSummary), toast.success('Summary updated.'))}>
                  Use this summary
                </button>
              )}
            </>
          )}
          <div style={{ marginTop: 12 }}>
            <button className="chip-btn" onClick={run} disabled={busy}>
              {busy ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />} Re-run
            </button>
          </div>
        </>
      )}
    </div>
  );
};
