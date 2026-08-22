import type { AxiosResponse } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Endpoint, Endpoints } from '../../../../types/endpoints.types';
import { apiClient } from '../api-client';
import { openInTmuxNvim } from '../open-in-tmux-nvim';
import { useReloadSubscription } from './useReloadSubscription';

export type LoadingState = 'idle' | 'fetching' | 'saving';

export type FeedbackMessage = {
  text: string;
  type: 'success' | 'error' | 'info';
};

const FEEDBACK_AUTO_HIDE_MS = 3000;

// Mesma lógica de src/app/frontend/web/hooks/useEndpoints.ts — a única diferença real é a
// fonte de live-reload (SSE manual via fetch, ver useReloadSubscription).
export function useEndpoints() {
  const [endpoints, setEndpoints] = useState<Endpoints | null>({ listEndpoints: [] });
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Endpoint>>({});
  const [pendingHandlerChanges, setPendingHandlerChanges] = useState<Record<string, string>>({});

  const handleFetchStart = useCallback(() => {
    setLoadingState('fetching');
    setFeedbackMessage({ text: 'Carregando endpoints...', type: 'info' });
  }, []);

  const handleFetchSuccess = useCallback((response: AxiosResponse<Endpoints>) => {
    if (response.status === 200) {
      setEndpoints(response.data);
      setFeedbackMessage({ text: 'Endpoints carregados com sucesso!', type: 'success' });
    }
  }, []);

  const handleFetchError = useCallback((error: unknown) => {
    console.error('Erro ao buscar endpoints:', error);
    setEndpoints({ listEndpoints: [] });
    setFeedbackMessage({ text: 'Erro ao carregar endpoints', type: 'error' });
  }, []);

  const fetchEndpoints = useCallback(async () => {
    handleFetchStart();
    try {
      const response = await apiClient.get<Endpoints>('/api/endpoints');
      handleFetchSuccess(response);
    } catch (error) {
      handleFetchError(error);
    } finally {
      setLoadingState('idle');
      setTimeout(() => setFeedbackMessage(null), FEEDBACK_AUTO_HIDE_MS);
    }
  }, [handleFetchStart, handleFetchSuccess, handleFetchError]);

  const onAddPendingEndpoint = useCallback((endpoint: Endpoint) => {
    setPendingChanges((prev) => {
      if (endpoint.fileName in prev) {
        const { [endpoint.fileName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [endpoint.fileName]: endpoint };
    });
  }, []);

  const onOpenEndpointFile = useCallback(async (fileName: string) => {
    // Dentro de uma sessão tmux, abre o nvim numa aba nova em vez de pedir
    // ao server pra abrir o VS Code — mantém o fluxo todo no terminal.
    if (openInTmuxNvim(fileName)) {
      setFeedbackMessage({ text: `Abrindo ${fileName} no nvim (aba do tmux)...`, type: 'info' });
      setTimeout(() => setFeedbackMessage(null), FEEDBACK_AUTO_HIDE_MS);
      return;
    }

    try {
      await apiClient.post('/api/open-endpoint-file', { fileName });
      setFeedbackMessage({ text: `Abrindo ${fileName} no VS Code...`, type: 'info' });
    } catch (error) {
      console.error('Erro ao abrir arquivo de endpoint:', error);
      setFeedbackMessage({ text: `Erro ao abrir arquivo: ${fileName}`, type: 'error' });
    } finally {
      setTimeout(() => setFeedbackMessage(null), FEEDBACK_AUTO_HIDE_MS);
    }
  }, []);

  const onAddPendingHandlerChange = useCallback(
    (fileName: string, handlerKey: string) => {
      setPendingHandlerChanges((prev) => {
        const originalHandlerKey = endpoints?.listEndpoints.find(
          (ep) => ep.fileName === fileName,
        )?.activeHandlerKey;

        if (handlerKey === originalHandlerKey) {
          const { [fileName]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [fileName]: handlerKey };
      });
    },
    [endpoints],
  );

  const handleSaveStart = useCallback(() => {
    setLoadingState('saving');
    setFeedbackMessage({ text: 'Salvando alterações...', type: 'info' });
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setPendingChanges({});
    setPendingHandlerChanges({});
    setFeedbackMessage({ text: 'Alterações salvas com sucesso!', type: 'success' });
  }, []);

  const handleSaveError = useCallback((error: unknown) => {
    console.error('Erro ao salvar alterações:', error);
    setFeedbackMessage({ text: 'Erro ao salvar alterações', type: 'error' });
  }, []);

  const saveChanges = useCallback(async () => {
    const endpointsToChange = Object.values(pendingChanges);
    const handlerChangesToSave = Object.entries(pendingHandlerChanges).map(
      ([fileName, handlerKey]) => ({ fileName, handlerKey }),
    );
    if (endpointsToChange.length === 0 && handlerChangesToSave.length === 0) return;

    handleSaveStart();
    try {
      await Promise.all([
        endpointsToChange.length > 0
          ? apiClient.post('/api/changeStateEndpoint', endpointsToChange)
          : null,
        handlerChangesToSave.length > 0
          ? apiClient.post('/api/changeActiveHandler', handlerChangesToSave)
          : null,
      ]);
      handleSaveSuccess();
      await fetchEndpoints();
    } catch (error) {
      handleSaveError(error);
    } finally {
      setLoadingState('idle');
      setTimeout(() => setFeedbackMessage(null), FEEDBACK_AUTO_HIDE_MS);
    }
  }, [
    pendingChanges,
    pendingHandlerChanges,
    handleSaveStart,
    handleSaveSuccess,
    handleSaveError,
    fetchEndpoints,
  ]);

  const discardChanges = useCallback(() => {
    setPendingChanges({});
    setPendingHandlerChanges({});
  }, []);

  useEffect(() => {
    fetchEndpoints().catch(console.error);
  }, [fetchEndpoints]);

  const onReload = useCallback(() => {
    fetchEndpoints().catch(console.error);
  }, [fetchEndpoints]);

  useReloadSubscription(onReload);

  const pendingChangeKeys = useMemo(() => new Set(Object.keys(pendingChanges)), [pendingChanges]);

  const totalPendingCount = useMemo(
    () => new Set([...Object.keys(pendingChanges), ...Object.keys(pendingHandlerChanges)]).size,
    [pendingChanges, pendingHandlerChanges],
  );

  return {
    endpoints,
    loadingState,
    feedbackMessage,
    pendingChangeKeys,
    pendingHandlerChanges,
    totalPendingCount,
    onAddPendingEndpoint,
    onAddPendingHandlerChange,
    onOpenEndpointFile,
    discardChanges,
    saveChanges,
  };
}
