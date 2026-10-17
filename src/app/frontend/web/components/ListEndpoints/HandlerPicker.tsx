import { Fragment } from 'react';

import type { AgentHandlerState, Endpoint } from '../../../../../types/endpoints.types';
import { Icon } from '../Icon';
import styles from './HandlerPicker.module.css';

const AGENT_STATE_LABEL: Record<AgentHandlerState, string | null> = {
  approved: 'Agente pode ativar',
  pending: 'Aguardando sua aprovação',
  blocked: null,
};

// Sugere quebra de linha depois de separadores (mock_cenario_x -> mock_ / cenario_ / x) para o nome
// não partir no meio de uma palavra; sem separadores, o overflow-wrap do CSS quebra em qualquer ponto.
const renderKeyWithBreaks = (key: string) =>
  key.split(/(?<=[_\-./])/).map((part, index) => (
    // Lista derivada de uma string estática, nunca reordenada: o índice é uma chave estável aqui
    // eslint-disable-next-line react/no-array-index-key
    <Fragment key={index}>
      {index > 0 && <wbr />}
      {part}
    </Fragment>
  ));

type HandlerPickerProps = {
  endpoint: Endpoint;
  selectedKey: string;
  disabled: boolean;
  onChange: (handlerKey: string) => void;
  onRevert: () => void;
  onRevoke: (handlerKey: string) => void;
};

// Grupo de rádios nativos (<input type="radio">) estilizados como pílulas: navegação por setas,
// foco e leitor de tela vêm do navegador, sem ARIA customizado. Todas as opções ficam visíveis
// — um select esconderia justamente o estado de aprovação de cada uma.
export const HandlerPicker = ({
  endpoint,
  selectedKey,
  disabled,
  onChange,
  onRevert,
  onRevoke,
}: HandlerPickerProps) => {
  const selected = endpoint.handlerOptions.find((option) => option.key === selectedKey);
  const selectedStateLabel = selected ? AGENT_STATE_LABEL[selected.agentState] : null;
  const groupName = `handler-${endpoint.fileName}`;

  return (
    <fieldset className={styles.picker} disabled={disabled}>
      <legend className={styles.legend}>Resposta</legend>

      <div className={styles.options}>
        {endpoint.handlerOptions.map((option) => {
          const isSavedActive = option.key === endpoint.activeHandlerKey;
          return (
            <label key={option.key} className={styles.option} data-agent={option.agentState}>
              <input
                type="radio"
                name={groupName}
                className={styles.radio}
                checked={option.key === selectedKey}
                onChange={() => onChange(option.key)}
              />
              <span className={styles.pill}>
                {isSavedActive && (
                  <span
                    className={styles.activeDot}
                    role="img"
                    aria-label="ativo no servidor"
                    title="Ativo no servidor"
                  />
                )}
                <span className={styles.key}>{renderKeyWithBreaks(option.key)}</span>
                {option.agentState !== 'blocked' && (
                  <Icon name="robot" size={13} className={styles.agentIcon} />
                )}
              </span>
            </label>
          );
        })}
      </div>

      {selected && (
        <div className={styles.details}>
          <p className={styles.description}>{selected.description}</p>

          <div className={styles.meta}>
            {selectedStateLabel && (
              <span className={styles.stateChip} data-agent={selected.agentState}>
                <Icon name="robot" size={12} /> {selectedStateLabel}
              </span>
            )}
            {endpoint.activeHandlerByAgent && (
              <>
                <span className={styles.stateChip} data-agent="agent-picked">
                  escolhido por agente
                </span>
                <button
                  type="button"
                  className={styles.linkButton}
                  title="Volta para o handler que estava ativo antes da escolha do agente"
                  onClick={onRevert}
                >
                  <Icon name="undo" size={12} /> Reverter
                </button>
              </>
            )}
            {selected.agentState === 'approved' && (
              <button
                type="button"
                className={styles.linkButton}
                title="Tira a permissão do agente de ativar este handler"
                onClick={() => onRevoke(selected.key)}
              >
                Revogar aprovação
              </button>
            )}
          </div>
        </div>
      )}
    </fieldset>
  );
};
