import type { CSSProperties } from 'react';

const S = {
  emptyMessage: {
    padding: '8px',
    opacity: 0.5,
    fontStyle: 'italic',
    fontSize: '0.9em',
  } satisfies CSSProperties,
};

type EmptyMessageProps = {
  show: boolean;
  message: string;
};

export const EmptyMessage = ({ show, message }: EmptyMessageProps) => {
  if (!show) return null;
  return <li style={S.emptyMessage}>{message}</li>;
};
