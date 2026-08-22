import { useEndpoints as useCoreEndpoints } from '../../core/hooks/useEndpoints';
import { apiClient } from '../api-client';
import { openInTmuxNvim } from '../open-in-tmux-nvim';
import { useReloadSubscription } from './useReloadSubscription';

export type { FeedbackMessage, LoadingState } from '../../core/hooks/useEndpoints';

// Dentro de uma sessão tmux, abre o nvim numa aba nova em vez de pedir ao
// server pra abrir o VS Code — mantém o fluxo todo no terminal.
function onBeforeOpenFile(fileName: string): string | null {
  if (openInTmuxNvim(fileName)) {
    return `Abrindo ${fileName} no nvim (aba do tmux)...`;
  }
  return null;
}

export function useEndpoints() {
  return useCoreEndpoints({ apiClient, useReloadSubscription, onBeforeOpenFile });
}
