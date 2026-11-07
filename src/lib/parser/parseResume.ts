import type { ResumeData, SectionId, SimpleItem, SkillGroup, TimelineItem, TimelineSectionId } from '../../types/resume';
import { emptyResume, newSimpleItem, newSkillGroup, newTimelineItem } from '../../data/sections';

const HEADINGS: Record<string, SectionId> = {
  summary: 'summary', profile: 'summary', 'professional summary': 'summary', 'career summary': 'summary', objective: 'summary',
  'career objective': 'summary', about: 'summary', 'about me': 'summary', 'professional profile': 'summary', overview: 'summary',
  experience: 'experience', 'work experience': 'experience', 'professional experience': 'experience', employment: 'experience',
  'employment history': 'experience', 'work history': 'experience', 'career history': 'experience', 'relevant experience': 'experience',
  internships: 'experience', internship: 'experience',
  education: 'education', 'academic background': 'education', academics: 'education', qualifications: 'education',
  'educational qualifications': 'education', 'academic qualifications': 'education',
  projects: 'projects', 'personal projects': 'projects', 'academic projects': 'projects', 'key projects': 'projects', portfolio: 'projects',
  skills: 'skills', 'technical skills': 'skills', 'key skills': 'skills', 'core skills': 'skills', 'core competencies': 'skills',
  competencies: 'skills', expertise: 'skills', 'areas of expertise': 'skills', technologies: 'skills', 'tools & technologies': 'skills',
  'tools and technologies': 'skills', 'skills & tools': 'skills', 'skills and tools': 'skills',
  certifications: 'certifications', certificates: 'certifications', 'licenses & certifications': 'certifications',
  'licenses and certifications': 'certifications', courses: 'certifications', training: 'certifications',
  awards: 'awards', honors: 'awards', 'honors & awards': 'awards', 'awards & honors': 'awards', achievements: 'awards',
  accomplishments: 'awards', 'awards and achievements': 'awards',
  languages: 'languages', 'language skills': 'languages',
  interests: 'interests', hobbies: 'interests', 'hobbies & interests': 'interests', 'interests & hobbies': 'interests',
  volunteering: 'volunteer', volunteer: 'volunteer', 'volunteer experience': 'volunteer', 'community involvement': 'volunteer',
  'extracurricular activities': 'volunteer', 'leadership & activities': 'volunteer',
};

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_TOKEN = `(?:${MONTH}\\s*'?\\d{2,4}|\\d{1,2}[/.-]\\d{2,4}|\\d{4}|present|current|now|till date|ongoing)`;
const DATE_RANGE = new RegExp(`(${DATE_TOKEN})\\s*(?:-|–|—|to|until|~)\\s*(${DATE_TOKEN})`, 'i');
const SINGLE_DATE = new RegExp(`(?:^|\\s|\\(|,)(${MONTH}\\s*'?\\d{2,4}|(?:19|20)\\d{2})(?=$|\\s|\\)|,)`, 'i');
const BULLET = /^\s*(?:[-*•▪◦●–—>]|\d+[.)])\s+/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,5}\)?[\s-]?)?\d{3,5}[\s-]?\d{3,5}/;
const URL = /(?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/[\w\-./?%&=#]*)?/gi;
const DEGREE = /\b(b\.?\s?tech|m\.?\s?tech|b\.?e\b|m\.?e\b|b\.?sc?|m\.?sc?|b\.?a\b|m\.?a\b|bachelor|master|mba|bba|bca|mca|ph\.?d|diploma|associate|degree|high school|hsc|ssc|class (?:x|xii|10|12)|cbse|icse)/i;
const PRESENT = /^(present|current|now|till date|ongoing)$/i;
/** "Technologies Used:", "Tech stack:", "Tools:" etc. — a labelled line that belongs to the current entry, not a new one. */
const TECH_LABEL = /^(?:technolog(?:y|ies)|tech\s*stack|tools?|environment|frameworks?|platforms?|skills?\s+used|languages?\s+used)\b[^:\n]{0,24}:/i;

const normaliseHeading = (line: string): string =>
  line
    .replace(/\([^)]*\)/g, ' ') // drop parentheticals like "(4+ years)" or "(relevant)"
    .replace(/[|–—-]\s*\d[\d+.\s]*(?:years?|yrs?)?\s*$/i, ' ') // trailing "- 5 years" / "| 2024"
    .replace(/\b\d[\d+.]*\s*\+?\s*(?:years?|yrs?)\b/gi, ' ') // "4+ years" anywhere
    .toLowerCase()
    .replace(/[:|_•·]+$/, '')
    .replace(/[^a-z&\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const detectHeading = (line: string): SectionId | null => {
  if (line.length > 48 || BULLET.test(line)) return null;
  return HEADINGS[normaliseHeading(line)] ?? null;
};

const titleCase = (s: string): string => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
const tidyDate = (d: string): string => (PRESENT.test(d.trim()) ? 'Present' : titleCase(d.trim().replace(/\.$/, '')));

const extractContacts = (text: string, data: ResumeData) => {
  const p = data.personal;
  p.email = text.match(EMAIL)?.[0] ?? '';
  const urls = (text.match(URL) ?? []).filter((u) => !u.includes('@') && !EMAIL.test(u) && /[a-z]/i.test(u));
  p.linkedin = urls.find((u) => /linkedin\.com/i.test(u))?.replace(/^https?:\/\/(www\.)?/i, '') ?? '';
  p.github = urls.find((u) => /github\.com/i.test(u))?.replace(/^https?:\/\/(www\.)?/i, '') ?? '';
  p.website =
    urls
      .find((u) => !/linkedin|github|gmail|yahoo|outlook|hotmail/i.test(u) && /\.(com|dev|io|me|in|net|org|co|app|xyz|site)\b/i.test(u))
      ?.replace(/^https?:\/\/(www\.)?/i, '') ?? '';
  const phoneLine = text.split('\n').slice(0, 15).join(' ').replace(EMAIL, ' ');
  const phone = phoneLine.match(PHONE)?.[0]?.trim() ?? '';
  p.phone = phone.replace(/\D/g, '').length >= 8 ? phone : '';
};

/** Header lines: everything above the first recognised section heading. */
const parseHeader = (lines: string[], data: ResumeData) => {
  const p = data.personal;
  const isContact = (l: string) => EMAIL.test(l) || /linkedin|github|https?:/i.test(l) || (PHONE.test(l) && l.replace(/\D/g, '').length >= 8);
  const nameLine = lines.find((l) => !isContact(l) && l.split(/\s+/).length <= 5 && /^[\p{L} .'-]+$/u.test(l));
  if (nameLine) p.fullName = /^[A-Z\s.'-]+$/.test(nameLine) ? titleCase(nameLine) : nameLine;
  const rest = lines.filter((l) => l !== nameLine);
  const title = rest.find((l) => !isContact(l) && l.split(/\s+/).length <= 8 && !/,\s*[A-Z]/.test(l));
  if (title) p.title = title.replace(/\s*[|•·]\s*$/, '');
  for (const l of rest) {
    for (const part of l.split(/\s*[|•·]\s*|\s{2,}/)) {
      if (!p.location && /^[\p{L} .'-]+,\s*[\p{L} .'-]+$/u.test(part) && part.length < 40 && part !== p.title) p.location = part.trim();
    }
  }
  const summaryLines = rest.filter((l) => l !== title && !isContact(l) && l.split(/\s+/).length > 12);
  if (summaryLines.length) data.summary = summaryLines.join(' ');
};

const splitHeaderParts = (line: string): string[] =>
  line
    .split(/\s*(?:\||•|·|\s[–—-]\s|,\s(?=[A-Z])|\sat\s|\t)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

const isBulletLine = (l: string): boolean => BULLET.test(l) || l.split(/\s+/).length > 14;

const parseTimeline = (lines: string[], section: TimelineSectionId): TimelineItem[] => {
  const items: TimelineItem[] = [];
  let cur = null as TimelineItem | null;
  let headerCount = 0;

  const start = () => {
    cur = newTimelineItem();
    items.push(cur);
    headerCount = 0;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (isBulletLine(line)) {
      if (!cur) start();
      const text = line.replace(BULLET, '');
      cur!.description = cur!.description ? `${cur!.description}\n${text}` : text;
      continue;
    }
    if (cur && TECH_LABEL.test(line)) {
      cur.description = cur.description ? `${cur.description}\n${line}` : line;
      continue;
    }
    const range = line.match(DATE_RANGE);
    const single = range ? null : line.match(SINGLE_DATE);
    const hasDate = Boolean(range || single);

    // Continuation of body text, not a new job. PDF/Doc extraction frequently wraps a
    // single bullet across several physical lines (e.g. "…approval" / "chains, cutting…").
    // Once the current entry already has a header (title or organization), a dateless line
    // that reads like prose belongs to the description — never a brand-new timeline entry.
    if (cur && (cur.title || cur.organization) && !hasDate) {
      const startsLower = /^[\p{Ll}]/u.test(line);
      const endsSentence = /[.?!,;:]$/.test(line);
      const wordCount = line.split(/\s+/).length;
      if (startsLower || endsSentence || wordCount > 8) {
        // A lowercase start means the previous line wrapped — stitch it back together.
        if (startsLower && cur.description) cur.description += ` ${line}`;
        else cur.description = cur.description ? `${cur.description}\n${line}` : line;
        continue;
      }
    }

    const c = cur as TimelineItem | null;
    const needsNew = !c || Boolean(c.description) || (headerCount >= 2 && hasDate && Boolean(c.startDate)) || headerCount >= 3;
    if (needsNew) start();
    const item = cur!;
    let rest = line;
    if (range) {
      item.startDate = tidyDate(range[1]);
      const end = tidyDate(range[2]);
      if (end === 'Present') item.current = true;
      else item.endDate = end;
      rest = line.replace(range[0], ' ');
    } else if (single && !item.startDate) {
      item.startDate = tidyDate(single[1]);
      rest = line.replace(single[1], ' ');
    }
    rest = rest.replace(/[()]/g, ' ').replace(/\s*[|,–—-]\s*$/, '').replace(/^\s*[|,–—-]\s*/, '').trim();
    if (!rest) continue;
    headerCount++;
    const parts = splitHeaderParts(rest);
    for (const part of parts) {
      if (/^https?:|github\.com|\.\w{2,3}\//i.test(part) && !item.link) item.link = part;
      else if (section === 'education' && DEGREE.test(part) && !item.title) item.title = part;
      else if (!item.title && !(section === 'education' && /universit|college|institute|school|academy/i.test(part))) item.title = part;
      else if (!item.organization) item.organization = part;
      else if (!item.location) item.location = part;
    }
  }
  return items.filter((i) => i.title || i.organization || i.description);
};

const parseSkills = (lines: string[]): SkillGroup[] => {
  const groups: SkillGroup[] = [];
  const loose: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(BULLET, '').trim();
    if (!line) continue;
    const m = line.match(/^([^:]{2,30}):\s*(.+)$/);
    if (m) groups.push(newSkillGroup({ name: m[1].trim(), skills: m[2].split(/\s*[,;|•·]\s*/).filter(Boolean).join(', ') }));
    else loose.push(...line.split(/\s*[,;|•·]\s*|\s{2,}/).filter(Boolean));
  }
  if (loose.length) groups.push(newSkillGroup({ name: groups.length ? 'Other' : '', skills: loose.join(', ') }));
  return groups;
};

const parseSimple = (lines: string[]): SimpleItem[] =>
  lines
    .flatMap((raw) => {
      const line = raw.replace(BULLET, '').trim();
      // Comma lists of single words (e.g. "Chess, Running, Music") become separate items.
      return line.includes(',') && line.split(',').every((p) => p.trim().split(/\s+/).length <= 3) && !/\d{4}/.test(line)
        ? line.split(',')
        : [line];
    })
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(.+?)\s*(?:\s[–—-]\s|:|\(|\|)\s*(.+?)\)?$/);
      return m ? newSimpleItem({ name: m[1].trim(), detail: m[2].trim() }) : newSimpleItem({ name: line });
    });

/** Heuristic parser that turns extracted resume text into structured data. Works offline; AI parsing is optional. */
export const parseResumeText = (text: string): ResumeData => {
  const data = emptyResume();
  const clean = text.replace(/\r/g, '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ');
  const lines = clean.split('\n').map((l) => l.trim());
  extractContacts(clean, data);

  const buckets = new Map<SectionId, string[]>();
  const header: string[] = [];
  let current: SectionId | null = null;
  for (const line of lines) {
    const heading = detectHeading(line);
    if (heading) {
      current = heading;
      if (!buckets.has(heading)) buckets.set(heading, []);
      continue;
    }
    if (!line) continue;
    if (current) buckets.get(current)!.push(line);
    else header.push(line);
  }

  parseHeader(header, data);
  for (const [id, body] of buckets) {
    if (id === 'summary') data.summary = body.join(' ').replace(/\s+/g, ' ').trim();
    else if (id === 'skills') data.skills = parseSkills(body);
    else if (id === 'experience' || id === 'education' || id === 'projects' || id === 'volunteer') data[id] = parseTimeline(body, id);
    else data[id] = parseSimple(body);
  }
  return data;
};
