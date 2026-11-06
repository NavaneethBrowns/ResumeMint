import { useEffect, useId, useRef, useState, type CSSProperties, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { create } from 'zustand';

/* ---------- Form fields ---------- */
interface FieldBase {
  label: string;
  hint?: ReactNode;
  className?: string;
}

export const TextField = ({ label, hint, className = '', ...input }: FieldBase & InputHTMLAttributes<HTMLInputElement>) => {
  const id = useId();
  return (
    <label className={`field ${className}`} htmlFor={id}>
      <span className="field-label">{label}</span>
      <input id={id} className="input" {...input} />
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
};

export const TextArea = ({
  label,
  hint,
  className = '',
  actions,
  ...area
}: FieldBase & TextareaHTMLAttributes<HTMLTextAreaElement> & { actions?: ReactNode }) => {
  const id = useId();
  return (
    <div className={`field ${className}`}>
      <div className="field-row">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>
        {actions}
      </div>
      <textarea id={id} className="input textarea" {...area} />
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
};

export const Toggle = ({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) => (
  <label className="toggle">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="toggle-track" aria-hidden>
      <span className="toggle-thumb" />
    </span>
    <span>{label}</span>
  </label>
);

export const Slider = ({
  label, value, min, max, step, onChange, format = (v) => String(v),
}: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) => (
  <label className="slider">
    <span className="slider-head">
      <span>{label}</span>
      <span className="slider-value">{format(value)}</span>
    </span>
    <input
      type="range" min={min} max={max} step={step} value={value}
      style={{ '--p': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </label>
);

/* ---------- Modal ---------- */
export const Modal = ({
  open, onClose, title, subtitle, children, width = 560, footer,
}: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; width?: number; footer?: ReactNode }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} style={{ maxWidth: width }}>
        <div className="modal-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
};

/* ---------- Popover ---------- */
export const Popover = ({
  trigger, children, align = 'right', width = 300,
}: { trigger: (toggle: () => void, open: boolean) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: number }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="popover-wrap" ref={ref}>
      {trigger(() => setOpen((o) => !o), open)}
      {open && (
        <div className={`popover popover-${align}`} style={{ width }}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

/* ---------- Toasts ---------- */
type ToastKind = 'success' | 'error' | 'info';
interface ToastItem { id: number; kind: ToastKind; text: string }

const useToasts = create<{ items: ToastItem[]; push: (kind: ToastKind, text: string) => void; drop: (id: number) => void }>((set) => ({
  items: [],
  push: (kind, text) => {
    const id = Date.now() + Math.random();
    set((s) => ({ items: [...s.items.slice(-3), { id, kind, text }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), kind === 'error' ? 6000 : 3200);
  },
  drop: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (t: string) => useToasts.getState().push('success', t),
  error: (t: string) => useToasts.getState().push('error', t),
  info: (t: string) => useToasts.getState().push('info', t),
};

export const Toaster = () => {
  const { items, drop } = useToasts();
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <button key={t.id} className={`toast toast-${t.kind}`} onClick={() => drop(t.id)}>
          {t.text}
        </button>
      ))}
    </div>
  );
};
