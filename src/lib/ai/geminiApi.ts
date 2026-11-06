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

/** Parses model JSON output, tolerating Markdown code fences. */
export const parseJsonText = <T = unknown>(text: string): T => {
  try {
    return JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as T;
  } catch {
    throw new GeminiError('Gemini returned an unexpected format.');
  }
};
