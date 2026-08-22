import type { CSSProperties } from 'react';

import type { FeedbackMessage } from '../hooks/useEndpoints';

const S = {
  feedback: (type: FeedbackMessage['type']): CSSProperties => ({
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    borderRadius: '8px',
    backgroundColor:
      type === 'success'
        ? 'var(--color-success)'
        : type === 'error'
          ? 'var(--color-error)'
          : 'var(--color-info)',
    color: 'white',
    fontWeight: 'bold',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out',
  }),
};

type FeedbackToastProps = {
  message: FeedbackMessage | null;
};

export const FeedbackToast = ({ message }: FeedbackToastProps) => {
  if (!message) return null;
  return <div style={S.feedback(message.type)}>{message.text}</div>;
};
