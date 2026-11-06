import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Design, Layout, ResumeData, ResumeDoc, SectionId } from '../types/resume';
import { defaultLayout, designForTemplate, emptyResume, sampleResume, uid } from '../data/sections';
import { getTemplate } from '../data/templates';

type Snapshot = Pick<ResumeDoc, 'data' | 'layout' | 'design'>;

interface ResumeState {
  docs: ResumeDoc[];
  activeId: string;
  past: Snapshot[];
  future: Snapshot[];
  lastEditAt: number;
  createDoc: (opts?: { data?: ResumeData; templateId?: string; name?: string }) => string;
  duplicateDoc: (id: string) => void;
  deleteDoc: (id: string) => void;
  renameDoc: (id: string, name: string) => void;
  setActive: (id: string) => void;
  updateData: (fn: (d: ResumeData) => ResumeData) => void;
  updateLayout: (fn: (l: Layout) => Layout) => void;
  updateDesign: (patch: Partial<Design>) => void;
  setTemplate: (templateId: string) => void;
  toggleSection: (id: SectionId) => void;
  undo: () => void;
  redo: () => void;
}

const HISTORY_LIMIT = 60;
const MERGE_WINDOW_MS = 700;

const makeDoc = (data: ResumeData, templateId = 'aurora', name = 'My Resume'): ResumeDoc => ({
  id: uid(),
  name,
  updatedAt: Date.now(),
  data,
  layout: defaultLayout(templateId),
  design: designForTemplate(templateId),
});

const initialDoc = makeDoc(sampleResume(), 'aurora', 'Sample Resume');

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => {
      /** Applies a change to the active doc and records undo history (rapid edits are merged). */
      const commit = (fn: (doc: ResumeDoc) => Partial<Snapshot>) => {
        const { docs, activeId, past, lastEditAt } = get();
        const doc = docs.find((d) => d.id === activeId);
        if (!doc) return;
        const now = Date.now();
        const snapshot: Snapshot = { data: doc.data, layout: doc.layout, design: doc.design };
        const merge = now - lastEditAt < MERGE_WINDOW_MS && past.length > 0;
        set({
          docs: docs.map((d) => (d.id === activeId ? { ...d, ...fn(d), updatedAt: now } : d)),
          past: merge ? past : [...past, snapshot].slice(-HISTORY_LIMIT),
          future: [],
          lastEditAt: now,
        });
      };

      const restore = (from: 'past' | 'future') => {
        const state = get();
        const stack = state[from];
        const doc = state.docs.find((d) => d.id === state.activeId);
        if (!stack.length || !doc) return;
        const target = stack[stack.length - 1];
        const current: Snapshot = { data: doc.data, layout: doc.layout, design: doc.design };
        const other = from === 'past' ? 'future' : 'past';
        set({
          docs: state.docs.map((d) => (d.id === doc.id ? { ...d, ...target, updatedAt: Date.now() } : d)),
          [from]: stack.slice(0, -1),
          [other]: [...state[other], current],
          lastEditAt: 0,
        } as Partial<ResumeState>);
      };

      return {
        docs: [initialDoc],
        activeId: initialDoc.id,
        past: [],
        future: [],
        lastEditAt: 0,

        createDoc: ({ data, templateId, name } = {}) => {
          const doc = makeDoc(data ?? emptyResume(), templateId, name ?? 'Untitled Resume');
          set((s) => ({ docs: [doc, ...s.docs], activeId: doc.id, past: [], future: [] }));
          return doc.id;
        },
        duplicateDoc: (id) => {
          const src = get().docs.find((d) => d.id === id);
          if (!src) return;
          const copy: ResumeDoc = { ...structuredClone(src), id: uid(), name: `${src.name} (copy)`, updatedAt: Date.now() };
          set((s) => ({ docs: [copy, ...s.docs] }));
        },
        deleteDoc: (id) =>
          set((s) => {
            const docs = s.docs.filter((d) => d.id !== id);
            if (!docs.length) docs.push(makeDoc(emptyResume(), 'aurora', 'Untitled Resume'));
            const activeId = s.activeId === id ? docs[0].id : s.activeId;
            return { docs, activeId, past: [], future: [] };
          }),
        renameDoc: (id, name) => set((s) => ({ docs: s.docs.map((d) => (d.id === id ? { ...d, name } : d)) })),
        setActive: (id) => set({ activeId: id, past: [], future: [] }),

        updateData: (fn) => commit((d) => ({ data: fn(d.data) })),
        updateLayout: (fn) => commit((d) => ({ layout: fn(d.layout) })),
        updateDesign: (patch) => commit((d) => ({ design: { ...d.design, ...patch } })),
        setTemplate: (templateId) =>
          commit((d) => {
            const prevTpl = getTemplate(d.design.templateId);
            const nextTpl = getTemplate(templateId);
            // Keep the user's sidebar choices when moving between two-column templates.
            const sidebar =
              prevTpl.layout !== 'single' && nextTpl.layout !== 'single' ? d.layout.sidebar : [...nextTpl.defaultSidebar];
            return { design: designForTemplate(templateId, d.design), layout: { ...d.layout, sidebar } };
          }),
        toggleSection: (id) =>
          commit((d) => {
            const hidden = d.layout.hidden.includes(id) ? d.layout.hidden.filter((h) => h !== id) : [...d.layout.hidden, id];
            return { layout: { ...d.layout, hidden } };
          }),
        undo: () => restore('past'),
        redo: () => restore('future'),
      };
    },
    {
      name: 'resumint:v1',
      version: 1,
      partialize: (s) => ({ docs: s.docs, activeId: s.activeId }),
    },
  ),
);

export const useActiveDoc = (): ResumeDoc => {
  const doc = useResumeStore((s) => s.docs.find((d) => d.id === s.activeId) ?? s.docs[0]);
  return doc;
};
