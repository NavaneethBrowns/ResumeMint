import { afterEach, describe, expect, it, vi } from 'vitest';
import { callGeminiResilient, pickBestModel } from '../src/lib/ai/geminiApi';

afterEach(() => vi.unstubAllGlobals());

const ok = (text: string) => Response.json({ candidates: [{ content: { parts: [{ text }] } }] });
const models = (names: string[]) =>
  Response.json({ models: names.map((name) => ({ name: `models/${name}`, supportedGenerationMethods: ['generateContent'] })) });

describe('pickBestModel', () => {
  it('prefers the newest steady flash model', () => {
    expect(pickBestModel(['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash'])).toBe('gemini-2.5-flash');
  });

  it('skips preview/exp/lite variants when a steady flash exists', () => {
    expect(pickBestModel(['gemini-3.8-flash-preview', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'])).toBe('gemini-2.5-flash');
  });

  it('falls back to the newest usable model when no flash is offered', () => {
    expect(pickBestModel(['gemini-2.5-pro', 'gemini-1.5-pro'])).toBe('gemini-2.5-pro');
  });
});

describe('callGeminiResilient', () => {
  it('auto-recovers from a retired model (404) and reports the resolved one', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('/models?')) return models(['gemini-2.5-flash', 'gemini-2.0-flash']);
      if (url.includes('gemini-9.9-retired:generateContent')) return new Response('not found', { status: 404 });
      return ok('{"ok":true}');
    });
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    let resolved = '';
    const text = await callGeminiResilient({ key: 'k', model: 'gemini-9.9-retired', prompt: 'hi' }, (m) => (resolved = m));

    expect(text).toBe('{"ok":true}');
    expect(resolved).toBe('gemini-2.5-flash');
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('gemini-2.5-flash:generateContent'))).toBe(true);
  });

  it('does not retry on non-404 errors', async () => {
    const fetchMock = vi.fn(async () => new Response('quota', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
    await expect(callGeminiResilient({ key: 'k', model: 'gemini-2.5-flash', prompt: 'hi' })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
