import { useRef } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';
import type { Personal, ResumeData, SimpleSectionId, TimelineSectionId } from '../../types/resume';
import { SECTIONS, newSimpleItem, newSkillGroup, newTimelineItem } from '../../data/sections';
import { useResumeStore } from '../../store/useResumeStore';
import { dateRange, splitSkills, toBullets } from '../../lib/text';
import { TextArea, TextField, toast } from '../ui/primitives';
import { ItemList } from './ItemList';
import { AiPolishButton } from './AiPolishButton';

const update = (fn: (d: ResumeData) => ResumeData) => useResumeStore.getState().updateData(fn);

const PHOTO_SIZE = 320;

const readPhoto = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Please choose an image file.'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = Object.assign(document.createElement('canvas'), { width: PHOTO_SIZE, height: PHOTO_SIZE });
      canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = url;
  });

const PERSONAL_FIELDS: { key: keyof Personal; label: string; placeholder: string; type?: string }[] = [
  { key: 'fullName', label: 'Full name', placeholder: 'Aarav Mehta' },
  { key: 'title', label: 'Headline / target role', placeholder: 'Senior Product Engineer' },
  { key: 'email', label: 'Email', placeholder: 'you@email.com', type: 'email' },
  { key: 'phone', label: 'Phone', placeholder: '+91 98765 43210', type: 'tel' },
  { key: 'location', label: 'Location', placeholder: 'Bengaluru, India' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/you' },
  { key: 'github', label: 'GitHub', placeholder: 'github.com/you' },
  { key: 'website', label: 'Website / portfolio', placeholder: 'yoursite.com' },
];

export const PersonalEditor = ({ personal }: { personal: Personal }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Personal>) => update((d) => ({ ...d, personal: { ...d.personal, ...patch } }));
  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      set({ photo: await readPhoto(file) });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };
  return (
    <>
      <div className="photo-row">
        <div className="photo-box">{personal.photo ? <img src={personal.photo} alt="Profile" /> : <ImagePlus size={20} />}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>
            {personal.photo ? 'Change photo' : 'Add photo'}
          </button>
          {personal.photo && (
            <button className="btn btn-ghost btn-sm" onClick={() => set({ photo: '' })}>
              <Trash2 size={14} /> Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
        </div>
      </div>
      <div className="grid-2">
        {PERSONAL_FIELDS.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            placeholder={f.placeholder}
            type={f.type ?? 'text'}
            value={personal[f.key]}
            onChange={(e) => set({ [f.key]: e.target.value })}
          />
        ))}
      </div>
    </>
  );
};

const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export const SummaryEditor = ({ summary, title }: { summary: string; title: string }) => {
  const words = wordCount(summary);
  return (
    <TextArea
      label="Professional summary"
      rows={5}
      placeholder="2–4 lines: who you are, years of experience, signature wins, and what you're targeting."
      value={summary}
      onChange={(e) => update((d) => ({ ...d, summary: e.target.value }))}
      actions={<AiPolishButton text={summary} kind="summary" context={title} onResult={(t) => update((d) => ({ ...d, summary: t }))} />}
      hint={<span className={`counter${words >= 25 && words <= 90 ? ' good' : ''}`}>{words} words · ideal 25–90</span>}
    />
  );
};

export const TimelineEditor = ({ id, items }: { id: TimelineSectionId; items: ResumeData[TimelineSectionId] }) => {
  const meta = SECTIONS[id];
  const singular = meta.label.replace(/s$/, '').replace(/ing$/, 'ing role');
  return (
    <ItemList
      items={items}
      onChange={(next) => update((d) => ({ ...d, [id]: next }))}
      create={() => newTimelineItem()}
      addLabel={`Add ${singular.toLowerCase()}`}
      label={(it) => ({ title: it.title || it.organization, sub: [it.organization, dateRange(it)].filter(Boolean).join(' · ') })}
      renderFields={(it, patch) => (
        <>
          <div className="grid-2">
            <TextField label={meta.fields!.title} value={it.title} onChange={(e) => patch({ title: e.target.value })} />
            <TextField label={meta.fields!.organization!} value={it.organization} onChange={(e) => patch({ organization: e.target.value })} />
            <TextField label="Start" placeholder="Mar 2021" value={it.startDate} onChange={(e) => patch({ startDate: e.target.value })} />
            <TextField
              label="End"
              placeholder={it.current ? 'Present' : 'Feb 2024'}
              value={it.current ? '' : it.endDate}
              disabled={it.current}
              onChange={(e) => patch({ endDate: e.target.value })}
            />
            <TextField label="Location" placeholder="City" value={it.location} onChange={(e) => patch({ location: e.target.value })} />
            {id === 'projects' ? (
              <TextField label="Link" placeholder="github.com/you/project" value={it.link} onChange={(e) => patch({ link: e.target.value })} />
            ) : (
              <label className="toggle" style={{ alignSelf: 'end', height: 40 }}>
                <input type="checkbox" checked={it.current} onChange={(e) => patch({ current: e.target.checked })} />
                <span className="toggle-track" aria-hidden>
                  <span className="toggle-thumb" />
                </span>
                <span>{id === 'education' ? 'Currently studying' : 'I currently work here'}</span>
              </label>
            )}
          </div>
          <TextArea
            label="Highlights"
            rows={5}
            placeholder={'One achievement per line, e.g.\nLed migration to Next.js, cutting page load by 42%'}
            value={it.description}
            onChange={(e) => patch({ description: e.target.value })}
            actions={<AiPolishButton text={it.description} kind="bullets" context={`${it.title} at ${it.organization}`} onResult={(t) => patch({ description: t })} />}
            hint={`${toBullets(it.description).length} bullet(s) · one per line · start with a verb, add a number`}
          />
        </>
      )}
    />
  );
};

export const SkillsEditor = ({ groups }: { groups: ResumeData['skills'] }) => (
  <ItemList
    items={groups}
    onChange={(skills) => update((d) => ({ ...d, skills }))}
    create={() => newSkillGroup()}
    addLabel="Add skill group"
    label={(g) => ({ title: g.name || 'Skills', sub: `${splitSkills(g.skills).length} skills` })}
    renderFields={(g, patch) => (
      <>
        <TextField label="Group name (optional)" placeholder="Frameworks" value={g.name} onChange={(e) => patch({ name: e.target.value })} />
        <TextArea label="Skills" rows={2} placeholder="React, TypeScript, Node.js" value={g.skills} onChange={(e) => patch({ skills: e.target.value })} hint="Separate with commas" />
        <div className="chips">
          {splitSkills(g.skills).map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      </>
    )}
  />
);

export const SimpleEditor = ({ id, items }: { id: SimpleSectionId; items: ResumeData[SimpleSectionId] }) => {
  const meta = SECTIONS[id];
  return (
    <ItemList
      compact
      items={items}
      onChange={(next) => update((d) => ({ ...d, [id]: next }))}
      create={() => newSimpleItem()}
      addLabel={`Add ${meta.fields!.title.toLowerCase()}`}
      label={(it) => ({ title: it.name })}
      renderFields={(it, patch) => (
        <div className="grid-2">
          <input className="input" placeholder={meta.fields!.title} value={it.name} onChange={(e) => patch({ name: e.target.value })} aria-label={meta.fields!.title} />
          <input className="input" placeholder={meta.fields!.detail} value={it.detail} onChange={(e) => patch({ detail: e.target.value })} aria-label={meta.fields!.detail} />
        </div>
      )}
    />
  );
};
