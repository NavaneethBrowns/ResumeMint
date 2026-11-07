import { forwardRef, type CSSProperties } from 'react';
import type { Design, Layout, ResumeData } from '../../types/resume';
import { fontStack, getTemplate } from '../../data/templates';
import { visibleSections } from '../../lib/text';
import { Header, Section } from './ResumeParts';

export interface ResumeDocumentProps {
  data: ResumeData;
  layout: Layout;
  design: Design;
  editable?: boolean;
}

export const PAPER_MM = { A4: { w: 210, h: 297 }, Letter: { w: 215.9, h: 279.4 } } as const;
export const MM_PX = 96 / 25.4;

export const resumeStyleVars = (design: Design): CSSProperties =>
  ({
    '--rs-accent': design.accent,
    '--rs-font': fontStack(design.fontFamily),
    '--rs-fs': `${(9.6 * design.fontScale).toFixed(2)}pt`,
    '--rs-lh': design.lineHeight,
    '--rs-pad': `${design.margin}mm`,
    '--rs-gap': `${design.sectionGap}px`,
    '--rs-align': design.textAlign || 'justify',
    '--rs-page-w': `${PAPER_MM[design.paper].w}mm`,
    '--rs-page-h': `${PAPER_MM[design.paper].h}mm`,
  }) as CSSProperties;

/** Pure presentational resume renderer. Every template is a combination of layout/header/heading/skill styles. */
export const ResumeDocument = forwardRef<HTMLElement, ResumeDocumentProps>(({ data, layout, design, editable }, ref) => {
  const tpl = getTemplate(design.templateId);
  const sections = visibleSections(data, layout);
  const twoCol = tpl.layout !== 'single';
  const side = twoCol ? sections.filter((s) => layout.sidebar.includes(s)) : [];
  const main = twoCol ? sections.filter((s) => !layout.sidebar.includes(s)) : sections;
  const headerInSide = twoCol && tpl.header === 'sidebar';
  const header = <Header personal={data.personal} design={design} editable={editable} />;
  const render = (id: (typeof sections)[number]) => <Section key={id} id={id} data={data} layout={layout} template={tpl} editable={editable} />;

  const className = [
    'rs',
    `rs-t-${tpl.id}`,
    `rs-l-${tpl.layout}`,
    `rs-hd-${tpl.header}`,
    `rs-h-${tpl.heading}`,
    `rs-tone-${tpl.sidebarTone}`,
    tpl.timeline ? 'rs-timeline' : '',
  ].join(' ');

  return (
    <article ref={ref} className={className} style={resumeStyleVars(design)}>
      {!headerInSide && header}
      <div className="rs-body">
        {twoCol && (
          <aside className="rs-aside">
            {headerInSide && header}
            {side.map(render)}
          </aside>
        )}
        <div className="rs-main">{main.map(render)}</div>
      </div>
    </article>
  );
});
ResumeDocument.displayName = 'ResumeDocument';
