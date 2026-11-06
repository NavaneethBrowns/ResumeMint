import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash';

/** Model IDs that have since been retired by Google — returning users are migrated off these. */
const RETIRED_MODEL = /^(models\/)?gemini-(1\.0|1\.5|2\.0|2\.5)-/i;

interface SettingsState {
  geminiKey: string;
  geminiModel: string;
  setGeminiKey: (key: string) => void;
  setGeminiModel: (model: string) => void;
}

/** The API key never leaves the browser except in direct calls to Google's API. */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      geminiKey: '',
      geminiModel: DEFAULT_GEMINI_MODEL,
      setGeminiKey: (geminiKey) => set({ geminiKey: geminiKey.trim() }),
      setGeminiModel: (geminiModel) => set({ geminiModel: geminiModel.trim() || DEFAULT_GEMINI_MODEL }),
    }),
    {
      name: 'resumint:settings',
      version: 1,
      // Bump anyone still pointing at a retired default to the current one (custom models are kept).
      migrate: (state, version) => {
        const s = (state ?? {}) as Partial<SettingsState>;
        if (version < 1 && (!s.geminiModel || RETIRED_MODEL.test(s.geminiModel))) s.geminiModel = DEFAULT_GEMINI_MODEL;
        return s as SettingsState;
      },
    },
  ),
);

export const hasAi = (): boolean => Boolean(useSettings.getState().geminiKey);
