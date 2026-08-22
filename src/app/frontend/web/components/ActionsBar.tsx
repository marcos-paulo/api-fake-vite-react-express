import type { CSSProperties } from 'react';

const S = {
  actionsBarStyle: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    gap: '8px',
  } satisfies CSSProperties,

  actionBarDiscardButton: (isDisabled: boolean): CSSProperties => ({
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: isDisabled ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
  }),

  actionBarSaveButton: (isDisabled: boolean): CSSProperties => ({
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isDisabled ? 'var(--color-disabled-bg)' : 'var(--color-warning)',
    color: isDisabled ? 'var(--color-text-disabled)' : 'white',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transition: 'background-color 0.2s ease',
  }),
};

type ActionsBarProps = {
  count: number;
  isDisabled: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

export const ActionsBar = ({ count, isDisabled, onDiscard, onSave }: ActionsBarProps) => {
  if (count === 0) return null;
  return (
    <div style={S.actionsBarStyle}>
      <button
        style={S.actionBarDiscardButton(isDisabled)}
        disabled={isDisabled}
        onClick={onDiscard}
      >
        Descartar ({count})
      </button>
      <button style={S.actionBarSaveButton(isDisabled)} disabled={isDisabled} onClick={onSave}>
        Salvar alterações ({count})
      </button>
    </div>
  );
};
