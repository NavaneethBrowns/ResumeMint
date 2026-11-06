import { useMemo } from 'react';
import { GripVertical, RotateCcw } from 'lucide-react';
import type { ResumeDoc } from '../../types/resume';
import { ACCENTS, FONTS, TEMPLATES, getTemplate } from '../../data/templates';
import { DEFAULT_ORDER, SECTIONS, designForTemplate } from '../../data/sections';
import { useResumeStore } from '../../store/useResumeStore';
import { sectionTitle } from '../../lib/text';
import { ResumeThumb } from '../resume/ResumePreview';
import { SortableList } from '../ui/SortableList';
import { Slider, Toggle } from '../ui/primitives';

export const TemplatePicker = ({ doc }: { doc: ResumeDoc }) => {
  const setTemplate = useResumeStore((s) => s.setTemplate);
  // Thumbnails reuse the user's content so they preview their own resume in each style.
  const previews = useMemo(
    () => TEMPLATES.map((t) => ({ t, design: designForTemplate(t.id, doc.design) })),
    [doc.design],
  );
  return (
    <div className="tpl-mini-grid">
      {previews.map(({ t, design }) => (
        <button key={t.id} className={`tpl-mini${doc.design.templateId === t.id ? ' selected' : ''}`} onClick={() => setTemplate(t.id)} title={t.tagline}>
          <div className="tpl-frame">
            <ResumeThumb doc={{ data: doc.data, layout: { ...doc.layout, sidebar: t.layout === 'single' ? [] : doc.layout.sidebar.length ? doc.layout.sidebar : t.defaultSidebar }, design }} width={118} />
          </div>
          {t.name}
        </button>
      ))}
    </div>
  );
};

export const DesignPanel = ({ doc }: { doc: ResumeDoc }) => {
  const { updateDesign, updateLayout } = useResumeStore.getState();
  const { design, layout } = doc;
  const tpl = getTemplate(design.templateId);
  const twoCol = tpl.layout !== 'single';

  const setColumn = (id: (typeof layout.order)[number], side: boolean) =>
    updateLayout((l) => ({ ...l, sidebar: side ? [...new Set([...l.sidebar, id])] : l.sidebar.filter((s) => s !== id) }));

  return (
    <>
      <div className="group">
        <h4>
          Template <span className="ats-badge">{tpl.category}</span>
        </h4>
        <TemplatePicker doc={doc} />
      </div>

      <div className="group">
        <h4>Accent colour</h4>
        <div className="swatches">
          {ACCENTS.map((c) => (
            <button
              key={c}
              className={`swatch${design.accent.toLowerCase() === c ? ' active' : ''}`}
              style={{ background: c, color: c }}
              onClick={() => updateDesign({ accent: c })}
              aria-label={`Accent ${c}`}
            />
          ))}
          <input type="color" className="color-input" value={design.accent} onChange={(e) => updateDesign({ accent: e.target.value })} aria-label="Custom colour" title="Custom colour" />
        </div>
      </div>

      <div className="group">
        <h4>Typography</h4>
        <select className="input" value={design.fontFamily} onChange={(e) => updateDesign({ fontFamily: e.target.value })} aria-label="Font">
          {(['Sans', 'Serif'] as const).map((kind) => (
            <optgroup key={kind} label={kind}>
              {FONTS.filter((f) => f.kind === kind).map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Slider label="Font size" value={design.fontScale} min={0.85} max={1.15} step={0.01} onChange={(v) => updateDesign({ fontScale: v })} format={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Line height" value={design.lineHeight} min={1.15} max={1.8} step={0.05} onChange={(v) => updateDesign({ lineHeight: v })} format={(v) => v.toFixed(2)} />
      </div>

      <div className="group">
        <h4>Spacing & page</h4>
        <Slider label="Page margins" value={design.margin} min={8} max={26} step={1} onChange={(v) => updateDesign({ margin: v })} format={(v) => `${v} mm`} />
        <Slider label="Section spacing" value={design.sectionGap} min={6} max={28} step={1} onChange={(v) => updateDesign({ sectionGap: v })} format={(v) => `${v}px`} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="field-label">Paper size</span>
          <div className="seg">
            {(['A4', 'Letter'] as const).map((p) => (
              <button key={p} className={design.paper === p ? 'active' : ''} onClick={() => updateDesign({ paper: p })}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <Toggle label="Show profile photo" checked={design.showPhoto} onChange={(v) => updateDesign({ showPhoto: v })} />
        <Toggle label="Show contact icons" checked={design.showIcons} onChange={(v) => updateDesign({ showIcons: v })} />
      </div>

      <div className="group">
        <h4>
          Layout & sections
          <button
            className="chip-btn"
            onClick={() => updateLayout((l) => ({ ...l, order: [...DEFAULT_ORDER], hidden: [], sidebar: [...tpl.defaultSidebar] }))}
            title="Reset order and columns"
          >
            <RotateCcw size={12} /> Reset
          </button>
        </h4>
        <p className="field-hint">Drag to reorder.{twoCol ? ' Choose which column each section lives in.' : ' Switch to a two-column template to use a sidebar.'}</p>
        <SortableList
          items={layout.order}
          getId={(id) => id}
          onReorder={(order) => updateLayout((l) => ({ ...l, order }))}
          renderItem={(id, handle) => {
            const off = layout.hidden.includes(id);
            const side = layout.sidebar.includes(id);
            return (
              <div className={`layout-row${off ? ' off' : ''}`}>
                <span className="handle" {...handle}>
                  <GripVertical size={15} />
                </span>
                <span className="name">{sectionTitle(layout, id) || SECTIONS[id].label}</span>
                {twoCol && (
                  <div className="col-toggle" role="group" aria-label="Column">
                    <button className={!side ? 'active' : ''} onClick={() => setColumn(id, false)}>
                      Main
                    </button>
                    <button className={side ? 'active' : ''} onClick={() => setColumn(id, true)}>
                      Side
                    </button>
                  </div>
                )}
                <Toggle label="" checked={!off} onChange={() => useResumeStore.getState().toggleSection(id)} />
              </div>
            );
          }}
        />
      </div>
    </>
  );
};
