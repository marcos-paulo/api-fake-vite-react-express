import { useEffect } from 'react';

export function useReloadSubscription(onReload: () => void) {
  useEffect(() => {
    // Em dev, conecta diretamente ao backend (evita problema de reconexão pelo proxy do Vite)
    const sseUrl = import.meta.env.DEV
      ? `http://localhost:${__VITE_API_PORT__}/api/events`
      : '/api/events';

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;

      es = new EventSource(sseUrl);

      es.onmessage = () => {
        onReload();
      };

      es.onerror = () => {
        if (destroyed) return;
        console.warn('[SSE] Conexão perdida, reconectando em 1s...');
        es?.close();
        es = null;
        reconnectTimer = setTimeout(connect, 1000);
      };
    }

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      es?.close();
    };
  }, [onReload]);
}
