import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { I18nProvider } from '@/i18n/I18nContext';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <Suspense fallback={<DashboardSkeleton />}>
        <App />
      </Suspense>
    </I18nProvider>
  </StrictMode>
);
