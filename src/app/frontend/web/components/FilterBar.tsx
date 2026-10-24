import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

import styles from './FilterBar.module.css';
import { Icon } from './Icon';
import { SORT_OPTIONS, type SortKey, type SortState } from './ListEndpoints/sortEndpoints';
import { STATUS_TABS, type StatusFilter } from './ListEndpoints/statusFilter';

type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
  statusFilter: StatusFilter;
  statusCounts: Record<StatusFilter, number>;
  onStatusChange: (status: StatusFilter) => void;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  /** Janela estreita: estado, ordenação e `children` (tags) vão para uma gaveta atrás de "Filtros". */
  isCompact: boolean;
  /** Filtros ligados (além da busca), mostrados como chips removíveis quando compacto. */
  activeFilters: ActiveFilter[];
  /** Quantos endpoints o filtro atual mostra: o rótulo do botão que fecha a gaveta. */
  resultCount: number;
  onClearFilters: () => void;
  /** Outros controles de filtro (as tags): ficam na linha normal ou dentro da gaveta. */
  children?: ReactNode;
};

export type ActiveFilter = { id: string; label: string; onRemove: () => void };

export const FilterBar = ({
  value,
  onChange,
  statusFilter,
  statusCounts,
  onStatusChange,
  sort,
  onSortChange,
  isCompact,
  activeFilters,
  resultCount,
  onClearFilters,
  children,
}: FilterBarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const sortSelectId = useId();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const sheetRef = useRef<HTMLDialogElement>(null);

  // <dialog> modal nativo (foco preso, Esc, fundo escurecido); só existe em janela estreita
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    if (isSheetOpen && !sheet.open) sheet.showModal();
    if (!isSheetOpen && sheet.open) sheet.close();
  }, [isSheetOpen, isCompact]);

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

  const searchBox = (
    <div className={styles.search}>
      <Icon name="search" size={16} className={styles.searchIcon} />
      <input
        ref={inputRef}
        className={styles.input}
        type="search"
        aria-label="Filtrar endpoints"
        placeholder={
          isCompact
            ? 'Filtrar endpoints…'
            : 'Filtrar por título, descrição, endereço, método ou tag…'
        }
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
  );

  const statusTabs = (
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
  );

  const sortControl = (
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
  );

  if (!isCompact) {
    return (
      <>
        <div className={styles.bar}>
          {searchBox}
          {statusTabs}
          {sortControl}
        </div>
        {children}
      </>
    );
  }

  return (
    <>
      <div className={styles.bar} data-compact>
        {searchBox}
        <button
          type="button"
          className={styles.filtersButton}
          aria-haspopup="dialog"
          onClick={() => setIsSheetOpen(true)}
        >
          Filtros
          {activeFilters.length > 0 && (
            <span className={styles.filtersCount}>{activeFilters.length}</span>
          )}
        </button>
      </div>

      {/* Com a gaveta fechada o filtro continua visível e removível: ele nunca some */}
      {activeFilters.length > 0 && (
        <ul className={styles.activeList} aria-label="Filtros ativos">
          {activeFilters.map(({ id, label, onRemove }) => (
            <li key={id}>
              <button
                type="button"
                className={styles.activeChip}
                aria-label={`Remover filtro ${label}`}
                onClick={onRemove}
              >
                {label}
                <Icon name="close" size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <dialog
        ref={sheetRef}
        className={styles.sheet}
        aria-labelledby="filters-sheet-title"
        onClose={() => setIsSheetOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsSheetOpen(false);
        }}
      >
        <header className={styles.sheetHeader}>
          <h2 id="filters-sheet-title" className={styles.sheetTitle}>
            Filtros
          </h2>
          <button
            type="button"
            className={styles.sheetClose}
            aria-label="Fechar filtros"
            onClick={() => setIsSheetOpen(false)}
          >
            <Icon name="close" size={18} />
          </button>
        </header>

        <div className={styles.sheetBody}>
          {statusTabs}
          {sortControl}
          {children}
        </div>

        <footer className={styles.sheetFooter}>
          <button
            type="button"
            className={styles.sheetClear}
            disabled={activeFilters.length === 0}
            onClick={onClearFilters}
          >
            Limpar filtros
          </button>
          <button type="button" className={styles.sheetDone} onClick={() => setIsSheetOpen(false)}>
            Ver {resultCount} {resultCount === 1 ? 'endpoint' : 'endpoints'}
          </button>
        </footer>
      </dialog>
    </>
  );
};
