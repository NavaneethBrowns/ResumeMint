import type { ResumeData, SimpleItem, SkillGroup, TimelineItem } from '../../types/resume';
import { newSimpleItem, newSkillGroup, newTimelineItem } from '../../data/sections';

const str = (v: unknown, max = 4000): string => (typeof v === 'string' ? v.slice(0, max) : typeof v === 'number' ? String(v) : '');
const arr = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);

const timeline = (v: unknown): TimelineItem[] =>
  arr(v).slice(0, 40).map((o) => {
    const description = Array.isArray(o.bullets) ? (o.bullets as unknown[]).map((b) => str(b)).join('\n') : str(o.description);
    const end = str(o.endDate);
    return newTimelineItem({
      title: str(o.title, 200),
      organization: str(o.organization ?? o.company ?? o.institution, 200),
      location: str(o.location, 120),
      startDate: str(o.startDate, 40),
      endDate: /present|current/i.test(end) ? '' : end.slice(0, 40),
      current: Boolean(o.current) || /present|current/i.test(end),
      link: str(o.link ?? o.url, 300),
      description,
    });
  });

const skills = (v: unknown): SkillGroup[] =>
  arr(v).slice(0, 20).map((o) =>
    newSkillGroup({ name: str(o.name, 80), skills: Array.isArray(o.skills) ? (o.skills as unknown[]).map((s) => str(s)).join(', ') : str(o.skills) }),
  );

const simple = (v: unknown): SimpleItem[] =>
  (Array.isArray(v) ? v : []).slice(0, 40).map((o) =>
    typeof o === 'string' ? newSimpleItem({ name: o.slice(0, 200) }) : newSimpleItem({ name: str(o?.name, 200), detail: str(o?.detail, 200) }),
  );

/** Validates and normalises untrusted resume JSON (file import or AI output) into a safe ResumeData. */
export const normalizeResumeData = (raw: unknown): ResumeData => {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const p = (o.personal && typeof o.personal === 'object' ? o.personal : {}) as Record<string, unknown>;
  const photo = str(p.photo, 2_000_000);
  return {
    personal: {
      fullName: str(p.fullName, 120),
      title: str(p.title, 160),
      email: str(p.email, 160),
      phone: str(p.phone, 60),
      location: str(p.location, 120),
      website: str(p.website, 200),
      linkedin: str(p.linkedin, 200),
      github: str(p.github, 200),
      photo: photo.startsWith('data:image/') ? photo : '',
    },
    summary: str(o.summary),
    experience: timeline(o.experience),
    education: timeline(o.education),
    projects: timeline(o.projects),
    volunteer: timeline(o.volunteer),
    skills: skills(o.skills),
    certifications: simple(o.certifications),
    awards: simple(o.awards),
    languages: simple(o.languages),
    interests: simple(o.interests),
  };
};
