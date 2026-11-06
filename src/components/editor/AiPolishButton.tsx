import { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { AiError, aiImproveText, type ImproveKind } from '../../lib/ai/gemini';
import { useSettings } from '../../store/useSettings';
import { useUi } from '../../store/useUi';
import { toast } from '../ui/primitives';

/** "Polish with AI" button. Opens AI settings when no key is configured. */
export const AiPolishButton = ({
  text, kind, context, onResult,
}: { text: string; kind: ImproveKind; context?: string; onResult: (text: string) => void }) => {
  const [busy, setBusy] = useState(false);
  const hasKey = useSettings((s) => Boolean(s.geminiKey));
  const openSettings = useUi((s) => s.setAiSettingsOpen);

  const run = async () => {
    if (!hasKey) return openSettings(true);
    if (!text.trim()) return toast.info('Write a draft first — AI will polish it.');
    setBusy(true);
    try {
      onResult(await aiImproveText(text, kind, context));
      toast.success('Polished with AI. Undo with Ctrl+Z if you prefer the original.');
    } catch (err) {
      toast.error(err instanceof AiError ? err.message : 'AI request failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" className="chip-btn ai" onClick={run} disabled={busy} title="Rewrite with Gemini">
      {busy ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
      {busy ? 'Polishing…' : 'AI polish'}
    </button>
  );
};
