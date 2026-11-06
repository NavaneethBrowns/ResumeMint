import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ResumeDoc } from '../types/resume';
import { scoreResume } from '../lib/ats/score';
import { getTemplate } from '../data/templates';

/** Live ATS report for a resume doc; recomputed on a deferred value so typing stays smooth. */
export const useAtsReport = (doc: Pick<ResumeDoc, 'data' | 'layout' | 'design'>, jobDescription = '') => {
  const deferred = useDeferredValue(doc);
  const deferredJd = useDeferredValue(jobDescription);
  return useMemo(
    () =>
      scoreResume(deferred.data, deferred.layout, {
        jobDescription: deferredJd,
        templateSafety: getTemplate(deferred.design.templateId).atsSafety,
        hasPhoto: deferred.design.showPhoto && Boolean(deferred.data.personal.photo),
      }),
    [deferred, deferredJd],
  );
};

/** Persists the job description per resume so it survives reloads. */
export const useJobDescription = (key: string) => {
  const storageKey = `resumint:jd:${key}`;
  const [jd, setJd] = useState(() => localStorage.getItem(storageKey) ?? '');
  useEffect(() => setJd(localStorage.getItem(storageKey) ?? ''), [storageKey]);
  useEffect(() => {
    const t = setTimeout(() => (jd ? localStorage.setItem(storageKey, jd) : localStorage.removeItem(storageKey)), 400);
    return () => clearTimeout(t);
  }, [jd, storageKey]);
  return [jd, setJd] as const;
};
