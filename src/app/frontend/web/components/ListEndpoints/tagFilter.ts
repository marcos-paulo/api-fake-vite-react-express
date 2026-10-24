import type { Endpoint } from '../../../../../types/endpoints.types';

/** all: o endpoint precisa ter todas as tags marcadas (afunila). any: basta uma (amplia). */
export type TagMatchMode = 'all' | 'any';

export type TagCount = { tag: string; count: number };

export function matchesTags(
  endpoint: Endpoint,
  selectedTags: string[],
  mode: TagMatchMode,
): boolean {
  if (selectedTags.length === 0) return true;
  const has = (tag: string) => endpoint.tags.includes(tag);
  return mode === 'all' ? selectedTags.every(has) : selectedTags.some(has);
}

/**
 * Todas as tags existentes (`allEndpoints`) com a contagem sobre `scopedEndpoints` — o resultado
 * dos outros filtros. Uma tag sem resultado continua na lista, com contagem 0, em vez de sumir.
 * A ordem (mais usadas no total, depois alfabética) não depende do escopo: os chips não trocam
 * de lugar sob o cursor a cada clique.
 */
export function countByTag(allEndpoints: Endpoint[], scopedEndpoints: Endpoint[]): TagCount[] {
  const totals = new Map<string, number>();
  for (const endpoint of allEndpoints) {
    for (const tag of endpoint.tags) totals.set(tag, (totals.get(tag) ?? 0) + 1);
  }

  const scoped = new Map<string, number>();
  for (const endpoint of scopedEndpoints) {
    for (const tag of endpoint.tags) scoped.set(tag, (scoped.get(tag) ?? 0) + 1);
  }

  return [...totals]
    .sort(([tagA, totalA], [tagB, totalB]) => totalB - totalA || tagA.localeCompare(tagB))
    .map(([tag]) => ({ tag, count: scoped.get(tag) ?? 0 }));
}
