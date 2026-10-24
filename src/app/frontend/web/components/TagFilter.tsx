import { useId, useState } from 'react';

import { Icon } from './Icon';
import {
  countSelectedTags,
  getTagState,
  isUntaggedSelected,
  type TagCount,
  type TagMatchMode,
  type TagSelection,
  type TagState,
  UNTAGGED,
} from './ListEndpoints/tagFilter';
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
  /** null quando todo endpoint tem tag: o chip "Sem tag" nem aparece. */
  untagged: { count: number } | null;
  selection: TagSelection;
  mode: TagMatchMode;
  onToggleTag: (tag: string, forceExclude?: boolean) => void;
  onModeChange: (mode: TagMatchMode) => void;
  onClear: () => void;
};

type TagChipProps = {
  tag: string;
  count?: number;
  state: TagState;
  onToggle: (tag: string, forceExclude?: boolean) => void;
};

function describeChip(tag: string, state: TagState): string {
  if (tag === UNTAGGED) {
    return state === 'included'
      ? 'Remover o filtro "Sem tag"'
      : 'Mostrar só endpoints sem nenhuma tag';
  }
  if (state === 'neutral') return `Incluir a tag ${tag} (Shift+clique: excluir)`;
  if (state === 'included') return `Tag ${tag} incluída. Clique para excluir`;
  return `Tag ${tag} excluída. Clique para remover do filtro`;
}

const TagChip = ({ tag, count, state, onToggle }: TagChipProps) => {
  const isUntagged = tag === UNTAGGED;
  const isActive = state !== 'neutral';

  return (
    <button
      type="button"
      className={styles.chip}
      data-state={state}
      data-kind={isUntagged ? 'untagged' : undefined}
      data-empty={count === 0 && !isActive ? true : undefined}
      aria-label={`${isUntagged ? 'Sem tag' : tag}: ${
        { neutral: 'inativa', included: 'incluída', excluded: 'excluída' }[state]
      }${count === undefined ? '' : `, ${count}`}`}
      title={describeChip(tag, state)}
      onClick={(event) => onToggle(tag, event.shiftKey)}
    >
      {state === 'excluded' && <span className={styles.chipNot}>não</span>}
      <span className={styles.chipName}>{isUntagged ? 'Sem tag' : `#${tag}`}</span>
      {count !== undefined && <span className={styles.chipCount}>{count}</span>}
      {isActive && <Icon name="close" size={12} className={styles.chipClose} />}
    </button>
  );
};

export const TagFilter = ({
  tags,
  untagged,
  selection,
  mode,
  onToggleTag,
  onModeChange,
  onClear,
}: TagFilterProps) => {
  const [isExpanded, setIsExpanded] = useState(readStoredExpanded);
  const panelId = useId();

  if (tags.length === 0 && !untagged) return null;

  const handleToggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    storeExpanded(next);
  };

  const countsByTag = new Map(tags.map(({ tag, count }) => [tag, count]));
  if (untagged) countsByTag.set(UNTAGGED, untagged.count);
  const totalChips = tags.length + (untagged ? 1 : 0);
  const selectedCount = countSelectedTags(selection);
  // Recolhido, o resumo mostra as tags ativas: incluídas primeiro, depois as excluídas
  const activeTags = [...selection.included, ...selection.excluded];

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
          <span className={styles.toggleCount} data-active={selectedCount > 0 || undefined}>
            {selectedCount > 0 ? `${selectedCount} de ${totalChips}` : totalChips}
          </span>
        </button>

        {/* Recolhido, as tags ativas continuam visíveis e removíveis: o filtro nunca some */}
        {!isExpanded &&
          activeTags.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              count={countsByTag.get(tag)}
              state={getTagState(selection, tag)}
              onToggle={onToggleTag}
            />
          ))}

        {selectedCount > 0 && (
          <div className={styles.actions}>
            {selection.included.length > 1 && (
              <div className={styles.mode} role="group" aria-label="Combinar tags incluídas">
                <button
                  type="button"
                  aria-pressed={mode === 'all'}
                  title="O endpoint precisa ter todas as tags incluídas"
                  onClick={() => onModeChange('all')}
                >
                  Todas
                </button>
                <button
                  type="button"
                  aria-pressed={mode === 'any'}
                  title="O endpoint precisa ter ao menos uma das tags incluídas"
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
        <>
          <ul id={panelId} className={styles.panel}>
            {untagged && (
              <li>
                <TagChip
                  tag={UNTAGGED}
                  count={untagged.count}
                  state={isUntaggedSelected(selection) ? 'included' : 'neutral'}
                  onToggle={onToggleTag}
                />
              </li>
            )}
            {tags.map(({ tag, count }) => (
              <li key={tag}>
                <TagChip
                  tag={tag}
                  count={count}
                  state={getTagState(selection, tag)}
                  onToggle={onToggleTag}
                />
              </li>
            ))}
          </ul>
          <p className={styles.help}>
            Clique inclui a tag, clique de novo exclui, e uma terceira limpa. Shift+clique exclui
            direto.
          </p>
        </>
      )}
    </div>
  );
};
