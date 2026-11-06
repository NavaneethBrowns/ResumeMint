import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';

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
    { name: 'resumint:settings' },
  ),
);

export const hasAi = (): boolean => Boolean(useSettings.getState().geminiKey);
