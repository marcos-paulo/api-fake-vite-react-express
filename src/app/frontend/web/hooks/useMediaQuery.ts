import { useSyncExternalStore } from 'react';

// Segue uma media query em tempo real (a janela do Tauri/Puppeteer pode ser redimensionada).
// Sem matchMedia (ambiente sem DOM completo) devolve false.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onChange);
      return () => mediaQuery.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
