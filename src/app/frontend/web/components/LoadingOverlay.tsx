import type { CSSProperties } from 'react';

import type { LoadingState } from '../hooks/useEndpoints';

const S = {
  overlayBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--color-overlay-backdrop)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  } satisfies CSSProperties,

  overlayCard: {
    backgroundColor: 'var(--color-surface)',
    padding: '30px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid var(--color-border-subtle)',
  } satisfies CSSProperties,

  overlaySpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid var(--color-border)',
    borderTop: '5px solid var(--color-accent-spinner)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } satisfies CSSProperties,

  loadingText: {
    fontSize: '16px',
    color: 'var(--color-text)',
  } satisfies CSSProperties,
};

const overlayStates: Record<LoadingState, string> = {
  idle: '',
  fetching: 'Carregando...',
  saving: 'Alterando estado...',
};

type LoadingOverlayProps = {
  loadingState: LoadingState;
};

export const LoadingOverlay = ({ loadingState }: LoadingOverlayProps) => {
  if (loadingState === 'idle') return null;
  return (
    <div style={S.overlayBackdrop}>
      <div style={S.overlayCard}>
        <div style={S.overlaySpinner} />
        <span style={S.loadingText}>{overlayStates[loadingState]}</span>
      </div>
    </div>
  );
};
