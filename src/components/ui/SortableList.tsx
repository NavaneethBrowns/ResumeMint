import { useState, type DragEvent, type ReactNode } from 'react';

export interface DragHandleProps {
  draggable: true;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
}

interface SortableListProps<T> {
  items: T[];
  getId: (item: T) => string;
  onReorder: (items: T[]) => void;
  renderItem: (item: T, handle: DragHandleProps, index: number) => ReactNode;
  className?: string;
}

export const moveItem = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** Lightweight native drag-and-drop list. Only the handle starts a drag so inputs stay selectable. */
export const SortableList = <T,>({ items, getId, onReorder, renderItem, className = '' }: SortableListProps<T>) => {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const drop = (targetId: string) => {
    if (dragId && dragId !== targetId) {
      const from = items.findIndex((i) => getId(i) === dragId);
      const to = items.findIndex((i) => getId(i) === targetId);
      onReorder(moveItem(items, from, to));
    }
    setDragId(null);
    setOverId(null);
  };

  return (
    <div className={`sortable ${className}`}>
      {items.map((item, index) => {
        const id = getId(item);
        const handle: DragHandleProps = {
          draggable: true,
          onDragStart: (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', id);
            const row = (e.currentTarget as HTMLElement).closest('.sortable-item');
            if (row) e.dataTransfer.setDragImage(row, 20, 20);
            setDragId(id);
          },
          onDragEnd: () => {
            setDragId(null);
            setOverId(null);
          },
        };
        return (
          <div
            key={id}
            className={`sortable-item${dragId === id ? ' is-dragging' : ''}${overId === id && dragId !== id ? ' is-over' : ''}`}
            onDragOver={(e) => {
              if (!dragId) return;
              e.preventDefault();
              if (overId !== id) setOverId(id);
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(id);
            }}
          >
            {renderItem(item, handle, index)}
          </div>
        );
      })}
    </div>
  );
};
