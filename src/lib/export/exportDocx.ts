import type { ResumeDoc } from '../../types/resume';
import { isSimple, isTimeline } from '../../data/sections';
import { contactEntries, dateRange, sectionTitle, toBullets, visibleSections } from '../text';
import { downloadBlob, fileBase } from './exporters';

const MM_TO_TWIP = 56.7;
const PAGE = { A4: { width: 11906, height: 16838 }, Letter: { width: 12240, height: 15840 } } as const;

/** Builds a clean single-column DOCX — the format most ATS portals parse best. */
export const exportDocx = async (doc: ResumeDoc): Promise<void> => {
  const { Document, Packer, Paragraph, TextRun, TabStopType, BorderStyle, ExternalHyperlink } = await import('docx');
  const { data, layout, design } = doc;
  const accent = design.accent.replace('#', '');
  const font = design.fontFamily;
  const base = Math.round(21 * design.fontScale); // half-points (10.5pt)
  const page = PAGE[design.paper];
  const margin = Math.round(design.margin * MM_TO_TWIP);
  const contentWidth = page.width - margin * 2;
  const p = data.personal;

  const heading = (text: string) =>
    new Paragraph({
      spacing: { before: 240, after: 80 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: accent, space: 2 } },
      children: [new TextRun({ text: text.toUpperCase(), bold: true, color: accent, size: base + 3, characterSpacing: 20 })],
    });

  const bullet = (text: string) =>
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 40 }, children: [new TextRun({ text, size: base })] });

  const children: InstanceType<typeof Paragraph>[] = [
    new Paragraph({ children: [new TextRun({ text: p.fullName, bold: true, size: base * 2 + 8, color: accent })] }),
  ];
  if (p.title) children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: p.title, size: base + 4, color: '444444' })] }));
  const contacts = contactEntries(p);
  if (contacts.length)
    children.push(
      new Paragraph({
        spacing: { after: 120 },
        children: contacts.flatMap((c, i) => {
          const run = new TextRun({ text: c.value, size: base - 1, color: '333333' });
          const node = c.href && c.key !== 'phone' ? new ExternalHyperlink({ link: c.href, children: [run] }) : run;
          return i ? [new TextRun({ text: '  |  ', size: base - 1, color: '999999' }), node] : [node];
        }),
      }),
    );

  for (const id of visibleSections(data, layout)) {
    children.push(heading(sectionTitle(layout, id)));
    if (id === 'summary') children.push(new Paragraph({ children: [new TextRun({ text: data.summary, size: base })] }));
    else if (id === 'skills')
      data.skills.forEach((g) =>
        children.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [...(g.name ? [new TextRun({ text: `${g.name}: `, bold: true, size: base })] : []), new TextRun({ text: g.skills, size: base })],
          }),
        ),
      );
    else if (isTimeline(id))
      data[id].forEach((it) => {
        children.push(
          new Paragraph({
            spacing: { before: 100 },
            tabStops: [{ type: TabStopType.RIGHT, position: contentWidth }],
            children: [new TextRun({ text: it.title, bold: true, size: base + 1 }), new TextRun({ text: `\t${dateRange(it)}`, size: base - 1, color: '555555' })],
          }),
        );
        const sub = [it.organization, it.location].filter(Boolean).join(' · ');
        if (sub || it.link)
          children.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [new TextRun({ text: [sub, it.link].filter(Boolean).join('  ·  '), italics: true, size: base, color: '444444' })],
            }),
          );
        toBullets(it.description).forEach((b) => children.push(bullet(b)));
      });
    else if (isSimple(id))
      data[id].forEach((it) =>
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 40 },
            children: [new TextRun({ text: it.name, bold: true, size: base }), ...(it.detail ? [new TextRun({ text: ` — ${it.detail}`, size: base })] : [])],
          }),
        ),
      );
  }

  const document = new Document({
    creator: 'Resumint',
    title: `${p.fullName} Resume`,
    styles: { default: { document: { run: { font, size: base }, paragraph: { spacing: { line: Math.round(240 * design.lineHeight * 0.85) } } } } },
    sections: [
      {
        properties: { page: { size: page, margin: { top: margin, bottom: margin, left: margin, right: margin } } },
        children,
      },
    ],
  });
  const blob = await Packer.toBlob(document);
  downloadBlob(blob, `${fileBase(doc)}.docx`);
};
