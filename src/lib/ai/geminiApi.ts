/** Minimal Gemini REST client shared by the browser (user's own key) and the Netlify AI bridge (server key). */
const API = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly body = '',
  ) {
    super(message);
    this.name = 'GeminiError';
  }
}

export interface GeminiRequest {
  key: string;
  model: string;
  prompt: string;
  system?: string;
  json?: boolean;
  temperature?: number;
  timeoutMs?: number;
}

// Gemini 2.5 models think by default; a bounded budget keeps latency inside serverless limits.
const thinkingFor = (model: string) => (/^gemini-2\.5-(flash|pro)/.test(model) ? { thinkingConfig: { thinkingBudget: 1024 } } : {});

export const callGemini = async ({ key, model, prompt, system, json = false, temperature = 0.3, timeoutMs = 60_000 }: GeminiRequest): Promise<string> => {
  let res: Response;
  try {
    res = await fetch(`${API}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(timeoutMs),
      body: JSON.stringify({
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature, ...(json ? { responseMimeType: 'application/json' } : {}), ...thinkingFor(model) },
      }),
    });
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'TimeoutError';
    throw new GeminiError(timedOut ? 'Gemini took too long to respond.' : 'Could not reach Gemini.', timedOut ? 504 : undefined);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new GeminiError(`Gemini request failed (${res.status}).`, res.status, body);
  }
  const payload = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = payload.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new GeminiError('Gemini returned an empty response (it may have been blocked by safety filters).');
  return text.trim();
};

/** Lists Gemini models the key can use for text generation (newest-capable first is the caller's job via pickBestModel). */
export const listModels = async (key: string, timeoutMs = 15_000): Promise<string[]> => {
  let res: Response;
  try {
    res = await fetch(`${API}/models?pageSize=1000`, { headers: { 'x-goog-api-key': key }, signal: AbortSignal.timeout(timeoutMs) });
  } catch {
    throw new GeminiError('Could not reach Gemini.');
  }
  if (!res.ok) throw new GeminiError(`Gemini request failed (${res.status}).`, res.status, await res.text().catch(() => ''));
  const payload = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  return (payload.models ?? [])
    .filter((m) => m.supportedGenerationMethods?.includes('generateContent') && /gemini/i.test(m.name) && !/embedding|image|tts|audio|live|vision/i.test(m.name))
    .map((m) => m.name.replace(/^models\//, ''));
};

/** Picks the newest general-purpose "flash" model (fast + free-tier friendly), else the newest usable Gemini model. */
export const pickBestModel = (models: string[]): string | undefined => {
  const version = (m: string) => {
    const v = m.match(/gemini-(\d+)(?:\.(\d+))?/i);
    return v ? Number(v[1]) * 1000 + (v[2] ? Number(v[2]) : 0) : 0;
  };
  const steady = models.filter((m) => !/lite|preview|exp|thinking/i.test(m));
  const flash = steady.filter((m) => /flash/i.test(m));
  const pool = flash.length ? flash : steady.length ? steady : models;
  return [...pool].sort((a, b) => version(b) - version(a))[0];
};

/**
 * Calls Gemini and, if the chosen model has been retired or is unavailable to the key (404),
 * transparently discovers the best model the key can access and retries once. `onResolve`
 * receives the working model so callers can persist it and skip the lookup next time.
 */
export const callGeminiResilient = async (req: GeminiRequest, onResolve?: (model: string) => void): Promise<string> => {
  try {
    return await callGemini(req);
  } catch (err) {
    if (err instanceof GeminiError && err.status === 404) {
      const better = pickBestModel(await listModels(req.key).catch(() => []));
      if (better && better !== req.model) {
        const text = await callGemini({ ...req, model: better });
        onResolve?.(better);
        return text;
      }
    }
    throw err;
  }
};

/** Parses model JSON output, tolerating Markdown code fences and stray text around the object (common with smaller models). */
export const parseJsonText = <T = unknown>(text: string): T => {
  const unfenced = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
  try {
    return JSON.parse(unfenced) as T;
  } catch {
    const start = unfenced.indexOf('{');
    const end = unfenced.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(unfenced.slice(start, end + 1)) as T;
      } catch {
        // fall through
      }
    }
    throw new GeminiError('Gemini returned an unexpected format.');
  }
};
