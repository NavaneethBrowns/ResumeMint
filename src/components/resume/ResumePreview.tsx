import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { ResumeDoc } from '../../types/resume';
import { MM_PX, PAPER_MM, ResumeDocument } from './ResumeDocument';

type DocLike = Pick<ResumeDoc, 'data' | 'layout' | 'design'>;

/** Renders the resume scaled to fit its container, with page-break guides. */
export const ResumePreview = ({ doc, zoom = 1, fit = true, guides = true, editable = false }: { doc: DocLike; zoom?: number; fit?: boolean; guides?: boolean; editable?: boolean }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const paper = PAPER_MM[doc.design.paper];
  const pageW = paper.w * MM_PX;
  const pageH = paper.h * MM_PX;

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    const el = docRef.current;
    if (!wrap || !el) return;
    const ro = new ResizeObserver(() => {
      setWidth(wrap.clientWidth);
      setHeight(el.offsetHeight);
    });
    ro.observe(wrap);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = (fit && width ? Math.min(1.25, width / pageW) : 1) * zoom;
  const pages = Math.max(1, Math.ceil((height - 2) / pageH));

  return (
    <div ref={wrapRef} className="preview-fit">
      <div className="preview-stage" style={{ width: pageW * scale, height: Math.max(height, pageH) * scale }}>
        <div className="preview-paper" style={{ transform: `scale(${scale})`, width: pageW }}>
          <ResumeDocument ref={docRef} {...doc} editable={editable} />
          {guides &&
            Array.from({ length: pages - 1 }, (_, i) => (
              <div key={i} className="page-guide" style={{ top: pageH * (i + 1) }}>
                <span>Page {i + 2}</span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

/** Static, non-interactive thumbnail used by template galleries. */
export const ResumeThumb = ({ doc, width }: { doc: DocLike; width: number }) => {
  const pageW = PAPER_MM[doc.design.paper].w * MM_PX;
  const pageH = PAPER_MM[doc.design.paper].h * MM_PX;
  const scale = width / pageW;
  return (
    <div className="thumb" style={{ width, height: pageH * scale }} aria-hidden>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: pageW, height: pageH, overflow: 'hidden' }}>
        <ResumeDocument {...doc} />
      </div>
    </div>
  );
};

/** Unscaled copy of the resume used for printing (PDF) and PNG/HTML capture. */
export const PrintStage = ({ doc, nodeRef }: { doc: DocLike; nodeRef: RefObject<HTMLElement | null> }) => {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => setHost(document.getElementById('print-root')), []);
  if (!host) return null;
  return createPortal(
    <>
      <style>{`@page { size: ${doc.design.paper === 'Letter' ? 'letter' : 'A4'}; margin: 10mm 0; } @page :first { margin-top: 0; }`}</style>
      <ResumeDocument ref={nodeRef} {...doc} />
    </>,
    host,
  );
};
