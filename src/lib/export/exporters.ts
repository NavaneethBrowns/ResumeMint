import type { ResumeDoc } from '../../types/resume';
import { resumeToPlainText, slugify } from '../text';
import resumeCss from '../../styles/resume.css?raw';

export type ExportFormat = 'pdf' | 'docx' | 'png' | 'html' | 'txt' | 'json';

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export const fileBase = (doc: ResumeDoc): string => slugify(doc.data.personal.fullName || doc.name);

export const exportJson = (doc: ResumeDoc): void => {
  const payload = { app: 'resumint', version: 1, data: doc.data, layout: doc.layout, design: doc.design };
  downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${fileBase(doc)}.resumint.json`);
};

export const exportTxt = (doc: ResumeDoc): void =>
  downloadBlob(new Blob([resumeToPlainText(doc.data, doc.layout)], { type: 'text/plain;charset=utf-8' }), `${fileBase(doc)}.txt`);

const fontsLink = (): string =>
  document.querySelector<HTMLLinkElement>('link[href*="fonts.googleapis.com/css2"]')?.outerHTML ?? '';

export const exportHtml = (doc: ResumeDoc, node: HTMLElement): void => {
  const title = `${doc.data.personal.fullName || 'Resume'}`.replace(/[<>&"]/g, '');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${fontsLink()}<style>${resumeCss}
body{margin:0;background:#e9eef0;display:flex;justify-content:center;padding:32px 0}
@media print{body{background:none;padding:0}}</style></head><body>${node.outerHTML}</body></html>`;
  downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${fileBase(doc)}.html`);
};

export const exportPng = async (doc: ResumeDoc, node: HTMLElement): Promise<void> => {
  const { toBlob } = await import('html-to-image');
  await document.fonts.ready;
  const blob = await toBlob(node, { pixelRatio: 2.5, backgroundColor: '#ffffff', cacheBust: true });
  if (!blob) throw new Error('Image rendering failed.');
  downloadBlob(blob, `${fileBase(doc)}.png`);
};

/** Uses the browser's print engine so the PDF keeps real, selectable (ATS-readable) text. */
export const exportPdf = async (doc: ResumeDoc): Promise<void> => {
  await document.fonts.ready;
  const prevTitle = document.title;
  document.title = `${doc.data.personal.fullName || doc.name} - Resume`;
  const restore = () => {
    document.title = prevTitle;
    window.removeEventListener('afterprint', restore);
  };
  window.addEventListener('afterprint', restore);
  window.print();
};
