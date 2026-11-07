import type {
  Design,
  Layout,
  Personal,
  ResumeData,
  SectionId,
  SimpleItem,
  SimpleSectionId,
  SkillGroup,
  TimelineItem,
  TimelineSectionId,
} from '../types/resume';
import { getTemplate } from './templates';

export type SectionKind = 'text' | 'timeline' | 'skills' | 'simple';

export interface SectionMeta {
  id: SectionId;
  label: string;
  kind: SectionKind;
  /** Field labels used by the editor for timeline/simple sections. */
  fields?: { title: string; organization?: string; detail?: string };
}

export const SECTIONS: Record<SectionId, SectionMeta> = {
  summary: { id: 'summary', label: 'Summary', kind: 'text' },
  experience: { id: 'experience', label: 'Experience', kind: 'timeline', fields: { title: 'Job title', organization: 'Company' } },
  education: { id: 'education', label: 'Education', kind: 'timeline', fields: { title: 'Degree', organization: 'School / University' } },
  projects: { id: 'projects', label: 'Projects', kind: 'timeline', fields: { title: 'Project name', organization: 'Role / Tech stack' } },
  volunteer: { id: 'volunteer', label: 'Volunteering', kind: 'timeline', fields: { title: 'Role', organization: 'Organisation' } },
  skills: { id: 'skills', label: 'Skills', kind: 'skills' },
  certifications: { id: 'certifications', label: 'Certifications', kind: 'simple', fields: { title: 'Certification', detail: 'Issuer & year' } },
  awards: { id: 'awards', label: 'Awards', kind: 'simple', fields: { title: 'Award', detail: 'Issuer & year' } },
  languages: { id: 'languages', label: 'Languages', kind: 'simple', fields: { title: 'Language', detail: 'Proficiency' } },
  interests: { id: 'interests', label: 'Interests', kind: 'simple', fields: { title: 'Interest', detail: 'Detail (optional)' } },
};

export const DEFAULT_ORDER: SectionId[] = [
  'summary', 'experience', 'projects', 'education', 'skills', 'certifications', 'awards', 'volunteer', 'languages', 'interests',
];

export const isTimeline = (id: SectionId): id is TimelineSectionId => SECTIONS[id].kind === 'timeline';
export const isSimple = (id: SectionId): id is SimpleSectionId => SECTIONS[id].kind === 'simple';

export const uid = (): string =>
  globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Math.random().toString(36).slice(2, 10);

export const emptyPersonal = (): Personal => ({
  fullName: '', title: '', email: '', phone: '', location: '', website: '', linkedin: '', github: '', photo: '',
});

export const newTimelineItem = (patch: Partial<TimelineItem> = {}): TimelineItem => ({
  id: uid(), title: '', organization: '', location: '', startDate: '', endDate: '', current: false, link: '', description: '', ...patch,
});

export const newSkillGroup = (patch: Partial<SkillGroup> = {}): SkillGroup => ({ id: uid(), name: '', skills: '', ...patch });
export const newSimpleItem = (patch: Partial<SimpleItem> = {}): SimpleItem => ({ id: uid(), name: '', detail: '', ...patch });

export const emptyResume = (): ResumeData => ({
  personal: emptyPersonal(),
  summary: '',
  experience: [],
  education: [],
  projects: [],
  volunteer: [],
  skills: [],
  certifications: [],
  awards: [],
  languages: [],
  interests: [],
});

export const defaultLayout = (templateId = 'aurora'): Layout => ({
  order: [...DEFAULT_ORDER],
  sidebar: [...getTemplate(templateId).defaultSidebar],
  hidden: [],
  titles: {},
});

export const designForTemplate = (templateId: string, prev?: Partial<Design>): Design => {
  const t = getTemplate(templateId);
  return {
    fontScale: 1,
    lineHeight: 1.45,
    margin: 16,
    sectionGap: 14,
    showPhoto: true,
    showIcons: true,
    paper: 'A4',
    textAlign: 'left',
    ...prev,
    templateId: t.id,
    accent: t.accent,
    fontFamily: t.font,
  };
};

export const sampleResume = (): ResumeData => ({
  personal: {
    fullName: 'Aarav Mehta',
    title: 'Senior Product Engineer',
    email: 'aarav.mehta@email.com',
    phone: '+91 98765 43210',
    location: 'Bengaluru, India',
    website: 'aaravmehta.dev',
    linkedin: 'linkedin.com/in/aaravmehta',
    github: 'github.com/aaravm',
    photo: '',
  },
  summary:
    'Product-minded full-stack engineer with 7+ years building high-traffic web platforms. Led teams of 6 to ship payment and onboarding flows used by 4M+ users, cutting checkout drop-off by 18%. Passionate about design systems, performance and mentoring.',
  experience: [
    newTimelineItem({
      title: 'Senior Product Engineer', organization: 'Razorleaf Fintech', location: 'Bengaluru', startDate: 'Mar 2021', current: true,
      description:
        'Led a 6-engineer squad to rebuild checkout in React + TypeScript, lifting conversion by 18% across 4M monthly users\nDesigned an event-driven ledger on Node.js and Kafka processing 1.2M transactions/day at 99.99% uptime\nIntroduced a shared design system adopted by 9 teams, reducing UI build time by 35%\nMentored 5 engineers; 3 promoted within 18 months',
    }),
    newTimelineItem({
      title: 'Software Engineer II', organization: 'CloudNest', location: 'Pune', startDate: 'Jul 2018', endDate: 'Feb 2021',
      description:
        'Built multi-tenant analytics dashboards with Angular and D3 used by 300+ enterprise clients\nCut AWS spend by 27% by migrating batch jobs to serverless Lambda pipelines\nAutomated CI/CD with GitHub Actions, reducing release time from 2 days to 40 minutes',
    }),
  ],
  education: [
    newTimelineItem({
      title: 'B.Tech, Computer Science', organization: 'National Institute of Technology, Trichy', location: 'Tiruchirappalli', startDate: '2014', endDate: '2018',
      description: 'CGPA 8.7/10 · Department rank 4',
    }),
  ],
  projects: [
    newTimelineItem({
      title: 'OpenInvoice', organization: 'Open-source · TypeScript, Next.js', link: 'github.com/aaravm/openinvoice', startDate: '2023',
      description: 'GST-ready invoicing tool with 2.1k GitHub stars and 40+ contributors',
    }),
  ],
  volunteer: [],
  skills: [
    newSkillGroup({ name: 'Languages', skills: 'TypeScript, JavaScript, Python, SQL, Go' }),
    newSkillGroup({ name: 'Frameworks', skills: 'React, Next.js, Angular, Node.js, Express' }),
    newSkillGroup({ name: 'Cloud & Data', skills: 'AWS, Docker, Kubernetes, PostgreSQL, Kafka, Redis' }),
  ],
  certifications: [newSimpleItem({ name: 'AWS Certified Solutions Architect', detail: 'Amazon · 2022' })],
  awards: [newSimpleItem({ name: 'Engineering Excellence Award', detail: 'Razorleaf · 2023' })],
  languages: [newSimpleItem({ name: 'English', detail: 'Fluent' }), newSimpleItem({ name: 'Hindi', detail: 'Native' })],
  interests: [newSimpleItem({ name: 'Trail running' }), newSimpleItem({ name: 'Mentoring' }), newSimpleItem({ name: 'Chess' })],
});
