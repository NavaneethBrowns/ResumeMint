import { create } from 'zustand';

interface UiState {
  aiSettingsOpen: boolean;
  importOpen: boolean;
  tailorOpen: boolean;
  setAiSettingsOpen: (open: boolean) => void;
  setImportOpen: (open: boolean) => void;
  setTailorOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  aiSettingsOpen: false,
  importOpen: false,
  tailorOpen: false,
  setAiSettingsOpen: (aiSettingsOpen) => set({ aiSettingsOpen }),
  setImportOpen: (importOpen) => set({ importOpen }),
  setTailorOpen: (tailorOpen) => set({ tailorOpen }),
}));
