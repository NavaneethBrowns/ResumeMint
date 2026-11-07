import type { Design, Layout, ResumeData } from '../../types/resume';
import { DEFAULT_ORDER } from '../../data/sections';
import { getTemplate } from '../../data/templates';
import type { ImportStage, SmartImport } from '../ai/resumeIntel';
import { smartImport, type AiVia } from '../ai/smartImport';
import { extractResumeText } from './extractText';
import { normalizeResumeData } from './normalize';
import { parseResumeText } from './parseResume';

export interface ImportResult {
  data: ResumeData;
  layout?: Layout;
  design?: Design;
  text: string;
  method: 'json' | 'ai' | 'heuristic';
  /** Present when the AI analysed and arranged the resume. */
  insight?: Omit<SmartImport, 'data'> & { via: AiVia };
  /** Why AI parsing was skipped, when it was requested but failed. */
  aiError?: string;
}

export interface ImportOptions {
  ai: boolean;
  /** Rewrite concisely for the adaptive page budget; false extracts the original wording. */
  optimise: boolean;
  onStage?: (stage: ImportStage | 'reading') => void;
}

const sanitizeLayout = (raw: unknown): Layout | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const l = raw as Partial<Layout>;
  const valid = (arr: unknown) =>
    Array.isArray(arr) ? arr.filter((x): x is Layout['order'][number] => (DEFAULT_ORDER as string[]).includes(x as string)) : [];
  const order = valid(l.order);
  return {
    order: [...order, ...DEFAULT_ORDER.filter((s) => !order.includes(s))],
    sidebar: valid(l.sidebar),
    hidden: valid(l.hidden),
    titles: Object.fromEntries(
      Object.entries(l.titles ?? {}).filter(([k, v]) => DEFAULT_ORDER.includes(k as never) && typeof v === 'string').map(([k, v]) => [k, (v as string).slice(0, 60)]),
    ),
  };
};

const sanitizeDesign = (raw: unknown): Design | undefined => {
  if (!raw || typeof raw !== 'object') return undefined;
  const d = raw as Partial<Design>;
  const num = (v: unknown, min: number, max: number, def: number) => (typeof v === 'number' && v >= min && v <= max ? v : def);
  const tpl = getTemplate(String(d.templateId ?? ''));
  return {
    templateId: tpl.id,
    accent: /^#[0-9a-f]{6}$/i.test(String(d.accent)) ? String(d.accent) : tpl.accent,
    fontFamily: typeof d.fontFamily === 'string' ? d.fontFamily.slice(0, 40) : tpl.font,
    fontScale: num(d.fontScale, 0.85, 1.15, 1),
    lineHeight: num(d.lineHeight, 1.15, 1.8, 1.45),
    margin: num(d.margin, 8, 26, 16),
    sectionGap: num(d.sectionGap, 6, 28, 14),
    showPhoto: d.showPhoto !== false,
    showIcons: d.showIcons !== false,
    paper: d.paper === 'Letter' ? 'Letter' : 'A4',
    textAlign: d.textAlign === 'justify' ? 'justify' : 'left',
  };
};

/** Reads a resume file and converts it into structured data (own JSON → exact, otherwise smart AI or offline heuristics). */
export const importResumeFile = async (file: File, opts: ImportOptions): Promise<ImportResult> => {
  opts.onStage?.('reading');
  const { text, kind } = await extractResumeText(file);
  if (kind === 'json') {
    const parsed = JSON.parse(text);
    const body = parsed?.app === 'resumint' ? parsed : { data: parsed };
    return { data: normalizeResumeData(body.data), layout: sanitizeLayout(body.layout), design: sanitizeDesign(body.design), text, method: 'json' };
  }
  if (!text.trim()) throw new Error('No text found. Scanned/image PDFs cannot be read — please upload a text-based PDF or DOCX.');
  let aiError: string | undefined;
  if (opts.ai) {
    try {
      const { data, ...insight } = await smartImport(text, { optimise: opts.optimise, onStage: opts.onStage });
      return { data, text, method: 'ai', insight };
    } catch (err) {
      console.warn('[import] AI parse failed, falling back to heuristics', err);
      aiError = err instanceof Error ? err.message : 'AI parsing failed.';
    }
  }
  return { data: parseResumeText(text), text, method: 'heuristic', aiError };
};
