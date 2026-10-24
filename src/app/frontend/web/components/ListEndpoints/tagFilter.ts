import type { Endpoint } from '../../../../../types/endpoints.types';

/** all: o endpoint precisa ter todas as tags incluídas (afunila). any: basta uma (amplia). */
export type TagMatchMode = 'all' | 'any';

/** Estado de uma tag no filtro: neutra, incluída (precisa ter) ou excluída (não pode ter). */
export type TagState = 'neutral' | 'included' | 'excluded';

export type TagSelection = {
  included: string[];
  excluded: string[];
};

export type TagCount = { tag: string; count: number };

export const EMPTY_TAG_SELECTION: TagSelection = { included: [], excluded: [] };

/**
 * Valor reservado em `included` para "só endpoints sem nenhuma tag". String vazia nunca é uma
 * tag real: o backend descarta tags vazias ao carregar o endpoint.
 */
export const UNTAGGED = '';

export const isUntaggedSelected = (selection: TagSelection) =>
  selection.included.includes(UNTAGGED);

export const countSelectedTags = (selection: TagSelection) =>
  selection.included.length + selection.excluded.length;

export function getTagState(selection: TagSelection, tag: string): TagState {
  if (selection.included.includes(tag)) return 'included';
  if (selection.excluded.includes(tag)) return 'excluded';
  return 'neutral';
}

/**
 * Próximo estado de uma tag a cada clique: neutra → incluída → excluída → neutra.
 * Com `forceExclude` (Shift+clique) vai direto a "excluída", ou volta a neutra se já estava.
 */
export function nextTagState(current: TagState, forceExclude: boolean): TagState {
  if (forceExclude) return current === 'excluded' ? 'neutral' : 'excluded';
  if (current === 'neutral') return 'included';
  return current === 'included' ? 'excluded' : 'neutral';
}

/**
 * "Sem tag" é exclusivo: um endpoint sem tags nunca tem outra, então combinar com tags incluídas
 * daria sempre zero, e excluir tag não muda nada. Marcar um lado desmarca o outro, e "Sem tag"
 * só alterna entre ligado e desligado (não tem "excluir").
 */
export function toggleTagSelection(
  selection: TagSelection,
  tag: string,
  forceExclude = false,
): TagSelection {
  if (tag === UNTAGGED) {
    return isUntaggedSelected(selection)
      ? EMPTY_TAG_SELECTION
      : { included: [UNTAGGED], excluded: [] };
  }

  const base = isUntaggedSelected(selection) ? EMPTY_TAG_SELECTION : selection;
  const next = nextTagState(getTagState(base, tag), forceExclude);

  const included = base.included.filter((item) => item !== tag);
  const excluded = base.excluded.filter((item) => item !== tag);
  if (next === 'included') included.push(tag);
  if (next === 'excluded') excluded.push(tag);

  return { included, excluded };
}

/** Tira a tag do filtro, esteja ela incluída ou excluída (o chip "×" do resumo de filtros ativos). */
export function removeTagFromSelection(selection: TagSelection, tag: string): TagSelection {
  if (tag === UNTAGGED) return EMPTY_TAG_SELECTION;
  return {
    included: selection.included.filter((item) => item !== tag),
    excluded: selection.excluded.filter((item) => item !== tag),
  };
}

export function matchesTags(
  endpoint: Endpoint,
  selection: TagSelection,
  mode: TagMatchMode,
): boolean {
  if (isUntaggedSelected(selection)) return endpoint.tags.length === 0;

  const has = (tag: string) => endpoint.tags.includes(tag);
  if (selection.excluded.some(has)) return false;
  if (selection.included.length === 0) return true;

  return mode === 'all' ? selection.included.every(has) : selection.included.some(has);
}

export function countUntagged(endpoints: Endpoint[]): number {
  return endpoints.filter((endpoint) => endpoint.tags.length === 0).length;
}

/**
 * Todas as tags existentes (`allEndpoints`) com a contagem sobre `scopedEndpoints` (o resultado
 * dos outros filtros, ainda sem aplicar as exclusões). Cada número é o que o clique mudaria:
 * numa tag neutra ou incluída, quantos endpoints ela traz; numa excluída, quantos ela esconde.
 * As exclusões das *outras* tags já valem, pois escondem endpoints de qualquer jeito.
 * A ordem (mais usadas no total, depois alfabética) não depende do escopo: os chips não trocam
 * de lugar sob o cursor a cada clique.
 */
export function countByTag(
  allEndpoints: Endpoint[],
  scopedEndpoints: Endpoint[],
  excluded: string[],
): TagCount[] {
  const totals = new Map<string, number>();
  for (const endpoint of allEndpoints) {
    for (const tag of endpoint.tags) totals.set(tag, (totals.get(tag) ?? 0) + 1);
  }

  return [...totals]
    .sort(([tagA, totalA], [tagB, totalB]) => totalB - totalA || tagA.localeCompare(tagB))
    .map(([tag]) => {
      const otherExclusions = excluded.filter((item) => item !== tag);
      const count = scopedEndpoints.filter(
        (endpoint) =>
          endpoint.tags.includes(tag) &&
          !otherExclusions.some((item) => endpoint.tags.includes(item)),
      ).length;
      return { tag, count };
    });
}
