import { useCallback, useState } from 'react';

// Estado que sobrevive a reiniciar o app (localStorage, por visitante). Sem storage
// (janela privada) ou com valor inválido, cai no padrão e só não lembra da escolha.
function readStored<T>(key: string, fallback: T, isValid: (value: unknown) => value is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function storeValue(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sem storage disponível: só não lembra da escolha
  }
}

export function useStoredState<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (value: T | ((current: T) => T)) => void] {
  const [state, setState] = useState<T>(() => readStored(key, fallback, isValid));

  const setStoredState = useCallback(
    (value: T | ((current: T) => T)) => {
      setState((current) => {
        const next = typeof value === 'function' ? (value as (current: T) => T)(current) : value;
        storeValue(key, next);
        return next;
      });
    },
    [key],
  );

  return [state, setStoredState];
}
