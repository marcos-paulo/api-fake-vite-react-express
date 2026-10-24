import { useEffect, useId, useRef } from 'react';

import styles from './FilterBar.module.css';
import { Icon } from './Icon';
import { SORT_OPTIONS, type SortKey, type SortState } from './ListEndpoints/sortEndpoints';
import type { StatusFilter } from './ListEndpoints/statusFilter';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'enabled', label: 'Habilitados' },
  { value: 'disabled', label: 'Desabilitados' },
  { value: 'problem', label: 'Com problema' },
];

type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  statusFilter: StatusFilter;
  statusCounts: Record<StatusFilter, number>;
  onStatusChange: (status: StatusFilter) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
};

export const FilterBar = ({
  value,
  onChange,
  statusFilter,
  statusCounts,
  onStatusChange,
  sort,
  onSortChange,
}: FilterBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const sortSelectId = useId();

  // "/" ou Ctrl/Cmd+K focam a busca, como nas ferramentas de desenvolvedor mais comuns
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.matches('input, textarea, select') ?? false;
      const isShortcut =
        (event.key === '/' && !isTyping) || (event.key === 'k' && (event.ctrlKey || event.metaKey));
      if (!isShortcut) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className={styles.bar}>
      <div className={styles.search}>
        <Icon name="search" size={16} className={styles.searchIcon} />
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          aria-label="Filtrar endpoints"
          placeholder="Filtrar por título, descrição, endereço, método ou tag…"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Escape' && onChange('')}
        />
        {value ? (
          <button
            type="button"
            className={styles.clear}
            aria-label="Limpar filtro"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
          >
            <Icon name="close" size={14} />
          </button>
        ) : (
          <kbd className={styles.hint}>/</kbd>
        )}
      </div>

      <div className={styles.tabs} role="group" aria-label="Filtrar por estado">
        {STATUS_TABS.map(({ value: tabValue, label }) => (
          <button
            key={tabValue}
            type="button"
            className={styles.tab}
            aria-pressed={statusFilter === tabValue}
            data-tone={tabValue === 'problem' && statusCounts.problem > 0 ? 'error' : undefined}
            onClick={() => onStatusChange(tabValue)}
          >
            {label}
            <span className={styles.tabCount}>{statusCounts[tabValue]}</span>
          </button>
        ))}
      </div>

      <div className={styles.sort}>
        <label className={styles.sortLabel} htmlFor={sortSelectId}>
          Ordenar
        </label>
        <select
          id={sortSelectId}
          className={styles.sortSelect}
          value={sort.key}
          onChange={(e) => onSortChange({ ...sort, key: e.target.value as SortKey })}
        >
          {SORT_OPTIONS.map(({ value: optionValue, label }) => (
            <option key={optionValue} value={optionValue}>
              {label}
            </option>
          ))}
        </select>
        {/* No padrão não há o que inverter */}
        <button
          type="button"
          className={styles.sortDirection}
          data-direction={sort.direction}
          disabled={sort.key === 'default'}
          aria-label={sort.direction === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
          title={
            sort.direction === 'asc'
              ? 'Crescente (A–Z). Clique para inverter'
              : 'Decrescente (Z–A). Clique para inverter'
          }
          onClick={() =>
            onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })
          }
        >
          <Icon name="chevron" size={16} />
        </button>
      </div>
    </div>
  );
};
