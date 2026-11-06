import type { Layout, ResumeData } from '../../types/resume';
import { SECTIONS } from '../../data/sections';
import { resumeToPlainText, splitSkills, toBullets } from '../text';
import { ACTION_VERBS, KNOWN_TERMS, STANDARD_TITLES, WEAK_PHRASES, containsTerm, extractKeywords } from './keywords';

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface AtsCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface AtsCategory {
  id: 'contact' | 'structure' | 'impact' | 'length' | 'format' | 'keywords';
  label: string;
  weight: number;
  score: number;
  checks: AtsCheck[];
}

export interface AtsReport {
  score: number;
  grade: 'Excellent' | 'Strong' | 'Fair' | 'Needs work';
  categories: AtsCategory[];
  keywords: { matched: string[]; missing: string[]; coverage: number; fromJob: boolean };
  stats: { words: number; bullets: number; quantified: number; actionLed: number };
}

export interface ScoreOptions {
  jobDescription?: string;
  /** 0–100 parse-safety of the selected template. */
  templateSafety?: number;
  hasPhoto?: boolean;
}

const STATUS_VALUE: Record<CheckStatus, number> = { pass: 1, warn: 0.5, fail: 0 };

const check = (id: string, label: string, status: CheckStatus, detail: string): AtsCheck => ({ id, label, status, detail });
const ratioStatus = (r: number, good: number, ok: number): CheckStatus => (r >= good ? 'pass' : r >= ok ? 'warn' : 'fail');
const pct = (n: number): string => `${Math.round(n * 100)}%`;

const categoryScore = (checks: AtsCheck[]): number =>
  checks.length ? Math.round((checks.reduce((s, c) => s + STATUS_VALUE[c.status], 0) / checks.length) * 100) : 100;

const category = (id: AtsCategory['id'], label: string, weight: number, checks: AtsCheck[]): AtsCategory => ({
  id, label, weight, checks, score: categoryScore(checks),
});

const NUMBER_PATTERN = /(\d+(\.\d+)?\s?(%|x|k|m|bn|cr|lakh|\+)?|\$|₹|€|£)/i;
const FIRST_PERSON = /\b(i|me|my|mine)\b/i;

const contactChecks = (data: ResumeData): AtsCheck[] => {
  const p = data.personal;
  return [
    check('name', 'Full name', p.fullName.trim().split(/\s+/).length >= 2 ? 'pass' : p.fullName ? 'warn' : 'fail', p.fullName ? 'Name is present at the top.' : 'Add your full name.'),
    check('email', 'Email address', /\S+@\S+\.\S+/.test(p.email) ? 'pass' : 'fail', p.email ? 'Valid email detected.' : 'Recruiters and ATS need an email address.'),
    check('phone', 'Phone number', p.phone.replace(/\D/g, '').length >= 8 ? 'pass' : 'fail', p.phone ? 'Phone number detected.' : 'Add a phone number with country code.'),
    check('location', 'Location', p.location ? 'pass' : 'warn', p.location ? 'Location helps location-filtered searches.' : 'Add City, Country — many ATS filter by location.'),
    check('linkedin', 'LinkedIn / portfolio', p.linkedin || p.website || p.github ? 'pass' : 'warn', p.linkedin ? 'Profile link included.' : 'Add a LinkedIn or portfolio URL.'),
    check('title', 'Headline / target title', p.title ? 'pass' : 'warn', p.title ? `Headline: “${p.title}”.` : 'A headline matching the target role boosts title matching.'),
  ];
};

const structureChecks = (data: ResumeData, layout: Layout): AtsCheck[] => {
  const shown = (id: keyof typeof SECTIONS) => !layout.hidden.includes(id);
  const nonStandard = Object.entries(layout.titles).filter(
    ([, t]) => t && !STANDARD_TITLES.includes(t.trim().toLowerCase()),
  );
  const undated = data.experience.filter((e) => !e.startDate);
  return [
    check('summary', 'Professional summary', data.summary.trim() && shown('summary') ? 'pass' : 'warn', data.summary ? 'Summary present.' : 'A 2–4 line summary gives ATS and humans quick context.'),
    check('experience', 'Work experience section', data.experience.length && shown('experience') ? 'pass' : data.projects.length ? 'warn' : 'fail', data.experience.length ? `${data.experience.length} role(s) listed.` : 'Add experience (internships and freelance count).'),
    check('education', 'Education section', data.education.length && shown('education') ? 'pass' : 'warn', data.education.length ? 'Education listed.' : 'Most ATS filters expect an education entry.'),
    check('skills', 'Skills section', data.skills.length && shown('skills') ? 'pass' : 'fail', data.skills.length ? 'Dedicated skills section found.' : 'Add a skills section — it is the #1 keyword source.'),
    check('titles', 'Standard section headings', nonStandard.length ? 'warn' : 'pass', nonStandard.length ? `Rename “${nonStandard.map(([, t]) => t).join('”, “')}” to a standard heading so parsers recognise it.` : 'Headings use names ATS parsers recognise.'),
    check('dates', 'Dates on every role', undated.length ? 'warn' : 'pass', undated.length ? `${undated.length} role(s) missing start dates.` : 'All roles have dates.'),
  ];
};

const impactChecks = (bullets: string[], data: ResumeData) => {
  const n = bullets.length || 1;
  const actionLed = bullets.filter((b) => ACTION_VERBS.has(b.split(/\s+/)[0]?.toLowerCase().replace(/[^a-z]/g, ''))).length;
  const quantified = bullets.filter((b) => NUMBER_PATTERN.test(b)).length;
  const goodLength = bullets.filter((b) => {
    const w = b.split(/\s+/).length;
    return w >= 8 && w <= 32;
  }).length;
  const weak = bullets.filter((b) => WEAK_PHRASES.some((w) => b.toLowerCase().includes(w)));
  const firstPerson = bullets.filter((b) => FIRST_PERSON.test(b)).length;
  const thinRoles = data.experience.filter((e) => toBullets(e.description).length < 2);

  const checks = [
    check('bullets', 'Achievement bullets', bullets.length >= 6 ? 'pass' : bullets.length >= 3 ? 'warn' : 'fail', `${bullets.length} bullet point(s) across experience & projects.`),
    check('verbs', 'Starts with action verbs', ratioStatus(actionLed / n, 0.7, 0.4), `${pct(actionLed / n)} of bullets start with a strong verb (aim for 70%+).`),
    check('metrics', 'Quantified results', ratioStatus(quantified / n, 0.5, 0.25), `${pct(quantified / n)} of bullets contain numbers (aim for 50%+). Add %, ₹/$, time saved, users.`),
    check('length', 'Bullet length', ratioStatus(goodLength / n, 0.75, 0.5), 'Ideal bullets are 8–32 words — one to two lines.'),
    check('weak', 'No weak phrases', weak.length ? (weak.length > 2 ? 'fail' : 'warn') : 'pass', weak.length ? `Replace passive phrases like “${WEAK_PHRASES.find((w) => weak[0].toLowerCase().includes(w))}” with outcomes.` : 'No “responsible for”-style filler found.'),
    check('pronouns', 'No first-person pronouns', firstPerson ? 'warn' : 'pass', firstPerson ? `${firstPerson} bullet(s) use I/me/my — drop them.` : 'Written in crisp resume voice.'),
    check('depth', 'Detail per role', thinRoles.length ? 'warn' : 'pass', thinRoles.length ? `${thinRoles.length} role(s) have fewer than 2 bullets.` : 'Each role has supporting bullets.'),
  ];
  return { checks, actionLed, quantified };
};

const lengthChecks = (words: number, data: ResumeData): AtsCheck[] => {
  const summaryWords = data.summary.trim() ? data.summary.trim().split(/\s+/).length : 0;
  return [
    check('words', 'Overall length', words >= 350 && words <= 900 ? 'pass' : words >= 200 && words <= 1200 ? 'warn' : 'fail', `${words} words. Sweet spot is 350–900 (1–2 pages).`),
    check('summaryLen', 'Summary length', summaryWords >= 25 && summaryWords <= 90 ? 'pass' : summaryWords ? 'warn' : 'fail', summaryWords ? `${summaryWords} words (aim for 25–90).` : 'No summary yet.'),
  ];
};

const formatChecks = (opts: ScoreOptions): AtsCheck[] => {
  const safety = opts.templateSafety ?? 90;
  return [
    check('template', 'Parser-friendly layout', safety >= 90 ? 'pass' : safety >= 78 ? 'warn' : 'fail', safety >= 90 ? 'Single-column layout parses cleanly in every ATS.' : 'Two-column layouts read fine in modern ATS, but older systems may scramble columns. Pick an “ATS Classic” template for strict portals.'),
    check('photo', 'No photo (US/UK/IN corporate norms)', opts.hasPhoto ? 'warn' : 'pass', opts.hasPhoto ? 'Photos are ignored by ATS and discouraged in US/UK applications.' : 'No photo — ideal for ATS.'),
    check('text', 'Selectable text export', 'pass', 'PDF/DOCX exports keep real text, not images.'),
  ];
};

const keywordCategory = (text: string, data: ResumeData, jd?: string) => {
  const lower = text.toLowerCase();
  if (jd && jd.trim().length > 40) {
    const kws = extractKeywords(jd);
    const matched = kws.filter((k) => containsTerm(lower, k));
    const missing = kws.filter((k) => !matched.includes(k));
    const coverage = kws.length ? matched.length / kws.length : 0;
    const titleHit = data.personal.title && jd.toLowerCase().includes(data.personal.title.toLowerCase());
    const checks = [
      check('coverage', 'Job keyword coverage', ratioStatus(coverage, 0.65, 0.4), `${matched.length}/${kws.length} job keywords found (${pct(coverage)}). Aim for 65%+.`),
      check('missing', 'Critical gaps', missing.length <= 3 ? 'pass' : missing.length <= 8 ? 'warn' : 'fail', missing.length ? `Consider adding (honestly): ${missing.slice(0, 6).join(', ')}.` : 'No important gaps.'),
      check('jobtitle', 'Title alignment', titleHit ? 'pass' : 'warn', titleHit ? 'Your headline appears in the job description.' : 'Mirror the job title in your headline if it fits.'),
    ];
    return { checks, keywords: { matched, missing, coverage, fromJob: true } };
  }
  const skills = data.skills.flatMap((g) => splitSkills(g.skills));
  const known = KNOWN_TERMS.filter((t) => containsTerm(lower, t));
  const body = [data.summary, ...data.experience.map((e) => e.description)].join(' ').toLowerCase();
  const evidenced = skills.filter((s) => containsTerm(body, s));
  const checks = [
    check('skillcount', 'Skill keywords', skills.length >= 10 ? 'pass' : skills.length >= 5 ? 'warn' : 'fail', `${skills.length} skills listed (aim for 10–25).`),
    check('evidence', 'Skills backed by experience', ratioStatus(skills.length ? evidenced.length / skills.length : 0, 0.4, 0.2), 'Mention your key skills inside experience bullets, not only in the skills list.'),
    check('jd', 'Tailored to a job', 'warn', 'Paste a job description to get a precise keyword match score.'),
  ];
  return { checks, keywords: { matched: known, missing: [], coverage: 0, fromJob: false } };
};

const gradeFor = (score: number): AtsReport['grade'] =>
  score >= 85 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 50 ? 'Fair' : 'Needs work';

/** Deterministic, offline ATS scoring modelled on common ATS parsing and recruiter screening heuristics. */
export const scoreResume = (data: ResumeData, layout: Layout, opts: ScoreOptions = {}): AtsReport => {
  const text = resumeToPlainText(data, layout);
  const words = text.split(/\s+/).filter(Boolean).length;
  const bullets = [...data.experience, ...data.projects].flatMap((e) => toBullets(e.description));
  const impact = impactChecks(bullets, data);
  const kw = keywordCategory(text, data, opts.jobDescription);
  const withJob = kw.keywords.fromJob;

  const categories: AtsCategory[] = [
    category('keywords', 'Keyword match', withJob ? 30 : 15, kw.checks),
    category('impact', 'Impact & content', withJob ? 25 : 30, impact.checks),
    category('structure', 'Sections & structure', 15, structureChecks(data, layout)),
    category('contact', 'Contact details', 10, contactChecks(data)),
    category('length', 'Length & readability', 10, lengthChecks(words, data)),
    category('format', 'ATS formatting', withJob ? 10 : 20, formatChecks(opts)),
  ];
  const totalWeight = categories.reduce((s, c) => s + c.weight, 0);
  const score = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / totalWeight);

  return {
    score,
    grade: gradeFor(score),
    categories,
    keywords: kw.keywords,
    stats: { words, bullets: bullets.length, quantified: impact.quantified, actionLed: impact.actionLed },
  };
};
