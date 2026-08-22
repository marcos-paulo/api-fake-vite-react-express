import { useEffect } from 'react';

import { apiBaseUrl } from '../api-client';

// Não existe EventSource nativo no Node — consome o mesmo stream SSE de
// src/app/backend/routes/events-route.ts manualmente via fetch, parseando o
// formato "data: reload\n\n" (sinal sem payload; o consumidor deve refazer o fetch).
export function useReloadSubscription(onReload: () => void) {
  useEffect(() => {
    let destroyed = false;
    let abortController: AbortController | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    async function connect() {
      if (destroyed) return;

      abortController = new AbortController();

      try {
        const response = await fetch(`${apiBaseUrl}/api/events`, {
          signal: abortController.signal,
        });
        const reader = response.body?.getReader();
        if (!reader) throw new Error('Resposta SSE sem corpo');

        const decoder = new TextDecoder();
        let buffer = '';

        while (!destroyed) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split('\n\n');
          buffer = events.pop() ?? '';

          for (const event of events) {
            if (event.startsWith('data: reload')) {
              onReload();
            }
          }
        }

        throw new Error('Conexão SSE encerrada pelo servidor');
      } catch (error) {
        if (destroyed) return;
        console.warn('[SSE] Conexão perdida, reconectando em 1s...', error);
        reconnectTimer = setTimeout(connect, 1000);
      }
    }

    void connect();

    return () => {
      destroyed = true;
      abortController?.abort();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [onReload]);
}
