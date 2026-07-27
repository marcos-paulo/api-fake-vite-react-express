import type { CSSProperties } from 'react';

const S = {
  pendingBadge: {
    marginLeft: '8px',
    color: 'var(--color-warning)',
    fontStyle: 'italic',
    fontSize: '0.8em',
    border: '1px solid var(--color-warning)',
    borderRadius: '4px',
    padding: '1px 6px',
  } satisfies CSSProperties,
};

type PendingBadgeProps = {
  isPending: boolean;
};

export const PendingBadge = ({ isPending }: PendingBadgeProps) => {
  if (!isPending) return null;
  return <span style={S.pendingBadge}>pendente</span>;
};
