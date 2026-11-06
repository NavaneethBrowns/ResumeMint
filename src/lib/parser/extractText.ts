const MAX_FILE_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_RESUME_TYPES = '.pdf,.docx,.txt,.md,.json';

interface PdfTextItem {
  str: string;
  transform: number[];
  width: number;
}

/** Rebuilds visual lines from PDF text items by grouping on baseline (y) and ordering by x. */
const pdfItemsToLines = (items: PdfTextItem[]): string[] => {
  const rows: { y: number; parts: { x: number; w: number; s: string }[] }[] = [];
  for (const it of items) {
    if (!it.str?.trim()) continue;
    const x = it.transform[4];
    const y = it.transform[5];
    let row = rows.find((r) => Math.abs(r.y - y) < 3);
    if (!row) {
      row = { y, parts: [] };
      rows.push(row);
    }
    row.parts.push({ x, w: it.width, s: it.str });
  }
  rows.sort((a, b) => b.y - a.y);
  const lines: string[] = [];
  let prevY: number | null = null;
  for (const row of rows) {
    row.parts.sort((a, b) => a.x - b.x);
    let line = '';
    let end = -Infinity;
    for (const p of row.parts) {
      const gap = p.x - end;
      line += line && gap > 1 ? (gap > 25 ? ' | ' : ' ') : '';
      line += p.s;
      end = p.x + p.w;
    }
    // A big vertical gap usually separates blocks; keep a blank line so the parser sees it.
    if (prevY !== null && prevY - row.y > 24) lines.push('');
    lines.push(line.trim());
    prevY = row.y;
  }
  return lines;
};

const extractPdf = async (buf: ArrayBuffer): Promise<string> => {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(pdfItemsToLines(content.items as PdfTextItem[]).join('\n'));
  }
  await doc.destroy();
  return pages.join('\n');
};

const extractDocx = async (buf: ArrayBuffer): Promise<string> => {
  const mammoth = (await import('mammoth/mammoth.browser.js')).default;
  const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
  return value;
};

export class ResumeFileError extends Error {}

/** Extracts raw text from a resume file. JSON files (our own export) are returned verbatim. */
export const extractResumeText = async (file: File): Promise<{ text: string; kind: 'pdf' | 'docx' | 'text' | 'json' }> => {
  if (file.size > MAX_FILE_BYTES) throw new ResumeFileError('File is larger than 10 MB.');
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith('.pdf') || file.type === 'application/pdf') return { text: await extractPdf(await file.arrayBuffer()), kind: 'pdf' };
    if (name.endsWith('.docx')) return { text: await extractDocx(await file.arrayBuffer()), kind: 'docx' };
    if (name.endsWith('.json')) return { text: await file.text(), kind: 'json' };
    if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) return { text: await file.text(), kind: 'text' };
  } catch (err) {
    console.error('[resume-import] extraction failed', err);
    throw new ResumeFileError('Could not read this file. If it is a scanned PDF, try exporting it as text-based PDF or DOCX.');
  }
  throw new ResumeFileError('Unsupported file. Use PDF, DOCX, TXT or a Resumint JSON export.');
};
