import type { CSSProperties } from 'react';

const S = {
  filterBar: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '12px',
  } satisfies CSSProperties,

  filterInput: {
    flex: 1,
    padding: '8px 8px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-secondary)',
    fontSize: '14px',
    outline: 'none',
  } satisfies CSSProperties,

  filterClearButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '14px',
  } satisfies CSSProperties,
};

type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export const FilterBar = ({ value, onChange }: FilterBarProps) => (
  <div style={S.filterBar}>
    <input
      style={S.filterInput}
      type="text"
      placeholder="Filtrar por descrição, endereço, método ou tag..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button style={S.filterClearButton} onClick={() => onChange('')}>
        ✕
      </button>
    )}
  </div>
);
