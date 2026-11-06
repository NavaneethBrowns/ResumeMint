import type { TemplateDef } from '../types/resume';

const SIDE_DEFAULT: TemplateDef['defaultSidebar'] = ['skills', 'languages', 'certifications', 'interests', 'awards'];

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'aurora', name: 'Aurora', tagline: 'Gradient sidebar, calm and confident', category: 'Modern',
    atsSafety: 78, layout: 'sidebar-left', header: 'sidebar', heading: 'caps', sidebarTone: 'accent',
    skills: 'tags', accent: '#0f9f7a', font: 'DM Sans', defaultSidebar: SIDE_DEFAULT,
  },
  {
    id: 'harvard', name: 'Harvard', tagline: 'The timeless academic classic', category: 'ATS Classic',
    atsSafety: 98, layout: 'single', header: 'centered', heading: 'underline', sidebarTone: 'plain',
    skills: 'inline', accent: '#1f2937', font: 'EB Garamond', defaultSidebar: [],
  },
  {
    id: 'minimal', name: 'Minimal', tagline: 'Quiet whitespace, sharp typography', category: 'ATS Classic',
    atsSafety: 97, layout: 'single', header: 'left', heading: 'caps', sidebarTone: 'plain',
    skills: 'inline', accent: '#111827', font: 'Inter', defaultSidebar: [],
  },
  {
    id: 'executive', name: 'Executive', tagline: 'Boardroom-ready banner header', category: 'Executive',
    atsSafety: 90, layout: 'single', header: 'banner', heading: 'bar', sidebarTone: 'plain',
    skills: 'inline', accent: '#1e3a5f', font: 'Source Serif 4', defaultSidebar: [],
  },
  {
    id: 'metro', name: 'Metro', tagline: 'Right rail with bold pill headings', category: 'Modern',
    atsSafety: 80, layout: 'sidebar-right', header: 'left', heading: 'pill', sidebarTone: 'tint',
    skills: 'tags', accent: '#7c3aed', font: 'Poppins', defaultSidebar: SIDE_DEFAULT,
  },
  {
    id: 'nordic', name: 'Nordic', tagline: 'Soft tinted column, Scandinavian calm', category: 'Modern',
    atsSafety: 82, layout: 'sidebar-left', header: 'split', heading: 'dot', sidebarTone: 'tint',
    skills: 'dots', accent: '#0f766e', font: 'Lato', defaultSidebar: SIDE_DEFAULT,
  },
  {
    id: 'silicon', name: 'Silicon', tagline: 'Built for engineers and product folks', category: 'ATS Classic',
    atsSafety: 95, layout: 'single', header: 'split', heading: 'side', sidebarTone: 'plain',
    skills: 'inline', accent: '#2563eb', font: 'IBM Plex Sans', defaultSidebar: [],
  },
  {
    id: 'elegant', name: 'Elegant', tagline: 'Serif grace with a golden accent', category: 'Executive',
    atsSafety: 93, layout: 'single', header: 'centered', heading: 'boxed', sidebarTone: 'plain',
    skills: 'inline', accent: '#a16207', font: 'Lora', defaultSidebar: [],
  },
  {
    id: 'bold', name: 'Bold', tagline: 'High-contrast statement piece', category: 'Creative',
    atsSafety: 84, layout: 'single', header: 'banner', heading: 'boxed', sidebarTone: 'plain',
    skills: 'tags', accent: '#e11d48', font: 'Montserrat', defaultSidebar: [],
  },
  {
    id: 'timeline', name: 'Timeline', tagline: 'Your career as a visual journey', category: 'Creative',
    atsSafety: 86, layout: 'single', header: 'left', heading: 'bar', sidebarTone: 'plain',
    skills: 'tags', timeline: true, accent: '#0891b2', font: 'Roboto', defaultSidebar: [],
  },
  {
    id: 'compact', name: 'Compact', tagline: 'Dense one-pager for senior profiles', category: 'ATS Classic',
    atsSafety: 96, layout: 'single', header: 'split', heading: 'underline', sidebarTone: 'plain',
    skills: 'inline', accent: '#334155', font: 'Roboto', defaultSidebar: [],
  },
  {
    id: 'horizon', name: 'Horizon', tagline: 'Warm banner over a tinted rail', category: 'Creative',
    atsSafety: 76, layout: 'sidebar-left', header: 'banner', heading: 'caps', sidebarTone: 'tint',
    skills: 'dots', accent: '#ea580c', font: 'Montserrat', defaultSidebar: SIDE_DEFAULT,
  },
  {
    id: 'monarch', name: 'Monarch', tagline: 'Stately serif with a quiet right column', category: 'Executive',
    atsSafety: 85, layout: 'sidebar-right', header: 'centered', heading: 'underline', sidebarTone: 'plain',
    skills: 'inline', accent: '#4338ca', font: 'Merriweather', defaultSidebar: SIDE_DEFAULT,
  },
];

export const getTemplate = (id: string): TemplateDef => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

export const FONTS: { name: string; stack: string; kind: 'Sans' | 'Serif' }[] = [
  { name: 'Inter', stack: "'Inter', system-ui, sans-serif", kind: 'Sans' },
  { name: 'DM Sans', stack: "'DM Sans', system-ui, sans-serif", kind: 'Sans' },
  { name: 'Lato', stack: "'Lato', system-ui, sans-serif", kind: 'Sans' },
  { name: 'Roboto', stack: "'Roboto', system-ui, sans-serif", kind: 'Sans' },
  { name: 'Poppins', stack: "'Poppins', system-ui, sans-serif", kind: 'Sans' },
  { name: 'Montserrat', stack: "'Montserrat', system-ui, sans-serif", kind: 'Sans' },
  { name: 'IBM Plex Sans', stack: "'IBM Plex Sans', system-ui, sans-serif", kind: 'Sans' },
  { name: 'Merriweather', stack: "'Merriweather', Georgia, serif", kind: 'Serif' },
  { name: 'Source Serif 4', stack: "'Source Serif 4', Georgia, serif", kind: 'Serif' },
  { name: 'Lora', stack: "'Lora', Georgia, serif", kind: 'Serif' },
  { name: 'EB Garamond', stack: "'EB Garamond', Garamond, serif", kind: 'Serif' },
  { name: 'Playfair Display', stack: "'Playfair Display', Georgia, serif", kind: 'Serif' },
];

export const fontStack = (name: string): string => FONTS.find((f) => f.name === name)?.stack ?? FONTS[0].stack;

export const ACCENTS = ['#0f9f7a', '#0f766e', '#0891b2', '#2563eb', '#4338ca', '#7c3aed', '#db2777', '#e11d48', '#ea580c', '#a16207', '#1e3a5f', '#111827'];
