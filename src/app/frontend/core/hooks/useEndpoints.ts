import type { AxiosInstance, AxiosResponse } from 'axios';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { ControlValue } from '../../../../types/dynamic-endpoints.types';
import type { Endpoint, Endpoints } from '../../../../types/endpoints.types';

export type LoadingState = 'idle' | 'fetching' | 'saving';

export type FeedbackMessage = {
  text: string;
  type: 'success' | 'error' | 'info';
  // Mensagem de rotina (ex.: cada recarga ao vivo). Shells com feedback visual próprio
  // (a web usa uma barra de progresso) podem ignorá-la; a TUI continua mostrando.
  quiet?: boolean;
};

const FEEDBACK_AUTO_HIDE_MS = 3000;

// O servidor responde { error: "mensagem" } nas recusas; mostra essa mensagem em vez de um texto genérico
function readServerErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: { error?: unknown } } })?.response?.data;
  return typeof data?.error === 'string' && data.error ? data.error : fallback;
}

export type UseEndpointsOptions = {
  apiClient: AxiosInstance;
  // Cada shell tem seu próprio transporte de live-reload (SSE via EventSource no
  // browser, fetch manual parseando SSE no Node) — só a assinatura é compartilhada.
  useReloadSubscription: (onReload: () => void) => void;
  // Permite que um shell intercepte "abrir arquivo" antes da chamada padrão à API
  // (ex.: a TUI abre o nvim numa aba do tmux em vez de pedir pro server abrir o
  // VS Code). Retornar uma mensagem de feedback marca o evento como tratado.
  onBeforeOpenFile?: (fileName: string) => string | null;
};

export function useEndpoints({
  apiClient,
  useReloadSubscription,
  onBeforeOpenFile,
}: UseEndpointsOptions) {
  const [endpoints, setEndpoints] = useState<Endpoints | null>({ listEndpoints: [] });
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Endpoint>>({});
  const [pendingHandlerChanges, setPendingHandlerChanges] = useState<Record<string, string>>({});

  const handleFetchStart = useCallback(() => {
    setLoadingState('fetching');
    setFeedbackMessage({ text: 'Carregando endpoints...', type: 'info', quiet: true });
  }, []);

  const handleFetchSuccess = useCallback((response: AxiosResponse<Endpoints>) => {
    if (response.status === 200) {
      setEndpoints(response.data);
      setFeedbackMessage({
        text: 'Endpoints carregados com sucesso!',
        type: 'success',
        quiet: true,
      });
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
  }, [apiClient, handleFetchStart, handleFetchSuccess, handleFetchError]);

  const onAddPendingEndpoint = useCallback((endpoint: Endpoint) => {
    setPendingChanges((prev) => {
      // Se o endpoint já estiver pendente, remove das pendências (toggle)
      if (endpoint.fileName in prev) {
        const { [endpoint.fileName]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [endpoint.fileName]: endpoint };
    });
  }, []);

  const onOpenEndpointFile = useCallback(
    async (fileName: string) => {
      const handledMessage = onBeforeOpenFile?.(fileName) ?? null;
      if (handledMessage) {
        setFeedbackMessage({ text: handledMessage, type: 'info' });
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
    },
    [apiClient, onBeforeOpenFile],
  );

  const onAddPendingHandlerChange = useCallback(
    (fileName: string, handlerKey: string) => {
      setPendingHandlerChanges((prev) => {
        const originalHandlerKey = endpoints?.listEndpoints.find(
          (ep) => ep.fileName === fileName,
        )?.activeHandlerKey;

        // Se o handler escolhido é o mesmo que já estava salvo, remove das pendências
        if (handlerKey === originalHandlerKey) {
          const { [fileName]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [fileName]: handlerKey };
      });
    },
    [endpoints],
  );

  // Controles valem na hora (não passam pelo "salvar"): a tela atualiza antes da resposta e
  // volta ao valor do servidor se ele recusar.
  const changeControlValue = useCallback(
    async (fileName: string, key: string, value: ControlValue) => {
      setEndpoints((prev) =>
        prev
          ? {
              listEndpoints: prev.listEndpoints.map((endpoint) =>
                endpoint.fileName === fileName
                  ? {
                      ...endpoint,
                      controls: endpoint.controls.map((state) =>
                        state.key === key
                          ? { ...state, value, isDefault: value === state.control.default }
                          : state,
                      ),
                    }
                  : endpoint,
              ),
            }
          : prev,
      );

      try {
        await apiClient.post('/api/changeControlValue', [{ fileName, key, value }]);
      } catch (error) {
        setFeedbackMessage({
          text: readServerErrorMessage(error, `Erro ao alterar ${key}`),
          type: 'error',
        });
        setTimeout(() => setFeedbackMessage(null), FEEDBACK_AUTO_HIDE_MS);
        await fetchEndpoints();
      }
    },
    [apiClient, fetchEndpoints],
  );

  const resetControlValues = useCallback(
    async (fileName: string, key?: string) => {
      try {
        await apiClient.post('/api/resetControlValues', { fileName, key });
        await fetchEndpoints();
      } catch (error) {
        setFeedbackMessage({
          text: readServerErrorMessage(error, 'Erro ao restaurar os padrões'),
          type: 'error',
        });
        setTimeout(() => setFeedbackMessage(null), FEEDBACK_AUTO_HIDE_MS);
      }
    },
    [apiClient, fetchEndpoints],
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
    apiClient,
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
    changeControlValue,
    resetControlValues,
    discardChanges,
    saveChanges,
  };
}
