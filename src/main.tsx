import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { I18nProvider } from '@/i18n/I18nContext';
import { TableDensityProvider } from '@/hooks/useTableDensity';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { DashboardSkeleton } from '@/components/ui/DashboardSkeleton';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouteErrorBoundary>
      <I18nProvider>
        <TableDensityProvider>
          <Suspense fallback={<DashboardSkeleton />}>
            <App />
          </Suspense>
        </TableDensityProvider>
      </I18nProvider>
    </RouteErrorBoundary>
  </StrictMode>
);
