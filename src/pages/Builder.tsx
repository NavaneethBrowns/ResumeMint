import { useEffect, useRef, useState, useDeferredValue } from 'react';
import { Eye, Gauge, Heart, Maximize2, Minus, Palette, PenLine, Plus, Redo2, Sparkles, Undo2, Upload } from 'lucide-react';
import { useActiveDoc, useResumeStore } from '../store/useResumeStore';
import { useSettings } from '../store/useSettings';
import { useUi } from '../store/useUi';
import { navigate, useRoute } from '../lib/router';
import { exportPdf } from '../lib/export/exporters';
import { getTemplate } from '../data/templates';
import { useAtsReport, useJobDescription } from '../hooks/useAts';
import { Brand } from '../components/Brand';
import { DocSwitcher } from '../components/builder/DocSwitcher';
import { ContentEditor } from '../components/editor/ContentEditor';
import { DesignPanel } from '../components/design/DesignPanel';
import { AtsPanel } from '../components/ats/AtsPanel';
import { scoreColor } from '../components/ats/AtsReportView';
import { ExportMenu } from '../components/export/ExportMenu';
import { PrintStage, ResumePreview } from '../components/resume/ResumePreview';

type Tab = 'content' | 'design' | 'ats';
const ZOOM_STEPS = [0.5, 0.65, 0.8, 1, 1.15, 1.3];

export const Builder = () => {
  const doc = useActiveDoc();
  const canUndo = useResumeStore((s) => s.past.length > 0);
  const canRedo = useResumeStore((s) => s.future.length > 0);
  const hasAi = useSettings((s) => Boolean(s.geminiKey));
  const { query } = useRoute();
  const [tab, setTab] = useState<Tab>('content');
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [zoom, setZoom] = useState(1);
  const [jd, setJd] = useJobDescription(doc.id);
  const report = useAtsReport(doc, jd);
  const previewDoc = useDeferredValue(doc);
  const printRef = useRef<HTMLElement>(null);
  const docRef = useRef(doc);
  docRef.current = doc;

  // Deep links from the landing page: #/builder?template=aurora | ?import=1 | ?tab=ats
  useEffect(() => {
    const t = query.get('template');
    if (t && getTemplate(t).id === t) useResumeStore.getState().setTemplate(t);
    if (query.get('import')) useUi.getState().setImportOpen(true);
    const qTab = query.get('tab');
    if (qTab === 'ats' || qTab === 'design') setTab(qTab);
    if (query.toString()) window.history.replaceState(null, '', '#/builder');
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      const { undo, redo } = useResumeStore.getState();
      if (k === 'z' && !e.shiftKey) (e.preventDefault(), undo());
      else if ((k === 'z' && e.shiftKey) || k === 'y') (e.preventDefault(), redo());
      else if (k === 'p') (e.preventDefault(), exportPdf(docRef.current));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const zoomBy = (dir: 1 | -1) => {
    const idx = ZOOM_STEPS.findIndex((z) => z >= zoom - 0.001);
    setZoom(ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, idx + dir))]);
  };

  const { undo, redo } = useResumeStore.getState();

  return (
    <div className="app">
      <header className="topbar">
        <Brand onClick={() => navigate('/')} compact />
        <span className="topbar-divider hide-sm" />
        <DocSwitcher />
        <span className="saved-dot hide-sm">Saved locally</span>
        <span className="spacer" />
        <button className="icon-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)" aria-label="Undo">
          <Undo2 size={18} />
        </button>
        <button className="icon-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)" aria-label="Redo">
          <Redo2 size={18} />
        </button>
        <div className="seg mobile-switch">
          <button className={view === 'edit' ? 'active' : ''} onClick={() => setView('edit')}>
            <PenLine size={14} />
          </button>
          <button className={view === 'preview' ? 'active' : ''} onClick={() => setView('preview')}>
            <Eye size={14} />
          </button>
        </div>
        <button className="btn btn-ghost btn-sm hide-sm" onClick={() => useUi.getState().setImportOpen(true)}>
          <Upload size={15} /> Import
        </button>
        <button
          className="icon-btn"
          onClick={() => useUi.getState().setAiSettingsOpen(true)}
          title={hasAi ? 'AI connected' : 'Connect AI (optional)'}
          aria-label="AI settings"
          style={hasAi ? { color: 'var(--brand)' } : undefined}
        >
          <Sparkles size={18} />
        </button>
        <a className="icon-btn hide-sm" href="#/support" title="Support us" aria-label="Support us">
          <Heart size={18} />
        </a>
        <button className="score-pill" onClick={() => (setTab('ats'), setView('edit'))} title="ATS score">
          <span className="num" style={{ background: scoreColor(report.score) }}>
            {report.score}
          </span>
          <span className="hide-sm">ATS score</span>
        </button>
        <ExportMenu doc={doc} nodeRef={printRef} />
      </header>

      <div className="workspace" data-view={view}>
        <aside className="panel">
          <nav className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'content'} className={`tab${tab === 'content' ? ' active' : ''}`} onClick={() => setTab('content')}>
              <PenLine size={16} /> Content
            </button>
            <button role="tab" aria-selected={tab === 'design'} className={`tab${tab === 'design' ? ' active' : ''}`} onClick={() => setTab('design')}>
              <Palette size={16} /> Design
            </button>
            <button role="tab" aria-selected={tab === 'ats'} className={`tab${tab === 'ats' ? ' active' : ''}`} onClick={() => setTab('ats')}>
              <Gauge size={16} /> ATS
              <span className="badge" style={{ background: scoreColor(report.score) }}>
                {report.score}
              </span>
            </button>
          </nav>
          <div className="panel-scroll">
            {tab === 'content' && <ContentEditor doc={doc} />}
            {tab === 'design' && <DesignPanel doc={doc} />}
            {tab === 'ats' && <AtsPanel doc={doc} report={report} jd={jd} setJd={setJd} />}
          </div>
        </aside>

        <main className="canvas">
          <div className="canvas-inner">
            <ResumePreview doc={previewDoc} zoom={zoom} />
          </div>
          <div className="canvas-tools">
            <button className="icon-btn sm" onClick={() => zoomBy(-1)} aria-label="Zoom out">
              <Minus size={15} />
            </button>
            <span className="zoom">{Math.round(zoom * 100)}%</span>
            <button className="icon-btn sm" onClick={() => zoomBy(1)} aria-label="Zoom in">
              <Plus size={15} />
            </button>
            <button className="icon-btn sm" onClick={() => setZoom(1)} aria-label="Fit to width" title="Fit">
              <Maximize2 size={14} />
            </button>
          </div>
        </main>
      </div>

      <PrintStage doc={doc} nodeRef={printRef} />
    </div>
  );
};
