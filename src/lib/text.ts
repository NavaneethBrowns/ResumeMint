import type { Layout, Personal, ResumeData, SectionId, TimelineItem } from '../types/resume';
import { SECTIONS, isSimple, isTimeline } from '../data/sections';

const BULLET_PREFIX = /^\s*(?:[-*•▪◦●–—>]|\d+[.)])\s*/;

export const toBullets = (text: string): string[] =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(BULLET_PREFIX, '').trim())
    .filter(Boolean);

export const splitSkills = (text: string): string[] =>
  text
    .split(/[,;|•\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

export const dateRange = (item: Pick<TimelineItem, 'startDate' | 'endDate' | 'current'>): string => {
  const end = item.current ? 'Present' : item.endDate;
  return [item.startDate, end].filter(Boolean).join(' – ');
};

export type ContactKey = 'email' | 'phone' | 'location' | 'website' | 'linkedin' | 'github';
export const CONTACT_KEYS: ContactKey[] = ['email', 'phone', 'location', 'linkedin', 'github', 'website'];

export const contactEntries = (p: Personal): { key: ContactKey; value: string; href?: string }[] =>
  CONTACT_KEYS.filter((k) => p[k].trim()).map((key) => {
    const value = p[key].trim();
    const href =
      key === 'email' ? `mailto:${value}` : key === 'phone' ? `tel:${value.replace(/[^\d+]/g, '')}` : key === 'location' ? undefined : withProtocol(value);
    return { key, value, href };
  });

export const withProtocol = (url: string): string => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

export const sectionTitle = (layout: Layout, id: SectionId): string => layout.titles[id]?.trim() || SECTIONS[id].label;

export const hasContent = (data: ResumeData, id: SectionId): boolean => {
  if (id === 'summary') return Boolean(data.summary.trim());
  return (data[id] as unknown[]).length > 0;
};

export const visibleSections = (data: ResumeData, layout: Layout): SectionId[] =>
  layout.order.filter((id) => !layout.hidden.includes(id) && hasContent(data, id));

/** Linear, ATS-style plain text rendering. Shared by the ATS scorer, TXT export and AI prompts. */
export const resumeToPlainText = (data: ResumeData, layout: Layout): string => {
  const p = data.personal;
  const lines: string[] = [p.fullName, p.title, contactEntries(p).map((c) => c.value).join(' | '), ''];
  for (const id of visibleSections(data, layout)) {
    lines.push(sectionTitle(layout, id).toUpperCase());
    if (id === 'summary') lines.push(data.summary);
    else if (id === 'skills') data.skills.forEach((g) => lines.push(g.name ? `${g.name}: ${g.skills}` : g.skills));
    else if (isTimeline(id))
      data[id].forEach((it) => {
        lines.push([it.title, it.organization, it.location].filter(Boolean).join(' | '));
        const range = dateRange(it);
        if (range) lines.push(range);
        if (it.link) lines.push(it.link);
        toBullets(it.description).forEach((b) => lines.push(`- ${b}`));
      });
    else if (isSimple(id)) data[id].forEach((it) => lines.push([it.name, it.detail].filter(Boolean).join(' — ')));
    lines.push('');
  }
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n').trim();
};

export const slugify = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'resume';
