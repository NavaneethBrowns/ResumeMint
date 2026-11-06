import { useState, type ReactNode } from 'react';
import { ChevronDown, Copy, GripVertical, Plus, Trash2 } from 'lucide-react';
import { SortableList } from '../ui/SortableList';
import { uid } from '../../data/sections';

interface ItemListProps<T extends { id: string }> {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  label: (item: T) => { title: string; sub?: string };
  renderFields: (item: T, patch: (p: Partial<T>) => void) => ReactNode;
  addLabel: string;
  /** Compact mode renders fields inline without collapsible items. */
  compact?: boolean;
}

/** Reusable sortable, collapsible list editor used by every repeatable resume section. */
export const ItemList = <T extends { id: string }>({ items, onChange, create, label, renderFields, addLabel, compact }: ItemListProps<T>) => {
  const [openId, setOpenId] = useState<string | null>(items.length === 1 ? items[0].id : null);

  const patchItem = (id: string) => (p: Partial<T>) => onChange(items.map((it) => (it.id === id ? { ...it, ...p } : it)));
  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));
  const duplicate = (item: T) => {
    const copy = { ...item, id: uid() };
    const idx = items.findIndex((i) => i.id === item.id);
    onChange([...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]);
    setOpenId(copy.id);
  };
  const add = () => {
    const item = create();
    onChange([...items, item]);
    setOpenId(item.id);
  };

  return (
    <>
      <SortableList
        items={items}
        getId={(i) => i.id}
        onReorder={onChange}
        renderItem={(item, handle) => {
          if (compact)
            return (
              <div className="layout-row" style={{ alignItems: 'flex-start', padding: 8 }}>
                <span className="handle" {...handle} title="Drag to reorder">
                  <GripVertical size={15} />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>{renderFields(item, patchItem(item.id))}</div>
                <button className="icon-btn sm danger" onClick={() => remove(item.id)} aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            );
          const open = openId === item.id;
          const { title, sub } = label(item);
          return (
            <div className={`item${open ? ' open' : ''}`}>
              <div className="item-head" onClick={() => setOpenId(open ? null : item.id)}>
                <span className="handle" {...handle} onClick={(e) => e.stopPropagation()} title="Drag to reorder">
                  <GripVertical size={15} />
                </span>
                <div className="item-label">
                  <strong>{title || 'Untitled'}</strong>
                  {sub && <small>{sub}</small>}
                </div>
                <button className="icon-btn sm" onClick={(e) => (e.stopPropagation(), duplicate(item))} aria-label="Duplicate" title="Duplicate">
                  <Copy size={14} />
                </button>
                <button className="icon-btn sm danger" onClick={(e) => (e.stopPropagation(), remove(item.id))} aria-label="Delete" title="Delete">
                  <Trash2 size={14} />
                </button>
                <ChevronDown size={16} className="chev" style={{ transform: open ? 'rotate(180deg)' : undefined }} />
              </div>
              {open && <div className="item-body">{renderFields(item, patchItem(item.id))}</div>}
            </div>
          );
        }}
      />
      <button type="button" className="add-btn" onClick={add}>
        <Plus size={16} /> {addLabel}
      </button>
    </>
  );
};
