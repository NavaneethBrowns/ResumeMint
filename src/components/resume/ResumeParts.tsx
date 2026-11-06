import type { ReactElement } from 'react';
import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import type { Design, Layout, Personal, ResumeData, SectionId, SimpleItem, SkillGroup, TemplateDef, TimelineItem } from '../../types/resume';
import { isSimple, isTimeline } from '../../data/sections';
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

export const Header = ({ personal, design }: { personal: Personal; design: Design }) => {
  const photo = design.showPhoto && personal.photo;
  return (
    <header className="rs-header">
      {photo && <img className="rs-photo" src={personal.photo} alt="" />}
      <div className="rs-id">
        <h1 className="rs-name">{personal.fullName || 'Your Name'}</h1>
        {personal.title && <p className="rs-title">{personal.title}</p>}
      </div>
      <Contacts personal={personal} icons={design.showIcons} />
    </header>
  );
};

const TimelineEntry = ({ item }: { item: TimelineItem }) => {
  const bullets = toBullets(item.description);
  const sub = [item.organization, item.location].filter(Boolean).join(' · ');
  const range = dateRange(item);
  return (
    <div className="rs-item">
      <div className="rs-item-head">
        <div className="rs-item-main">
          <div className="rs-item-title">{item.title}</div>
          {(sub || item.link) && (
            <div className="rs-item-sub">
              {sub}
              {item.link && (
                <>
                  {sub && ' · '}
                  <a href={withProtocol(item.link)}>{item.link}</a>
                </>
              )}
            </div>
          )}
        </div>
        {range && <div className="rs-item-date">{range}</div>}
      </div>
      {bullets.length === 1 && bullets[0].split(' ').length < 14 ? (
        <p className="rs-item-note">{bullets[0]}</p>
      ) : (
        bullets.length > 0 && (
          <ul className="rs-bullets">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};

const Skills = ({ groups, style }: { groups: SkillGroup[]; style: TemplateDef['skills'] }) => (
  <div className={`rs-skills rs-skills-${style}`}>
    {groups.map((g) =>
      style === 'inline' ? (
        <p key={g.id} className="rs-skill-line">
          {g.name && <strong>{g.name}: </strong>}
          {splitSkills(g.skills).join(', ')}
        </p>
      ) : (
        <div key={g.id} className="rs-skill-group">
          {g.name && <div className="rs-skill-name">{g.name}</div>}
          <ul className="rs-tags">
            {splitSkills(g.skills).map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ),
    )}
  </div>
);

const SimpleList = ({ items }: { items: SimpleItem[] }) => (
  <ul className="rs-simple">
    {items.map((it) => (
      <li key={it.id}>
        <span className="rs-simple-name">{it.name}</span>
        {it.detail && <span className="rs-simple-detail">{it.detail}</span>}
      </li>
    ))}
  </ul>
);

export const Section = ({ id, data, layout, template }: { id: SectionId; data: ResumeData; layout: Layout; template: TemplateDef }) => (
  <section className={`rs-section rs-sec-${id}`}>
    <h2 className="rs-h">
      <span>{sectionTitle(layout, id)}</span>
    </h2>
    <div className="rs-sec-body">
      {id === 'summary' && <p className="rs-summary">{data.summary}</p>}
      {id === 'skills' && <Skills groups={data.skills} style={template.skills} />}
      {isTimeline(id) && data[id].map((it) => <TimelineEntry key={it.id} item={it} />)}
      {isSimple(id) && <SimpleList items={data[id]} />}
    </div>
  </section>
);
