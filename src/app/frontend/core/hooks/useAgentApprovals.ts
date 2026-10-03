import axios, { type AxiosInstance } from 'axios';
import { useCallback, useEffect, useState } from 'react';

export type PendingApproval = {
  fileName: string;
  handlerKey: string;
  description: string;
  /** Hash do código que a pessoa revisou — o servidor recusa se o arquivo mudou depois. */
  hash: string;
  source: string;
  /** Código aprovado antes (null = handler novo, nunca aprovado). */
  approvedSource: string | null;
};

export type UseAgentApprovalsOptions = {
  apiClient: AxiosInstance;
  // Muda a cada recarga de endpoints (SSE) — dispara nova busca dos pendentes, já que
  // editar um arquivo pode criar ou invalidar aprovações.
  refreshKey: unknown;
};

function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return 'Erro inesperado';
}

export function useAgentApprovals({ apiClient, refreshKey }: UseAgentApprovalsOptions) {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPendingApprovals = useCallback(async () => {
    try {
      const response = await apiClient.get<PendingApproval[]>('/api/approvals/pending');
      setPendingApprovals(response.data);
    } catch (error) {
      console.error('Erro ao buscar aprovações pendentes:', error);
    }
  }, [apiClient]);

  const handleSaveApprovalError = useCallback((error: unknown) => {
    console.error('Erro ao salvar aprovação:', error);
    setErrorMessage(extractErrorMessage(error));
  }, []);

  const saveApprovalAction = useCallback(
    async (route: string, body: unknown) => {
      setErrorMessage(null);
      try {
        await apiClient.post(route, body);
      } catch (error) {
        handleSaveApprovalError(error);
      }
      // sempre rebusca: após um 409 (código mudou) o painel passa a mostrar o código novo
      await fetchPendingApprovals();
    },
    [apiClient, handleSaveApprovalError, fetchPendingApprovals],
  );

  const approveHandlers = useCallback(
    (items: PendingApproval[]) =>
      saveApprovalAction(
        '/api/approvals/approve',
        items.map(({ fileName, handlerKey, hash }) => ({ fileName, handlerKey, hash })),
      ),
    [saveApprovalAction],
  );

  const revokeHandler = useCallback(
    (fileName: string, handlerKey: string) =>
      saveApprovalAction('/api/approvals/revoke', [{ fileName, handlerKey }]),
    [saveApprovalAction],
  );

  const revertAgentHandler = useCallback(
    (fileName: string) => saveApprovalAction('/api/approvals/revert-agent-handler', { fileName }),
    [saveApprovalAction],
  );

  useEffect(() => {
    fetchPendingApprovals().catch(console.error);
  }, [fetchPendingApprovals, refreshKey]);

  return {
    pendingApprovals,
    errorMessage,
    approveHandlers,
    revokeHandler,
    revertAgentHandler,
  };
}
