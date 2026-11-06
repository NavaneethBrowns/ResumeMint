import { createAiCaller, type AiVia } from './aiClient';
import { runSmartImport, type SmartImport, type SmartImportOptions } from './resumeIntel';

export type { AiVia };

/** Smart import via the user's own Gemini key or the site's AI bridge (see `createAiCaller`). */
export const smartImport = async (text: string, opts: SmartImportOptions): Promise<SmartImport & { via: AiVia }> => {
  const ai = createAiCaller();
  const result = await runSmartImport(text, ai.call, opts);
  return { ...result, via: ai.via() };
};