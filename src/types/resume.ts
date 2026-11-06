export type SectionId =
  | 'summary'
  | 'experience'
  | 'education'
  | 'projects'
  | 'skills'
  | 'certifications'
  | 'awards'
  | 'languages'
  | 'interests'
  | 'volunteer';

export type TimelineSectionId = 'experience' | 'education' | 'projects' | 'volunteer';
export type SimpleSectionId = 'certifications' | 'awards' | 'languages' | 'interests';

export interface Personal {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  photo: string;
}

/** Experience, education, projects, volunteering. `description` holds one bullet per line. */
export interface TimelineItem {
  id: string;
  title: string;
  organization: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  link: string;
  description: string;
}

export interface SkillGroup {
  id: string;
  name: string;
  skills: string;
}

export interface SimpleItem {
  id: string;
  name: string;
  detail: string;
}

export interface ResumeData {
  personal: Personal;
  summary: string;
  experience: TimelineItem[];
  education: TimelineItem[];
  projects: TimelineItem[];
  volunteer: TimelineItem[];
  skills: SkillGroup[];
  certifications: SimpleItem[];
  awards: SimpleItem[];
  languages: SimpleItem[];
  interests: SimpleItem[];
}

export interface Layout {
  order: SectionId[];
  sidebar: SectionId[];
  hidden: SectionId[];
  titles: Partial<Record<SectionId, string>>;
}

export type PaperSize = 'A4' | 'Letter';

export interface Design {
  templateId: string;
  accent: string;
  fontFamily: string;
  fontScale: number;
  lineHeight: number;
  margin: number;
  sectionGap: number;
  showPhoto: boolean;
  showIcons: boolean;
  paper: PaperSize;
}

/** Set on resumes tailored to a specific job posting. */
export interface JobTargetMeta {
  company: string;
  position: string;
  /** The resume it was tailored from, so the user can tailor that original again for another job. */
  baseId?: string;
  createdAt: number;
}

export interface ResumeDoc {
  id: string;
  name: string;
  updatedAt: number;
  data: ResumeData;
  layout: Layout;
  design: Design;
  target?: JobTargetMeta;
}

export type LayoutKind = 'single' | 'sidebar-left' | 'sidebar-right';
export type HeaderStyle = 'left' | 'centered' | 'banner' | 'split' | 'sidebar';
export type HeadingStyle = 'underline' | 'bar' | 'caps' | 'pill' | 'side' | 'boxed' | 'dot';
export type SidebarTone = 'tint' | 'dark' | 'accent' | 'plain';
export type SkillStyle = 'tags' | 'inline' | 'dots';

export interface TemplateDef {
  id: string;
  name: string;
  tagline: string;
  category: 'ATS Classic' | 'Modern' | 'Creative' | 'Executive';
  /** Rough parse-safety rating used by the ATS score (single column, no graphics = higher). */
  atsSafety: number;
  layout: LayoutKind;
  header: HeaderStyle;
  heading: HeadingStyle;
  sidebarTone: SidebarTone;
  skills: SkillStyle;
  timeline?: boolean;
  accent: string;
  font: string;
  defaultSidebar: SectionId[];
}
