import { useState } from 'react';

import type { PendingApproval } from '../hooks/useAgentApprovals';
import styles from './AgentApprovalsPanel.module.css';
import { Icon } from './Icon';

type AgentApprovalsPanelProps = {
  pendingApprovals: PendingApproval[];
  errorMessage: string | null;
  onApprove: (items: PendingApproval[]) => void;
};

export const AgentApprovalsPanel = ({
  pendingApprovals,
  errorMessage,
  onApprove,
}: AgentApprovalsPanelProps) => {
  // Recolhido por padrão: o aviso chama atenção sem empurrar a lista para baixo
  const [isExpanded, setIsExpanded] = useState(false);

  if (pendingApprovals.length === 0 && !errorMessage) return null;

  const count = pendingApprovals.length;

  return (
    <section className={styles.panel} aria-label="Aprovações pendentes para agente">
      <div className={styles.header}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={isExpanded}
          aria-controls="agent-approvals-list"
          onClick={() => setIsExpanded((expanded) => !expanded)}
        >
          <Icon name="robot" size={16} />
          <span>
            {count === 1
              ? '1 handler aguarda sua aprovação para uso por agente'
              : `${count} handlers aguardam sua aprovação para uso por agente`}
          </span>
          <Icon name="chevron" size={16} className={styles.chevron} />
        </button>
        {count > 1 && (
          <button
            type="button"
            className={styles.approve}
            onClick={() => onApprove(pendingApprovals)}
          >
            Aprovar todos
          </button>
        )}
      </div>

      {isExpanded && (
        <div id="agent-approvals-list" className={styles.list}>
          {pendingApprovals.map((item) => (
            <article key={`${item.fileName}/${item.handlerKey}`} className={styles.item}>
              <div className={styles.itemHeader}>
                <strong>{item.handlerKey}</strong>
                <span className={styles.fileName}>
                  <Icon name="file" size={12} /> {item.fileName}
                </span>
                <span className={styles.description}>{item.description}</span>
                <button type="button" className={styles.approve} onClick={() => onApprove([item])}>
                  <Icon name="check" size={14} /> Aprovar
                </button>
              </div>

              <div className={styles.codeColumns}>
                <div>
                  <div className={styles.codeLabel}>Aprovado antes</div>
                  <pre className={styles.code}>
                    {item.approvedSource ?? '(handler novo — nunca aprovado)'}
                  </pre>
                </div>
                <div>
                  <div className={styles.codeLabel}>Código atual</div>
                  <pre className={styles.code}>{item.source}</pre>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {errorMessage && (
        <p className={styles.error} role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
};
