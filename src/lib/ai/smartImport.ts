import { useSettings } from '../../store/useSettings';
import { AiError, generateWithKey } from './gemini';
import { parseJsonText } from './geminiApi';
import { buildTaskPrompt, runSmartImport, SYSTEM_PROMPT, type AiTask, type SmartImport, type SmartImportOptions } from './resumeIntel';

export type AiVia = 'own-key' | 'server';

interface Transport {
  via: AiVia;
  run: (task: AiTask) => Promise<unknown>;
}

const BRIDGE_URL = '/api/ai/resume';

const serverTransport: Transport = {
  via: 'server',
  run: async (task) => {
    let res: Response;
    try {
      res = await fetch(BRIDGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(task),
        signal: AbortSignal.timeout(35_000),
      });
    } catch {
      throw new AiError('Could not reach the Resumint AI service.');
    }
    const body = (await res.json().catch(() => null)) as { result?: unknown; error?: string } | null;
    if (!res.ok || !body || !('result' in body)) throw new AiError(body?.error ?? `The Resumint AI service is unavailable (${res.status}).`);
    return body.result;
  },
};

const ownKeyTransport = (key: string, model: string): Transport => ({
  via: 'own-key',
  run: async (task) => parseJsonText(await generateWithKey(key, model, buildTaskPrompt(task), true, SYSTEM_PROMPT)),
});

/**
 * Smart import via the user's own Gemini key when connected, otherwise (or if it fails) the site's AI bridge.
 * Whichever transport succeeds first is reused for the follow-up tightening pass.
 */
export const smartImport = async (text: string, opts: SmartImportOptions): Promise<SmartImport & { via: AiVia }> => {
  const { geminiKey, geminiModel } = useSettings.getState();
  const transports = geminiKey ? [ownKeyTransport(geminiKey, geminiModel), serverTransport] : [serverTransport];
  let active: Transport | undefined;
  const errors: string[] = [];

  const call = async (task: AiTask) => {
    const ordered = active ? [active, ...transports.filter((t) => t !== active)] : transports;
    for (const t of ordered) {
      try {
        const result = await t.run(task);
        active = t;
        return result;
      } catch (err) {
        console.warn(`[smart-import] ${t.via} failed`, err);
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    throw new AiError(errors.at(-1) ?? 'AI is unavailable.');
  };

  const result = await runSmartImport(text, call, opts);
  return { ...result, via: active?.via ?? 'server' };
};
