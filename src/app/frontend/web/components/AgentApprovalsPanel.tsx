import { useEffect, useRef, useState } from 'react';

import type { PendingApproval } from '../hooks/useAgentApprovals';
import styles from './AgentApprovalsPanel.module.css';
import { Icon } from './Icon';

type AgentApprovalsPanelProps = {
  pendingApprovals: PendingApproval[];
  errorMessage: string | null;
  onApprove: (items: PendingApproval[]) => void;
  /** Nome legível do endpoint dono do arquivo (título ou endereço). */
  getEndpointLabel: (fileName: string) => string;
  onViewEndpoint: (fileName: string) => void;
};

export const AgentApprovalsPanel = ({
  pendingApprovals,
  errorMessage,
  onApprove,
  getEndpointLabel,
  onViewEndpoint,
}: AgentApprovalsPanelProps) => {
  // Chip no título (notificação sempre visível) + <dialog> modal nativo para a revisão: foco
  // preso, Esc, fundo escurecido e rolagem travada atrás vêm do navegador.
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const count = pendingApprovals.length;
  const isVisible = count > 0 || Boolean(errorMessage);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen, isVisible]);

  // Some tudo (e fecha) quando a última pendência é aprovada
  useEffect(() => {
    if (!isVisible) setIsOpen(false);
  }, [isVisible]);

  if (!isVisible) return null;

  const handleViewEndpoint = (fileName: string) => {
    setIsOpen(false);
    onViewEndpoint(fileName);
  };

  return (
    <>
      <button
        type="button"
        className={styles.chip}
        aria-haspopup="dialog"
        title={
          count === 1
            ? '1 handler aguarda sua aprovação para uso por agente'
            : `${count} handlers aguardam sua aprovação para uso por agente`
        }
        onClick={() => setIsOpen(true)}
      >
        <Icon name="robot" size={14} />
        <span>{count === 1 ? '1 aguardando aprovação' : `${count} aguardando aprovação`}</span>
      </button>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby="agent-approvals-title"
        onClose={() => setIsOpen(false)}
        // Clique no fundo escurecido (o alvo é o próprio <dialog>) fecha; nada se perde ao fechar
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false);
        }}
      >
        <header className={styles.dialogHeader}>
          <div>
            <h2 id="agent-approvals-title" className={styles.dialogTitle}>
              <Icon name="robot" size={18} /> Aprovar handlers para agentes
            </h2>
            <p className={styles.dialogHint}>
              Revise o código: depois de aprovado, o agente pode ativar este handler.
            </p>
          </div>
          <button
            type="button"
            className={styles.iconButton}
            aria-label="Fechar"
            onClick={() => setIsOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className={styles.list}>
          {pendingApprovals.map((item) => (
            <article key={`${item.fileName}/${item.handlerKey}`} className={styles.item}>
              <div className={styles.itemHeader}>
                <div className={styles.itemTitle}>
                  <strong>{getEndpointLabel(item.fileName)}</strong>
                  <span className={styles.handlerKey}>{item.handlerKey}</span>
                  <span className={styles.fileName}>
                    <Icon name="file" size={12} /> {item.fileName}
                  </span>
                </div>
                <div className={styles.itemActions}>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => handleViewEndpoint(item.fileName)}
                  >
                    <Icon name="external" size={14} /> Ver endpoint
                  </button>
                  <button
                    type="button"
                    className={styles.approve}
                    onClick={() => onApprove([item])}
                  >
                    <Icon name="check" size={14} /> Aprovar
                  </button>
                </div>
              </div>
              {item.description && <p className={styles.description}>{item.description}</p>}

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

        {errorMessage && (
          <p className={styles.error} role="alert">
            {errorMessage}
          </p>
        )}

        <footer className={styles.dialogFooter}>
          <button type="button" className={styles.secondary} onClick={() => setIsOpen(false)}>
            Fechar
          </button>
          {count > 1 && (
            <button
              type="button"
              className={styles.approveAll}
              onClick={() => onApprove(pendingApprovals)}
            >
              <Icon name="check" size={14} /> Aprovar todos ({count})
            </button>
          )}
        </footer>
      </dialog>
    </>
  );
};
