import { useState } from 'react';
import { Check, ChevronDown, Copy, FilePlus2, FileText, Pencil, Sparkle, Target, Trash2 } from 'lucide-react';
import { useResumeStore } from '../../store/useResumeStore';
import { useUi } from '../../store/useUi';
import { sampleResume } from '../../data/sections';
import { Popover, toast } from '../ui/primitives';

const timeAgo = (ts: number): string => {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(ts).toLocaleDateString();
};

export const DocSwitcher = () => {
  const docs = useResumeStore((s) => s.docs);
  const activeId = useResumeStore((s) => s.activeId);
  const { setActive, createDoc, duplicateDoc, deleteDoc, renameDoc } = useResumeStore.getState();
  const [editing, setEditing] = useState<string | null>(null);
  const active = docs.find((d) => d.id === activeId) ?? docs[0];

  return (
    <Popover
      align="left"
      width={340}
      trigger={(toggle) => (
        <button className="doc-switch" onClick={toggle} title="Switch resume">
          <FileText size={16} color="var(--brand-700)" />
          <span>{active.name}</span>
          <ChevronDown size={14} />
        </button>
      )}
    >
      {(close) => (
        <>
          <div style={{ maxHeight: 320, overflow: 'auto' }}>
            {docs.map((d) => (
              <div key={d.id} className="menu-item" style={{ cursor: 'default' }}>
                <span className="mi-icon">{d.id === activeId ? <Check size={16} /> : <FileText size={16} />}</span>
                <span style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => (setActive(d.id), close())}>
                  {editing === d.id ? (
                    <input
                      className="input"
                      style={{ height: 30 }}
                      autoFocus
                      defaultValue={d.name}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => (renameDoc(d.id, e.target.value.trim() || d.name), setEditing(null))}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                    />
                  ) : (
                    <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</strong>
                  )}
                  <small>
                    {d.target ? `🎯 ${d.target.position}${d.target.company ? ` · ${d.target.company}` : ''}` : `Edited ${timeAgo(d.updatedAt)}`}
                  </small>
                </span>
                <button className="icon-btn sm" onClick={() => setEditing(d.id)} aria-label="Rename" title="Rename">
                  <Pencil size={13} />
                </button>
                <button className="icon-btn sm" onClick={() => (duplicateDoc(d.id), toast.success('Duplicated.'))} aria-label="Duplicate" title="Duplicate">
                  <Copy size={13} />
                </button>
                <button
                  className="icon-btn sm danger"
                  onClick={() => window.confirm(`Delete “${d.name}”? This cannot be undone.`) && deleteDoc(d.id)}
                  aria-label="Delete"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="menu-sep" />
          <button className="menu-item" onClick={() => (createDoc(), close())}>
            <span className="mi-icon"><FilePlus2 size={16} /></span>
            <span><strong>New blank resume</strong><small>Start from scratch</small></span>
          </button>
          <button className="menu-item" onClick={() => (createDoc({ data: sampleResume(), name: 'Sample Resume' }), close())}>
            <span className="mi-icon"><Sparkle size={16} /></span>
            <span><strong>New from example</strong><small>Edit a polished sample</small></span>
          </button>
          <div className="menu-sep" />
          <button className="menu-item accent" onClick={() => (useUi.getState().setTailorOpen(true), close())}>
            <span className="mi-icon"><Target size={16} /></span>
            <span><strong>Tailor to a job…</strong><small>Make a copy matched to a job post</small></span>
          </button>
        </>
      )}
    </Popover>
  );
};
