import { useState, type ReactNode } from 'react';
import {
  Award, BadgeCheck, Briefcase, ChevronDown, Eye, EyeOff, FileText, FolderGit2, GraduationCap, GripVertical, HandHeart, Heart,
  Languages, Pencil, User, Wrench, type LucideIcon,
} from 'lucide-react';
import type { ResumeDoc, SectionId } from '../../types/resume';
import { SECTIONS, isSimple, isTimeline } from '../../data/sections';
import { useResumeStore } from '../../store/useResumeStore';
import { sectionTitle } from '../../lib/text';
import { SortableList, type DragHandleProps } from '../ui/SortableList';
import { PersonalEditor, SimpleEditor, SkillsEditor, SummaryEditor, TimelineEditor } from './SectionEditors';

export const SECTION_ICONS: Record<SectionId | 'personal', LucideIcon> = {
  personal: User,
  summary: FileText,
  experience: Briefcase,
  education: GraduationCap,
  projects: FolderGit2,
  volunteer: HandHeart,
  skills: Wrench,
  certifications: BadgeCheck,
  awards: Award,
  languages: Languages,
  interests: Heart,
};

interface CardProps {
  icon: LucideIcon;
  title: string;
  sub: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  handle?: DragHandleProps;
  hidden?: boolean;
  onToggleHidden?: () => void;
  onRename?: (title: string) => void;
}

const EditorCard = ({ icon: Icon, title, sub, open, onToggle, children, handle, hidden, onToggleHidden, onRename }: CardProps) => {
  const [renaming, setRenaming] = useState(false);
  return (
    <div className={`card${open ? ' open' : ''}${hidden ? ' hidden-section' : ''}`}>
      <div className="card-head" onClick={onToggle}>
        {handle ? (
          <span className="handle" {...handle} onClick={(e) => e.stopPropagation()} title="Drag to reorder">
            <GripVertical size={16} />
          </span>
        ) : (
          <span style={{ width: 22 }} />
        )}
        <span className="card-icon">
          <Icon size={17} />
        </span>
        <div className="card-title">
          {renaming && onRename ? (
            <input
              autoFocus
              defaultValue={title}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => (onRename(e.target.value), setRenaming(false))}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
          ) : (
            <strong>{title}</strong>
          )}
          <small>{hidden ? 'Hidden from resume' : sub}</small>
        </div>
        {onRename && (
          <button className="icon-btn sm" onClick={(e) => (e.stopPropagation(), setRenaming(true))} aria-label="Rename section" title="Rename">
            <Pencil size={14} />
          </button>
        )}
        {onToggleHidden && (
          <button className="icon-btn sm" onClick={(e) => (e.stopPropagation(), onToggleHidden())} aria-label={hidden ? 'Show section' : 'Hide section'} title={hidden ? 'Show' : 'Hide'}>
            {hidden ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
        <ChevronDown size={18} className="chev" />
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  );
};

const countLabel = (doc: ResumeDoc, id: SectionId): string => {
  if (id === 'summary') return doc.data.summary ? `${doc.data.summary.split(/\s+/).length} words` : 'Empty';
  const n = (doc.data[id] as unknown[]).length;
  return n ? `${n} ${n === 1 ? 'entry' : 'entries'}` : 'Empty — click to add';
};

export const ContentEditor = ({ doc }: { doc: ResumeDoc }) => {
  const [openId, setOpenId] = useState<SectionId | 'personal' | null>('personal');
  const { updateLayout, toggleSection } = useResumeStore.getState();
  const toggle = (id: SectionId | 'personal') => setOpenId((cur) => (cur === id ? null : id));

  const body = (id: SectionId) => {
    if (id === 'summary') return <SummaryEditor summary={doc.data.summary} title={doc.data.personal.title} />;
    if (id === 'skills') return <SkillsEditor groups={doc.data.skills} />;
    if (isTimeline(id)) return <TimelineEditor id={id} items={doc.data[id]} />;
    if (isSimple(id)) return <SimpleEditor id={id} items={doc.data[id]} />;
    return null;
  };

  return (
    <>
      <EditorCard
        icon={User}
        title="Personal details"
        sub={doc.data.personal.fullName || 'Name, contact, photo'}
        open={openId === 'personal'}
        onToggle={() => toggle('personal')}
      >
        <PersonalEditor personal={doc.data.personal} />
      </EditorCard>
      <SortableList
        items={doc.layout.order}
        getId={(id) => id}
        onReorder={(order) => updateLayout((l) => ({ ...l, order }))}
        renderItem={(id, handle) => (
          <EditorCard
            icon={SECTION_ICONS[id]}
            title={sectionTitle(doc.layout, id)}
            sub={countLabel(doc, id)}
            open={openId === id}
            onToggle={() => toggle(id)}
            handle={handle}
            hidden={doc.layout.hidden.includes(id)}
            onToggleHidden={() => toggleSection(id)}
            onRename={(t) =>
              updateLayout((l) => ({ ...l, titles: { ...l.titles, [id]: t.trim() && t.trim() !== SECTIONS[id].label ? t.trim() : undefined } }))
            }
          >
            {body(id)}
          </EditorCard>
        )}
      />
    </>
  );
};
