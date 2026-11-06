import { useState, type RefObject } from 'react';
import { Braces, ChevronDown, Code2, Download, FileText, FileType2, ImageIcon, Loader2, Type } from 'lucide-react';
import type { ResumeDoc } from '../../types/resume';
import { exportHtml, exportJson, exportPdf, exportPng, exportTxt, type ExportFormat } from '../../lib/export/exporters';
import { Popover, toast } from '../ui/primitives';

const FORMATS: { id: ExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { id: 'pdf', label: 'PDF', hint: 'Best for applying · selectable text', icon: FileText },
  { id: 'docx', label: 'Word (DOCX)', hint: 'Editable · ATS-safe single column', icon: FileType2 },
  { id: 'png', label: 'PNG image', hint: 'High-res preview for sharing', icon: ImageIcon },
  { id: 'html', label: 'Web page (HTML)', hint: 'Self-contained, host anywhere', icon: Code2 },
  { id: 'txt', label: 'Plain text', hint: 'Paste into job portals', icon: Type },
  { id: 'json', label: 'Backup (JSON)', hint: 'Re-import later to keep editing', icon: Braces },
];

export const ExportMenu = ({ doc, nodeRef }: { doc: ResumeDoc; nodeRef: RefObject<HTMLElement | null> }) => {
  const [busy, setBusy] = useState<ExportFormat | null>(null);

  const run = async (format: ExportFormat, close: () => void) => {
    const node = nodeRef.current;
    setBusy(format);
    try {
      if (format === 'pdf') {
        close();
        toast.info('In the print dialog choose “Save as PDF” and turn off headers & footers.');
        await exportPdf(doc);
      } else if (format === 'docx') await (await import('../../lib/export/exportDocx')).exportDocx(doc);
      else if (format === 'png' && node) await exportPng(doc, node);
      else if (format === 'html' && node) exportHtml(doc, node);
      else if (format === 'txt') exportTxt(doc);
      else if (format === 'json') exportJson(doc);
      if (format !== 'pdf') toast.success(`${format.toUpperCase()} downloaded.`);
      close();
    } catch (err) {
      console.error('[export]', err);
      toast.error(`Could not export ${format.toUpperCase()}. Please try again.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Popover
      width={320}
      trigger={(toggle) => (
        <button className="btn btn-primary" onClick={toggle}>
          <Download size={16} /> <span className="hide-sm">Download</span> <ChevronDown size={14} />
        </button>
      )}
    >
      {(close) =>
        FORMATS.map((f) => (
          <button key={f.id} className="menu-item" onClick={() => run(f.id, close)} disabled={busy !== null}>
            <span className="mi-icon">{busy === f.id ? <Loader2 size={17} className="spin" /> : <f.icon size={17} />}</span>
            <span>
              <strong>{f.label}</strong>
              <small>{f.hint}</small>
            </span>
          </button>
        ))
      }
    </Popover>
  );
};
