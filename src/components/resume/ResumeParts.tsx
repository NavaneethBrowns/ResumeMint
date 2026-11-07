import { useEffect, useRef, type ElementType, type ReactElement } from 'react';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import type {
  Design,
  Layout,
  Personal,
  ResumeData,
  SectionId,
  SimpleItem,
  SimpleSectionId,
  SkillGroup,
  TemplateDef,
  TimelineItem,
  TimelineSectionId,
} from '../../types/resume';
import { isSimple, isTimeline } from '../../data/sections';
import { useResumeStore } from '../../store/useResumeStore';
import { contactEntries, dateRange, sectionTitle, splitSkills, toBullets, withProtocol, type ContactKey } from '../../lib/text';

const LinkedinIcon = (props: { size: number }) => (
  <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1v5.45h-4v-4.83c0-1.15-.02-2.63-1.6-2.63-1.6 0-1.85 1.25-1.85 2.55v4.91h-4v-11Z" />
  </svg>
);
const GithubIcon = (props: { size: number }) => (
  <svg width={props.size} height={props.size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.08.63-1.33-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.56 9.56 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
  </svg>
);

const ICONS: Record<ContactKey, (p: { size: number }) => ReactElement> = {
  email: (p) => <Mail {...p} />,
  phone: (p) => <Phone {...p} />,
  location: (p) => <MapPin {...p} />,
  website: (p) => <Globe {...p} />,
  linkedin: LinkedinIcon,
  github: GithubIcon,
};

/**
 * Click-to-edit text node. Renders a contentEditable element whose text is set
 * imperatively, so typing never triggers a React re-render (no cursor jumps).
 * Edits are committed on blur. Enter commits single-line fields; Escape reverts.
 */
interface EditableProps {
  value: string;
  onCommit: (next: string) => void;
  as?: ElementType;
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}
const Editable = ({ value, onCommit, as: Tag = 'span', className, placeholder, multiline }: EditableProps) => {
  const ref = useRef<HTMLElement>(null);

  // Keep the DOM text in sync with external changes (undo, imports) without
  // disturbing the caret while the user is actively editing this node.
  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerText !== value) el.innerText = value;
  });

  return (
    <Tag
      ref={ref as never}
      className={`rs-edit${className ? ` ${className}` : ''}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      data-ph={placeholder}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === 'Escape') {
          if (ref.current) ref.current.innerText = value;
          e.currentTarget.blur();
        }
        if (!multiline && e.key === 'Enter') {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const raw = e.currentTarget.innerText;
        const next = multiline ? raw.replace(/\n{3,}/g, '\n\n').replace(/\s+$/, '') : raw.replace(/\s+/g, ' ').trim();
        if (next !== value) onCommit(next);
      }}
    />
  );
};

const store = () => useResumeStore.getState();
const editPersonal = (key: keyof Personal, val: string) =>
  store().updateData((d) => ({ ...d, personal: { ...d.personal, [key]: val } }));
const editTimeline = (section: TimelineSectionId, id: string, patch: Partial<TimelineItem>) =>
  store().updateData((d) => ({ ...d, [section]: d[section].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
const editSkill = (id: string, patch: Partial<SkillGroup>) =>
  store().updateData((d) => ({ ...d, skills: d.skills.map((g) => (g.id === id ? { ...g, ...patch } : g)) }));
const editSimple = (section: SimpleSectionId, id: string, patch: Partial<SimpleItem>) =>
  store().updateData((d) => ({ ...d, [section]: d[section].map((it) => (it.id === id ? { ...it, ...patch } : it)) }));

/** Parses a free-typed date range ("Jan 2022 - Present", "2015 - 2019") back into fields. */
const parseDateRange = (text: string): Pick<TimelineItem, 'startDate' | 'endDate' | 'current'> => {
  const parts = text
    .split(/\s*(?:\u2013|\u2014|-|\bto\b|\buntil\b|~)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
  const startDate = parts[0] ?? '';
  const end = parts[1] ?? '';
  const current = /^(present|current|now|ongoing|till date)$/i.test(end);
  return { startDate, endDate: current ? '' : end, current };
};

export const Contacts = ({ personal, icons }: { personal: Personal; icons: boolean }) => (
  <ul className="rs-contacts">
    {contactEntries(personal).map((c) => (
      <li key={c.key}>
        {icons && <span className="rs-ic">{ICONS[c.key]({ size: 11 })}</span>}
        {c.href ? <a href={c.href}>{c.value}</a> : <span>{c.value}</span>}
      </li>
    ))}
  </ul>
);

export const Header = ({ personal, design, editable }: { personal: Personal; design: Design; editable?: boolean }) => {
  const photo = design.showPhoto && personal.photo;
  return (
    <header className="rs-header">
      {photo && <img className="rs-photo" src={personal.photo} alt="" />}
      <div className="rs-id">
        {editable ? (
          <>
            <Editable
              as="h1"
              className="rs-name"
              value={personal.fullName}
              placeholder="Your Name"
              onCommit={(v) => editPersonal('fullName', v)}
            />
            <Editable
              as="p"
              className="rs-title"
              value={personal.title}
              placeholder="Your Title"
              onCommit={(v) => editPersonal('title', v)}
            />
          </>
        ) : (
          <>
            <h1 className="rs-name">{personal.fullName || 'Your Name'}</h1>
            {personal.title && <p className="rs-title">{personal.title}</p>}
          </>
        )}
      </div>
      <Contacts personal={personal} icons={design.showIcons} />
    </header>
  );
};

const Bullets = ({
  description,
  editable,
  onCommitBullet,
}: {
  description: string;
  editable?: boolean;
  onCommitBullet: (index: number, value: string) => void;
}) => {
  const bullets = toBullets(description);
  if (bullets.length === 1 && bullets[0].split(' ').length < 14) {
    return editable ? (
      <Editable as="p" className="rs-item-note" value={bullets[0]} onCommit={(v) => onCommitBullet(0, v)} />
    ) : (
      <p className="rs-item-note">{bullets[0]}</p>
    );
  }
  if (!bullets.length) return null;
  return (
    <ul className="rs-bullets">
      {bullets.map((b, i) =>
        editable ? (
          <Editable key={i} as="li" value={b} onCommit={(v) => onCommitBullet(i, v)} />
        ) : (
          <li key={i}>{b}</li>
        ),
      )}
    </ul>
  );
};

const TimelineEntry = ({ item, section, editable }: { item: TimelineItem; section: TimelineSectionId; editable?: boolean }) => {
  const sub = [item.organization, item.location].filter(Boolean).join(' \u00b7 ');
  const range = dateRange(item);

  const commitBullet = (index: number, value: string) => {
    const bullets = toBullets(item.description);
    if (value.trim()) bullets[index] = value;
    else bullets.splice(index, 1);
    editTimeline(section, item.id, { description: bullets.join('\n') });
  };

  return (
    <div className="rs-item">
      <div className="rs-item-head">
        <div className="rs-item-main">
          {editable ? (
            <Editable
              className="rs-item-title"
              value={item.title}
              placeholder="Title"
              onCommit={(v) => editTimeline(section, item.id, { title: v })}
            />
          ) : (
            <div className="rs-item-title">{item.title}</div>
          )}
          {editable ? (
            <div className="rs-item-sub">
              <Editable value={item.organization} placeholder="Organization" onCommit={(v) => editTimeline(section, item.id, { organization: v })} />
              <span className="rs-sub-sep">{' \u00b7 '}</span>
              <Editable value={item.location} placeholder="Location" onCommit={(v) => editTimeline(section, item.id, { location: v })} />
            </div>
          ) : (
            (sub || item.link) && (
              <div className="rs-item-sub">
                {sub}
                {item.link && (
                  <>
                    {sub && ' \u00b7 '}
                    <a href={withProtocol(item.link)}>{item.link}</a>
                  </>
                )}
              </div>
            )
          )}
        </div>
        {editable ? (
          <Editable
            className="rs-item-date"
            value={range}
            placeholder="Dates"
            onCommit={(v) => editTimeline(section, item.id, parseDateRange(v))}
          />
        ) : (
          range && <div className="rs-item-date">{range}</div>
        )}
      </div>
      <Bullets description={item.description} editable={editable} onCommitBullet={commitBullet} />
    </div>
  );
};

const Skills = ({ groups, style, editable }: { groups: SkillGroup[]; style: TemplateDef['skills']; editable?: boolean }) => {
  const commitTag = (group: SkillGroup, index: number, value: string) => {
    const tags = splitSkills(group.skills);
    if (value.trim()) tags[index] = value;
    else tags.splice(index, 1);
    editSkill(group.id, { skills: tags.join(', ') });
  };
  return (
    <div className={`rs-skills rs-skills-${style}`}>
      {groups.map((g) =>
        style === 'inline' ? (
          <p key={g.id} className="rs-skill-line">
            {editable ? (
              <>
                <Editable as="strong" value={g.name} placeholder="Group" onCommit={(v) => editSkill(g.id, { name: v })} />
                {g.name && ': '}
                <Editable value={g.skills} placeholder="Skills, comma separated" onCommit={(v) => editSkill(g.id, { skills: v })} />
              </>
            ) : (
              <>
                {g.name && <strong>{g.name}: </strong>}
                {splitSkills(g.skills).join(', ')}
              </>
            )}
          </p>
        ) : (
          <div key={g.id} className="rs-skill-group">
            {editable ? (
              <Editable as="div" className="rs-skill-name" value={g.name} placeholder="Group" onCommit={(v) => editSkill(g.id, { name: v })} />
            ) : (
              g.name && <div className="rs-skill-name">{g.name}</div>
            )}
            <ul className="rs-tags">
              {splitSkills(g.skills).map((s, i) =>
                editable ? (
                  <Editable key={i} as="li" value={s} onCommit={(v) => commitTag(g, i, v)} />
                ) : (
                  <li key={s}>{s}</li>
                ),
              )}
            </ul>
          </div>
        ),
      )}
    </div>
  );
};

const SimpleList = ({ items, section, editable }: { items: SimpleItem[]; section: SimpleSectionId; editable?: boolean }) => (
  <ul className="rs-simple">
    {items.map((it) => (
      <li key={it.id}>
        {editable ? (
          <>
            <Editable className="rs-simple-name" value={it.name} placeholder="Name" onCommit={(v) => editSimple(section, it.id, { name: v })} />
            <Editable className="rs-simple-detail" value={it.detail} placeholder="Detail" onCommit={(v) => editSimple(section, it.id, { detail: v })} />
          </>
        ) : (
          <>
            <span className="rs-simple-name">{it.name}</span>
            {it.detail && <span className="rs-simple-detail">{it.detail}</span>}
          </>
        )}
      </li>
    ))}
  </ul>
);

export const Section = ({
  id,
  data,
  layout,
  template,
  editable,
}: {
  id: SectionId;
  data: ResumeData;
  layout: Layout;
  template: TemplateDef;
  editable?: boolean;
}) => (
  <section className={`rs-section rs-sec-${id}`}>
    <h2 className="rs-h">
      <span>{sectionTitle(layout, id)}</span>
    </h2>
    <div className="rs-sec-body">
      {id === 'summary' &&
        (editable ? (
          <Editable
            as="p"
            className="rs-summary"
            value={data.summary}
            placeholder="Write a short professional summary..."
            multiline
            onCommit={(v) => store().updateData((d) => ({ ...d, summary: v }))}
          />
        ) : (
          <p className="rs-summary">{data.summary}</p>
        ))}
      {id === 'skills' && <Skills groups={data.skills} style={template.skills} editable={editable} />}
      {isTimeline(id) && data[id].map((it) => <TimelineEntry key={it.id} item={it} section={id} editable={editable} />)}
      {isSimple(id) && <SimpleList items={data[id]} section={id} editable={editable} />}
    </div>
  </section>
);
