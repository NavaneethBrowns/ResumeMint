import { useSettings } from '../../store/useSettings';
import { AiError, describeHttpError } from './gemini';
import { callGemini, GeminiError, parseJsonText } from './geminiApi';
import { buildAnyPrompt, systemFor, temperatureFor, type AnyAiTask } from './tasks';

export type AiVia = 'own-key' | 'server';

interface Transport {
  via: AiVia;
  run: (task: AnyAiTask) => Promise<unknown>;
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
  run: async (task) => {
    try {
      const text = await callGemini({ key, model, prompt: buildAnyPrompt(task), system: systemFor(task), json: true, temperature: temperatureFor(task) });
      return parseJsonText(text);
    } catch (err) {
      if (!(err instanceof GeminiError)) throw new AiError('Could not reach Gemini. Check your internet connection or proxy.');
      throw new AiError(err.status ? describeHttpError(err.status, err.body) : err.message);
    }
  },
});

/**
 * Calls the user's own Gemini key when connected, otherwise (or if it fails) the site's AI bridge.
 * Whichever transport succeeds first is reused for follow-up calls in the same run.
 */
export const createAiCaller = () => {
  const { geminiKey, geminiModel } = useSettings.getState();
  const transports = geminiKey ? [ownKeyTransport(geminiKey, geminiModel), serverTransport] : [serverTransport];
  let active: Transport | undefined;

  const call = async (task: AnyAiTask): Promise<unknown> => {
    const ordered = active ? [active, ...transports.filter((t) => t !== active)] : transports;
    const errors: string[] = [];
    for (const t of ordered) {
      try {
        const result = await t.run(task);
        active = t;
        return result;
      } catch (err) {
        console.warn(`[ai] ${task.kind} via ${t.via} failed`, err);
        errors.push(err instanceof Error ? err.message : String(err));
      }
    }
    throw new AiError(errors.at(-1) ?? 'AI is unavailable.');
  };

  return { call, via: (): AiVia => active?.via ?? 'server' };
};
