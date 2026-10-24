import { useId, useState } from 'react';

import { Icon } from './Icon';
import type { TagCount, TagMatchMode } from './ListEndpoints/tagFilter';
import styles from './TagFilter.module.css';

const EXPANDED_STORAGE_KEY = 'api-fake:tag-filter-expanded';

// Recolhido por padrão: a lista cresce com o projeto e não pode empurrar os endpoints pra baixo.
// A escolha fica por visitante (localStorage); sem storage (janela privada) cai no padrão.
function readStoredExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function storeExpanded(isExpanded: boolean) {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, isExpanded ? '1' : '0');
  } catch {
    // sem storage disponível: só não lembra da escolha
  }
}

type TagFilterProps = {
  tags: TagCount[];
  selectedTags: string[];
  mode: TagMatchMode;
  onToggleTag: (tag: string) => void;
  onModeChange: (mode: TagMatchMode) => void;
  onClear: () => void;
};

type TagChipProps = {
  tag: string;
  count?: number;
  isSelected: boolean;
  onToggle: (tag: string) => void;
};

const TagChip = ({ tag, count, isSelected, onToggle }: TagChipProps) => (
  <button
    type="button"
    className={styles.chip}
    aria-pressed={isSelected}
    data-empty={count === 0 && !isSelected ? true : undefined}
    title={isSelected ? `Remover a tag ${tag} do filtro` : `Filtrar pela tag ${tag}`}
    onClick={() => onToggle(tag)}
  >
    <span className={styles.chipName}>#{tag}</span>
    {count !== undefined && <span className={styles.chipCount}>{count}</span>}
    {isSelected && <Icon name="close" size={12} className={styles.chipClose} />}
  </button>
);

export const TagFilter = ({
  tags,
  selectedTags,
  mode,
  onToggleTag,
  onModeChange,
  onClear,
}: TagFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(readStoredExpanded);
  const panelId = useId();

  if (tags.length === 0) return null;

  const handleToggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    storeExpanded(next);
  };

  const countsByTag = new Map(tags.map(({ tag, count }) => [tag, count]));

  return (
    <div className={styles.root} role="group" aria-label="Filtrar por tag">
      <div className={styles.row}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={isExpanded}
          aria-controls={panelId}
          onClick={handleToggleExpanded}
        >
          <Icon name="chevron" size={16} className={styles.toggleIcon} />
          Tags
          <span className={styles.toggleCount} data-active={selectedTags.length > 0 || undefined}>
            {selectedTags.length > 0 ? `${selectedTags.length} de ${tags.length}` : tags.length}
          </span>
        </button>

        {/* Recolhido, as tags marcadas continuam visíveis e removíveis: o filtro ativo nunca some */}
        {!isExpanded &&
          selectedTags.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              count={countsByTag.get(tag)}
              isSelected
              onToggle={onToggleTag}
            />
          ))}

        {selectedTags.length > 0 && (
          <div className={styles.actions}>
            {selectedTags.length > 1 && (
              <div className={styles.mode} role="group" aria-label="Combinar tags">
                <button
                  type="button"
                  aria-pressed={mode === 'all'}
                  title="O endpoint precisa ter todas as tags marcadas"
                  onClick={() => onModeChange('all')}
                >
                  Todas
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'any'}
                  title="O endpoint precisa ter ao menos uma das tags marcadas"
                  onClick={() => onModeChange('any')}
                >
                  Qualquer
                </button>
              </div>
            )}
            <button type="button" className={styles.clear} onClick={onClear}>
              Limpar tags
            </button>
          </div>
        )}
      </div>

      {isExpanded && (
        <ul id={panelId} className={styles.panel}>
          {tags.map(({ tag, count }) => (
            <li key={tag}>
              <TagChip
                tag={tag}
                count={count}
                isSelected={selectedTags.includes(tag)}
                onToggle={onToggleTag}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
