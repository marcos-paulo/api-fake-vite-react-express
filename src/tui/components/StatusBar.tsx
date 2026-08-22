import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';

import type { FeedbackMessage, LoadingState } from '../hooks/useEndpoints';

type StatusBarProps = {
  loadingState: LoadingState;
  feedbackMessage: FeedbackMessage | null;
  pendingCount: number;
};

const loadingLabels: Record<Exclude<LoadingState, 'idle'>, string> = {
  fetching: 'Carregando...',
  saving: 'Salvando alterações...',
};

const feedbackColors: Record<FeedbackMessage['type'], string> = {
  success: 'green',
  error: 'red',
  info: 'cyan',
};

export const StatusBar = ({ loadingState, feedbackMessage, pendingCount }: StatusBarProps) => (
  <Box flexDirection="column" borderStyle="single" borderColor="gray" paddingX={1} marginTop={1}>
    <Box>
      {loadingState !== 'idle' ? (
        <Text color="cyan">
          <Spinner type="dots" /> {loadingLabels[loadingState]}
        </Text>
      ) : feedbackMessage ? (
        <Text color={feedbackColors[feedbackMessage.type]}>{feedbackMessage.text}</Text>
      ) : pendingCount > 0 ? (
        <Text color="yellow">
          {pendingCount} alteração(ões) pendente(s) — s para salvar, d para descartar
        </Text>
      ) : (
        <Text dimColor>Nenhuma alteração pendente</Text>
      )}
    </Box>
    <Text dimColor>↑/↓ navegar · espaço/enter habilitar/desabilitar · ←/→ variante de resposta</Text>
    <Text dimColor>o abrir arquivo · f filtrar · s salvar · d descartar · q sair</Text>
  </Box>
);
