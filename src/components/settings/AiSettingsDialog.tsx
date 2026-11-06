import { useEffect, useState } from 'react';
import { ExternalLink, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { DEFAULT_GEMINI_MODEL, useSettings } from '../../store/useSettings';
import { useUi } from '../../store/useUi';
import { AiError, listGeminiModels } from '../../lib/ai/gemini';
import { Modal, TextField, toast } from '../ui/primitives';

export const AiSettingsDialog = () => {
  const open = useUi((s) => s.aiSettingsOpen);
  const setOpen = useUi((s) => s.setAiSettingsOpen);
  const { geminiKey, geminiModel, setGeminiKey, setGeminiModel } = useSettings();
  const [key, setKey] = useState(geminiKey);
  const [model, setModel] = useState(geminiModel);
  const [models, setModels] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(geminiKey);
      setModel(geminiModel);
    }
  }, [open, geminiKey, geminiModel]);

  const test = async () => {
    if (!key.trim()) return toast.info('Paste your key first.');
    setTesting(true);
    try {
      const list = await listGeminiModels(key.trim());
      setModels(list);
      if (list.length && !list.includes(model)) setModel(list.find((m) => /flash/.test(m) && !/lite|preview|exp/.test(m)) ?? list[0]);
      toast.success(`Connected — ${list.length} models available.`);
    } catch (err) {
      toast.error(err instanceof AiError ? err.message : 'Could not reach Gemini. Check your connection.');
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    setGeminiKey(key);
    setGeminiModel(model);
    setOpen(false);
    toast.success(key ? 'AI features enabled.' : 'AI disabled.');
  };

  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      title="AI assistant (optional)"
      subtitle="Powered by Google Gemini's free tier. Everything else works fully offline."
      footer={
        <>
          {geminiKey && (
            <button className="btn btn-ghost" onClick={() => (setGeminiKey(''), setKey(''), toast.info('Key removed.'))}>
              Remove key
            </button>
          )}
          <button className="btn btn-primary" onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 16 }}>
        <ol style={{ margin: 0, paddingLeft: 18, color: 'var(--ink-2)', display: 'grid', gap: 4 }}>
          <li>
            Open{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer noopener" style={{ color: 'var(--brand-700)', fontWeight: 600 }}>
              Google AI Studio <ExternalLink size={12} style={{ verticalAlign: -1 }} />
            </a>{' '}
            and sign in with any Google account.
          </li>
          <li>Click <b>Create API key</b> — no credit card needed for the free tier.</li>
          <li>Paste it below and press <b>Test connection</b>.</li>
        </ol>
        <TextField
          label="Gemini API key"
          type="password"
          autoComplete="off"
          placeholder="AIza…"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <label className="field">
            <span className="field-label">Model</span>
            {models.length ? (
              <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
                {models.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            ) : (
              <input className="input" value={model} onChange={(e) => setModel(e.target.value)} placeholder={DEFAULT_GEMINI_MODEL} />
            )}
          </label>
          <button className="btn btn-outline" onClick={test} disabled={testing}>
            {testing ? <Loader2 size={15} className="spin" /> : <KeyRound size={15} />} Test connection
          </button>
        </div>
        <div className="note" style={{ display: 'flex', gap: 10 }}>
          <ShieldCheck size={18} style={{ flex: 'none' }} />
          <span>
            Your key is stored only in this browser and sent directly to Google. Note: on Google's free tier, prompts may be used to improve their
            products — avoid AI features if your resume contains sensitive data.
          </span>
        </div>
      </div>
    </Modal>
  );
};
