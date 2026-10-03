import { type CSSProperties, useEffect, useState } from 'react';

import { saveStoredToken, TOKEN_REQUIRED_EVENT, type TokenRequiredDetail } from '../panel-token';

const S = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    zIndex: 1000,
  } satisfies CSSProperties,

  dialog: {
    width: 'min(520px, 90vw)',
    padding: '16px',
    border: '1px solid var(--color-warning)',
    borderRadius: '8px',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text)',
  } satisfies CSSProperties,

  title: {
    margin: '0 0 8px 0',
    color: 'var(--color-warning)',
  } satisfies CSSProperties,

  path: {
    fontFamily: 'monospace',
    fontSize: '0.85em',
    wordBreak: 'break-all',
  } satisfies CSSProperties,

  input: {
    width: '100%',
    boxSizing: 'border-box',
    margin: '8px 0',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid var(--color-border-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    fontFamily: 'monospace',
  } satisfies CSSProperties,

  buttons: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
  } satisfies CSSProperties,

  button: {
    padding: '4px 12px',
    borderRadius: '4px',
    border: '1px solid var(--color-border-muted)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text)',
    cursor: 'pointer',
  } satisfies CSSProperties,
};

/**
 * Pede o token do painel quando o servidor recusa uma ação (401). Depois de salvar o token,
 * a pessoa repete a ação — a chamada recusada não é reenviada sozinha.
 */
export const PanelTokenGate = () => {
  const [tokenFile, setTokenFile] = useState<string | null | undefined>(undefined);
  const [value, setValue] = useState('');

  useEffect(() => {
    const handleTokenRequired = (event: Event) => {
      setTokenFile((event as CustomEvent<TokenRequiredDetail>).detail.tokenFile ?? null);
    };

    window.addEventListener(TOKEN_REQUIRED_EVENT, handleTokenRequired);
    return () => window.removeEventListener(TOKEN_REQUIRED_EVENT, handleTokenRequired);
  }, []);

  if (tokenFile === undefined) return null;

  const handleSubmit = () => {
    if (!value.trim()) return;
    saveStoredToken(value);
    setValue('');
    setTokenFile(undefined);
  };

  return (
    <div style={S.backdrop}>
      <form
        style={S.dialog}
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit();
        }}
      >
        <h3 style={S.title}>Token do painel</h3>
        <div>
          Essa ação é de humano e exige o token do painel. Ele fica neste arquivo, na sua máquina:
        </div>
        {tokenFile && <div style={S.path}>{tokenFile}</div>}
        <input
          style={S.input}
          type="password"
          autoFocus
          placeholder="Cole o token aqui"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <div style={S.buttons}>
          <button type="button" style={S.button} onClick={() => setTokenFile(undefined)}>
            Cancelar
          </button>
          <button type="submit" style={S.button}>
            Salvar token
          </button>
        </div>
      </form>
    </div>
  );
};
