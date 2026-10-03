import type { CSSProperties } from 'react';

import type { PendingApproval } from '../hooks/useAgentApprovals';

const S = {
  panel: {
    flex: '0 0 auto',
    width: '100%',
    boxSizing: 'border-box',
    maxHeight: '35vh',
    overflowY: 'auto',
    margin: '0 0 8px 0',
    padding: '6px 10px',
    border: '1px solid var(--color-warning)',
    backgroundColor: 'var(--color-warning-bg)',
    borderRadius: '4px',
  } satisfies CSSProperties,

  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    fontWeight: 'bold',
    color: 'var(--color-warning)',
  } satisfies CSSProperties,

  item: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid var(--color-border-muted)',
  } satisfies CSSProperties,

  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  } satisfies CSSProperties,

  fileName: {
    fontFamily: 'monospace',
    fontSize: '0.85em',
    opacity: 0.8,
  } satisfies CSSProperties,

  codeColumns: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: '8px',
    marginTop: '4px',
  } satisfies CSSProperties,

  codeLabel: {
    fontSize: '0.75em',
    opacity: 0.7,
  } satisfies CSSProperties,

  code: {
    margin: 0,
    padding: '6px',
    maxHeight: '160px',
    overflow: 'auto',
    fontSize: '0.8em',
    backgroundColor: 'var(--color-surface)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '4px',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  } satisfies CSSProperties,

  approveButton: {
    marginLeft: 'auto',
    padding: '2px 10px',
    borderRadius: '4px',
    border: '1px solid var(--color-success)',
    backgroundColor: 'transparent',
    color: 'var(--color-success)',
    cursor: 'pointer',
    fontSize: '0.85em',
    fontWeight: 'bold',
  } satisfies CSSProperties,

  error: {
    marginTop: '6px',
    color: 'var(--color-error)',
    fontSize: '0.85em',
  } satisfies CSSProperties,
};

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
  if (pendingApprovals.length === 0 && !errorMessage) return null;

  return (
    <section style={S.panel}>
      <div style={S.header}>
        <span>
          🤖 Handlers aguardando aprovação para uso por agente ({pendingApprovals.length})
        </span>
        {pendingApprovals.length > 1 && (
          <button style={S.approveButton} onClick={() => onApprove(pendingApprovals)}>
            Aprovar todos
          </button>
        )}
      </div>

      {pendingApprovals.map((item) => (
        <div key={`${item.fileName}/${item.handlerKey}`} style={S.item}>
          <div style={S.itemHeader}>
            <strong>{item.handlerKey}</strong>
            <span style={S.fileName}>📄 {item.fileName}</span>
            <span>{item.description}</span>
            <button style={S.approveButton} onClick={() => onApprove([item])}>
              Aprovar
            </button>
          </div>

          <div style={S.codeColumns}>
            <div>
              <div style={S.codeLabel}>Aprovado antes</div>
              <pre style={S.code}>{item.approvedSource ?? '(handler novo — nunca aprovado)'}</pre>
            </div>
            <div>
              <div style={S.codeLabel}>Código atual</div>
              <pre style={S.code}>{item.source}</pre>
            </div>
          </div>
        </div>
      ))}

      {errorMessage && <div style={S.error}>{errorMessage}</div>}
    </section>
  );
};
