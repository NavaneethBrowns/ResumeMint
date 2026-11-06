import { useMemo, useSyncExternalStore } from 'react';

export type Route = '/' | '/builder' | '/ats' | '/support';

const KNOWN: Route[] = ['/', '/builder', '/ats', '/support'];

const parse = (hash: string): { path: Route; query: URLSearchParams } => {
  const [path, qs] = hash.replace(/^#/, '').split('?');
  return { path: KNOWN.includes(path as Route) ? (path as Route) : '/', query: new URLSearchParams(qs) };
};

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export const useRoute = () => {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(() => parse(hash), [hash]);
};

export const navigate = (path: Route, query?: Record<string, string>): void => {
  const qs = query ? `?${new URLSearchParams(query)}` : '';
  window.location.hash = `${path}${qs}`;
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
};
