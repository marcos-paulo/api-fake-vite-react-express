import { useState } from 'react';

import { Icon } from './Icon';
import type { TagCount, TagMatchMode } from './ListEndpoints/tagFilter';
import styles from './TagFilter.module.css';

// Acima disso a linha recolhe: tags demais viram um muro de chips que empurra a lista pra baixo
const COLLAPSED_LIMIT = 10;

type TagFilterProps = {
  tags: TagCount[];
  selectedTags: string[];
  mode: TagMatchMode;
  onToggleTag: (tag: string) => void;
  onModeChange: (mode: TagMatchMode) => void;
  onClear: () => void;
};

export const TagFilter = ({
  tags,
  selectedTags,
  mode,
  onToggleTag,
  onModeChange,
  onClear,
}: TagFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (tags.length === 0) return null;

  const isCollapsible = tags.length > COLLAPSED_LIMIT;
  // Tags marcadas nunca ficam escondidas pelo recolhimento
  const visibleTags =
    isCollapsible && !isExpanded
      ? tags.filter(({ tag }, index) => index < COLLAPSED_LIMIT || selectedTags.includes(tag))
      : tags;
  const hiddenCount = tags.length - visibleTags.length;

  return (
    <div className={styles.root} role="group" aria-label="Filtrar por tag">
      <span className={styles.label}>Tags</span>

      <ul className={styles.chips}>
        {visibleTags.map(({ tag, count }) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <li key={tag}>
              <button
                type="button"
                className={styles.chip}
                aria-pressed={isSelected}
                data-empty={count === 0 && !isSelected ? true : undefined}
                title={isSelected ? `Remover a tag ${tag} do filtro` : `Filtrar pela tag ${tag}`}
                onClick={() => onToggleTag(tag)}
              >
                <span className={styles.chipName}>#{tag}</span>
                <span className={styles.chipCount}>{count}</span>
                {isSelected && <Icon name="close" size={12} className={styles.chipClose} />}
              </button>
            </li>
          );
        })}
        {isCollapsible && (
          <li>
            <button
              type="button"
              className={styles.more}
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((value) => !value)}
            >
              {isExpanded ? 'Mostrar menos' : `Mostrar todas (+${hiddenCount})`}
            </button>
          </li>
        )}
      </ul>

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
  );
};
