import { Box, Text, useInput } from 'ink';
import { useRef } from 'react';
import wrapAnsi from 'wrap-ansi';

import type { Endpoint, Endpoints } from '../../types/endpoints.types';
import { useTerminalSize } from '../hooks/useTerminalSize';
import {
  ADDRESS_SEPARATOR,
  DUPLICATE_BADGE,
  EndpointRow,
  ERROR_BADGE,
  ERROR_DESCRIPTION_FALLBACK,
  HANDLER_LABEL,
  PENDING_BADGE,
} from './EndpointRow';

type EndpointListProps = {
  endpoints: Endpoints | null;
  isActive: boolean;
  isLoading: boolean;
  pendingChanges: Set<string>;
  pendingHandlerChanges: Record<string, string>;
  focusedFileName: string | null;
  onFocusChange: (fileName: string) => void;
  onToggleEndpoint: (endpoint: Endpoint) => void;
  onCycleHandler: (fileName: string, direction: 1 | -1) => void;
  onOpenEndpointFile: (fileName: string) => void;
};

// Mesmo particionamento de src/client/components/ListEndpoints/ListEndpoints.tsx —
// entradas com loadError vêm primeiro, cada arquivo aparece em uma única seção.
function partitionEndpoints(endpoints: Endpoint[], pendingChanges: Set<string>) {
  const enabled = [
    ...endpoints.filter((ep) => ep.loadError && ep.enabled),
    ...endpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.fileName);
      return isPending ? !ep.enabled : ep.enabled;
    }),
  ];

  const disabled = [
    ...endpoints.filter((ep) => ep.loadError && !ep.enabled),
    ...endpoints.filter((ep) => {
      if (ep.loadError) return false;
      const isPending = pendingChanges.has(ep.fileName);
      return isPending ? ep.enabled : !ep.enabled;
    }),
  ];

  return { enabled, disabled };
}

// Indentação (marginLeft) dos campos de descrição/endereço/tags/variante de
// resposta em EndpointRow.tsx — reduz a largura disponível pra quebra de
// linha nesses campos.
const FIELD_INDENT = 4;
// Prefixo fixo antes do nome do arquivo na primeira linha: ponteiro + espaço
// + marcador "[x]"/"[ ]" + espaço. Em EndpointRow.tsx isso faz parte do
// mesmo nó de texto que o nome e os badges (ver comentário lá), então aqui
// entra como parte do texto medido, não como uma largura reduzida à parte.
const NAME_PREFIX_WIDTH = 6;

// Quantas linhas o Ink realmente usaria pra desenhar `text` num campo com
// `maxWidth` colunas — mesmo algoritmo que o Ink usa internamente
// (wrap-ansi com hard:true), pra bater exatamente com o que aparece na tela.
function countWrappedLines(text: string, maxWidth: number): number {
  if (text.length === 0 || maxWidth <= 0) return 1;
  return wrapAnsi(text, Math.max(maxWidth, 1), { trim: false, hard: true }).split('\n').length;
}

// Altura em linhas que cada EndpointRow vai ocupar de fato (ver
// EndpointRow.tsx), considerando quebra de linha automática do Ink quando um
// campo (descrição, endereço, tags...) é mais largo que o terminal — sem
// isso, um item que quebra em 2+ linhas fura o orçamento calculado e faz o
// resto da tela (inclusive o título) pular.
function estimateRowHeight(
  endpoint: Endpoint,
  isPending: boolean,
  pendingHandlerKey: string | undefined,
  columns: number,
): number {
  const isError = endpoint.loadError;
  const fieldWidth = columns - FIELD_INDENT;

  const nameLine =
    ' '.repeat(NAME_PREFIX_WIDTH) +
    endpoint.fileName +
    (isError ? ERROR_BADGE : '') +
    (endpoint.isDuplicate ? DUPLICATE_BADGE : '') +
    (isPending ? PENDING_BADGE : '');
  const descriptionLine = isError ? ERROR_DESCRIPTION_FALLBACK : endpoint.description;
  const addressLine = `${endpoint.serverAddress}${ADDRESS_SEPARATOR}${endpoint.localhostAddress}`;

  let lines =
    countWrappedLines(nameLine, columns) +
    countWrappedLines(descriptionLine, fieldWidth) +
    countWrappedLines(addressLine, fieldWidth) +
    1; // marginBottom em branco após a row

  if (endpoint.tags.length > 0) {
    const tagsLine = endpoint.tags.map((tag) => `#${tag}`).join(' ');
    lines += countWrappedLines(tagsLine, fieldWidth);
  }

  if (endpoint.handlerOptions.length > 1) {
    const activeHandlerKey = pendingHandlerKey ?? endpoint.activeHandlerKey;
    const activeOption = endpoint.handlerOptions.find((option) => option.key === activeHandlerKey);
    const handlerLine = `${HANDLER_LABEL}${activeOption?.description ?? activeHandlerKey}`;
    lines += countWrappedLines(handlerLine, fieldWidth);
  }

  return lines;
}

// Linhas fixas fora das seções da lista: título (2), barra de filtro (3),
// margem acima da lista (1), margem abaixo da seção "Habilitados" (1) e a
// status bar (6). Diferente de uma constante "chutada", isso é a soma exata
// do que sempre é renderizado — nunca varia com o conteúdo da lista.
const FIXED_CHROME_LINES = 2 + 3 + 1 + 1 + 6;

// Linhas que uma seção (Habilitados/Desabilitados) ocupa fora dos próprios
// itens: o cabeçalho, mais a mensagem "Nenhum endpoint..." (quando vazia) ou
// os slots fixos "↑ acima"/"↓ abaixo" (quando não) — esses slots são
// renderizados sempre que a seção tem itens, ficando em branco quando não há
// nada escondido pra cima/baixo, em vez de sumir da tela. Isso evita que o
// resto do layout (próxima seção, status bar) pule de posição só porque um
// indicador apareceu/desapareceu durante a rolagem.
function sectionChromeLines(sectionLength: number): number {
  return 1 + (sectionLength === 0 ? 1 : 4);
}

// Janela de rolagem estável: em vez de recentralizar a lista inteira a cada
// mudança de foco (o que fazia a quantidade de itens visíveis, e portanto a
// altura total do frame, variar a cada tecla e "piscar"), mantemos o início
// da janela (`windowStartRef`) entre renders e só o deslocamos o mínimo
// necessário pra manter o item focado visível — igual ao comportamento de
// listas em vim/less/fzf.
function computeVisibleWindow(
  heights: number[],
  focusedIndex: number,
  budget: number,
  windowStartRef: { current: number },
) {
  if (heights.length === 0) {
    windowStartRef.current = 0;
    return { start: 0, end: 0 };
  }

  const focus = Math.min(Math.max(focusedIndex, 0), heights.length - 1);
  let start = Math.min(Math.max(windowStartRef.current, 0), heights.length - 1);

  if (focus < start) {
    start = focus;
  } else {
    let used = 0;
    for (let i = start; i <= focus; i += 1) used += heights[i];
    while (used > budget && start < focus) {
      used -= heights[start];
      start += 1;
    }
  }

  let end = start;
  let used = 0;
  while (end < heights.length && used + heights[end] <= budget) {
    used += heights[end];
    end += 1;
  }
  if (end === start) end = start + 1;

  windowStartRef.current = start;
  return { start, end };
}

function hiddenCounts(
  sectionStart: number,
  sectionLength: number,
  windowStart: number,
  windowEnd: number,
) {
  const sectionEnd = sectionStart + sectionLength;
  const hiddenAbove = Math.max(0, Math.min(windowStart, sectionEnd) - sectionStart);
  const hiddenBelow = Math.max(0, sectionEnd - Math.max(windowEnd, sectionStart));
  return { hiddenAbove, hiddenBelow };
}

export const EndpointList = ({
  endpoints,
  isActive,
  isLoading,
  pendingChanges,
  pendingHandlerChanges,
  focusedFileName,
  onFocusChange,
  onToggleEndpoint,
  onCycleHandler,
  onOpenEndpointFile,
}: EndpointListProps) => {
  const { rows, columns } = useTerminalSize();
  const allEndpoints = endpoints?.listEndpoints ?? [];
  const { enabled, disabled } = partitionEndpoints(allEndpoints, pendingChanges);
  const flatList = [...enabled, ...disabled];

  const focusedIndex = Math.max(
    0,
    flatList.findIndex((ep) => ep.fileName === focusedFileName),
  );
  const focusedEndpoint = flatList[focusedIndex];

  useInput(
    (input, key) => {
      if (isLoading || flatList.length === 0) return;

      if (key.downArrow || input === 'j') {
        const next = flatList[Math.min(focusedIndex + 1, flatList.length - 1)];
        if (next) onFocusChange(next.fileName);
      } else if (key.upArrow || input === 'k') {
        const prev = flatList[Math.max(focusedIndex - 1, 0)];
        if (prev) onFocusChange(prev.fileName);
      } else if ((input === ' ' || key.return) && focusedEndpoint && !focusedEndpoint.loadError) {
        onToggleEndpoint(focusedEndpoint);
      } else if (key.rightArrow && focusedEndpoint && focusedEndpoint.handlerOptions.length > 1) {
        onCycleHandler(focusedEndpoint.fileName, 1);
      } else if (key.leftArrow && focusedEndpoint && focusedEndpoint.handlerOptions.length > 1) {
        onCycleHandler(focusedEndpoint.fileName, -1);
      } else if (input === 'o' && focusedEndpoint) {
        onOpenEndpointFile(focusedEndpoint.fileName);
      }
    },
    { isActive },
  );

  const windowStartRef = useRef(0);
  const chromeLines =
    FIXED_CHROME_LINES + sectionChromeLines(enabled.length) + sectionChromeLines(disabled.length);
  const budget = Math.max(rows - chromeLines, 0);
  const heights = flatList.map((endpoint) =>
    estimateRowHeight(
      endpoint,
      pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges,
      pendingHandlerChanges[endpoint.fileName],
      columns,
    ),
  );
  const { start, end } = computeVisibleWindow(heights, focusedIndex, budget, windowStartRef);

  const enabledWindow = hiddenCounts(0, enabled.length, start, end);
  const disabledWindow = hiddenCounts(enabled.length, disabled.length, start, end);

  const visibleEnabled = enabled.slice(
    enabledWindow.hiddenAbove,
    enabled.length - enabledWindow.hiddenBelow,
  );
  const visibleDisabled = disabled.slice(
    disabledWindow.hiddenAbove,
    disabled.length - disabledWindow.hiddenBelow,
  );

  return (
    <Box flexDirection="column">
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="green">
          Habilitados ({enabled.length})
        </Text>
        {enabled.length === 0 && <Text dimColor>  Nenhum endpoint habilitado</Text>}
        {enabled.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              {enabledWindow.hiddenAbove > 0 ? `  ↑ +${enabledWindow.hiddenAbove} acima` : ' '}
            </Text>
          </Box>
        )}
        {visibleEnabled.map((endpoint) => (
          <EndpointRow
            key={endpoint.serverAddress + endpoint.fileName}
            endpoint={endpoint}
            displayEnabled
            isFocused={endpoint.fileName === focusedEndpoint?.fileName}
            isPending={
              pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges
            }
            pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
          />
        ))}
        {enabled.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              {enabledWindow.hiddenBelow > 0 ? `  ↓ +${enabledWindow.hiddenBelow} abaixo` : ' '}
            </Text>
          </Box>
        )}
      </Box>

      <Box flexDirection="column">
        <Text bold color="gray">
          Desabilitados ({disabled.length})
        </Text>
        {disabled.length === 0 && <Text dimColor>  Nenhum endpoint desabilitado</Text>}
        {disabled.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              {disabledWindow.hiddenAbove > 0 ? `  ↑ +${disabledWindow.hiddenAbove} acima` : ' '}
            </Text>
          </Box>
        )}
        {visibleDisabled.map((endpoint) => (
          <EndpointRow
            key={endpoint.fileName}
            endpoint={endpoint}
            displayEnabled={false}
            isFocused={endpoint.fileName === focusedEndpoint?.fileName}
            isPending={
              pendingChanges.has(endpoint.fileName) || endpoint.fileName in pendingHandlerChanges
            }
            pendingHandlerKey={pendingHandlerChanges[endpoint.fileName]}
          />
        ))}
        {disabled.length > 0 && (
          <Box marginTop={1}>
            <Text dimColor>
              {disabledWindow.hiddenBelow > 0 ? `  ↓ +${disabledWindow.hiddenBelow} abaixo` : ' '}
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
};
