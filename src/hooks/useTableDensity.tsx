import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Density = 'comfortable' | 'compact';

const STORAGE_KEY = 'afios-table-density';

const TableDensityContext = createContext<{
  density: Density;
  setDensity: (d: Density) => void;
  toggle: () => void;
} | null>(null);

export function TableDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'compact' ? 'compact' : 'comfortable';
  });

  useEffect(() => {
    document.documentElement.dataset.tableDensity = density;
    localStorage.setItem(STORAGE_KEY, density);
  }, [density]);

  const setDensity = (d: Density) => setDensityState(d);
  const toggle = () => setDensityState((d) => (d === 'comfortable' ? 'compact' : 'comfortable'));

  return (
    <TableDensityContext.Provider value={{ density, setDensity, toggle }}>
      {children}
    </TableDensityContext.Provider>
  );
}

export function useTableDensity() {
  const ctx = useContext(TableDensityContext);
  if (!ctx) throw new Error('useTableDensity must be used within TableDensityProvider');
  return ctx;
}
