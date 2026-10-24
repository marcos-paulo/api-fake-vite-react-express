import type { Endpoint } from '../../../../../types/endpoints.types';

/** default: a ordem em que o servidor carregou os arquivos (não mexe na lista). */
export type SortKey = 'default' | 'title' | 'description' | 'address' | 'method' | 'file';
export type SortDirection = 'asc' | 'desc';

export type SortState = {
  key: SortKey;
  direction: SortDirection;
};

export const DEFAULT_SORT: SortState = { key: 'default', direction: 'asc' };

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'default', label: 'Padrão' },
  { value: 'title', label: 'Título' },
  { value: 'description', label: 'Descrição' },
  { value: 'address', label: 'Endereço' },
  { value: 'method', label: 'Método' },
  { value: 'file', label: 'Arquivo' },
];

const STORAGE_KEY = 'api-fake:sort';

// "numeric" faz endpoint2 vir antes de endpoint10; "base" ignora acento e caixa
const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });

const sortValues: Record<Exclude<SortKey, 'default'>, (endpoint: Endpoint) => string> = {
  title: (endpoint) => endpoint.title,
  description: (endpoint) => endpoint.description,
  address: (endpoint) => endpoint.serverAddress,
  method: (endpoint) => endpoint.method,
  file: (endpoint) => endpoint.fileName,
};

/**
 * Cópia ordenada. Valor vazio (endpoint sem título, arquivo com erro) vai sempre para o fim, nas
 * duas direções: inverter a ordem não deve trazer os "sem valor" para o topo. O nome do arquivo
 * desempata, então a ordem é estável e previsível.
 */
export function sortEndpoints(endpoints: Endpoint[], { key, direction }: SortState): Endpoint[] {
  if (key === 'default') return endpoints;

  const getValue = sortValues[key];
  const sign = direction === 'asc' ? 1 : -1;

  return [...endpoints].sort((a, b) => {
    const valueA = getValue(a);
    const valueB = getValue(b);

    if (valueA === '' && valueB !== '') return 1;
    if (valueA !== '' && valueB === '') return -1;

    return sign * collator.compare(valueA, valueB) || collator.compare(a.fileName, b.fileName);
  });
}

// Guardado por visitante (localStorage); sem storage ou com valor inválido cai no padrão.
export function readStoredSort(): SortState {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    const { key, direction } = (parsed ?? {}) as Partial<SortState>;
    const isValidKey = SORT_OPTIONS.some((option) => option.value === key);
    const isValidDirection = direction === 'asc' || direction === 'desc';
    return isValidKey && isValidDirection ? { key: key as SortKey, direction } : DEFAULT_SORT;
  } catch {
    return DEFAULT_SORT;
  }
}

export function storeSort(sort: SortState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sort));
  } catch {
    // sem storage disponível: só não lembra da escolha
  }
}
