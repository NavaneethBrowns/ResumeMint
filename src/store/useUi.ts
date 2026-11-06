import { create } from 'zustand';

interface UiState {
  aiSettingsOpen: boolean;
  importOpen: boolean;
  setAiSettingsOpen: (open: boolean) => void;
  setImportOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  aiSettingsOpen: false,
  importOpen: false,
  setAiSettingsOpen: (aiSettingsOpen) => set({ aiSettingsOpen }),
  setImportOpen: (importOpen) => set({ importOpen }),
}));
