import { lazy, Suspense } from 'react';
import { useRoute } from './lib/router';
import { Landing } from './pages/Landing';
import { Toaster } from './components/ui/primitives';
import { AiSettingsDialog } from './components/settings/AiSettingsDialog';
import { ImportDialog } from './components/import/ImportDialog';

const Builder = lazy(() => import('./pages/Builder').then((m) => ({ default: m.Builder })));
const AtsChecker = lazy(() => import('./pages/AtsChecker').then((m) => ({ default: m.AtsChecker })));
const Support = lazy(() => import('./pages/Support').then((m) => ({ default: m.Support })));

const pages = { '/builder': Builder, '/ats': AtsChecker, '/support': Support } as const;

export const App = () => {
  const { path } = useRoute();
  const Page = path === '/' ? Landing : pages[path];
  return (
    <>
      <Suspense fallback={<div className="app" />}>
        <Page />
      </Suspense>
      <ImportDialog />
      <AiSettingsDialog />
      <Toaster />
    </>
  );
};
