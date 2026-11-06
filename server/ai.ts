import { callGemini, GeminiError, parseJsonText } from '../src/lib/ai/geminiApi';
import { buildTaskPrompt, MAX_RESUME_CHARS, parseAiTask, SYSTEM_PROMPT } from '../src/lib/ai/resumeIntel';

/**
 * AI bridge for smart resume import. Only accepts the fixed resume tasks (never free-form prompts),
 * so the server's Gemini key cannot be used as a general-purpose proxy.
 */
const DEFAULT_MODEL = 'gemini-2.5-flash';
const MAX_BODY = MAX_RESUME_CHARS * 2 + 20_000;
const WINDOW_MS = 10 * 60_000;
const json = (body: unknown, status = 200) => Response.json(body, { status });

const hits = new Map<string, number[]>();

/** Best-effort per-instance limiter; serverless instances don't share memory, so pair it with a Google Cloud quota. */
export const isRateLimited = (ip: string, limit: number, now = Date.now()): boolean => {
  if (hits.size > 5_000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > limit;
};

const crossSite = (request: Request): boolean => {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host !== new URL(request.url).host;
  } catch {
    return true;
  }
};

export async function handleAiResume(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) return json({ error: 'The AI service is not enabled on this site.' }, 503);
  if (crossSite(request)) return json({ error: 'Forbidden.' }, 403);

  const ip = request.headers.get('x-nf-client-connection-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'anon';
  const limit = Number(process.env.AI_RATE_LIMIT) > 0 ? Number(process.env.AI_RATE_LIMIT) : 12;
  if (isRateLimited(ip, limit)) return json({ error: 'Too many AI requests. Please wait a few minutes.' }, 429);

  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: 'Request too large.' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }
  const parsed = parseAiTask(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  try {
    const text = await callGemini({
      key,
      model: process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL,
      system: SYSTEM_PROMPT,
      prompt: buildTaskPrompt(parsed.task),
      json: true,
      timeoutMs: 25_000,
    });
    return json({ result: parseJsonText(text) });
  } catch (error) {
    const status = error instanceof GeminiError ? error.status : undefined;
    console.error(`[ai/resume] ${parsed.task.kind} failed`, { status, message: error instanceof Error ? error.message : String(error) });
    if (status === 429) return json({ error: 'The AI service is busy. Please try again shortly.' }, 429);
    if (status === 504) return json({ error: 'The AI took too long to respond.' }, 504);
    return json({ error: 'The AI service could not process this resume.' }, 502);
  }
}
