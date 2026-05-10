import type { AxiosResponse } from 'axios';
import axios from 'axios';
import { type CSSProperties, useCallback, useEffect, useState } from 'react';

import type { Endpoint, Endpoints } from '../types/Endpoints';
import { ListEndpoints } from './components/ListEndpoints';

const S = {
  // Estáticos
  overlayBackdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--color-overlay-backdrop)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  } satisfies CSSProperties,

  overlayCard: {
    backgroundColor: 'var(--color-surface)',
    padding: '30px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '15px',
    border: '1px solid var(--color-border-subtle)',
  } satisfies CSSProperties,

  overlaySpinner: {
    width: '50px',
    height: '50px',
    border: '5px solid var(--color-border)',
    borderTop: '5px solid var(--color-accent-spinner)',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  } satisfies CSSProperties,

  loadingText: {
    fontSize: '16px',
    color: 'var(--color-text)',
  } satisfies CSSProperties,

  filterBar: {
    display: 'flex',
    alignItems: 'stretch',
    gap: '12px',
  } satisfies CSSProperties,

  filterInput: {
    flex: 1,
    padding: '8px 8px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg)',
    color: 'var(--color-text-secondary)',
    fontSize: '14px',
    outline: 'none',
  } satisfies CSSProperties,

  filterClearButton: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    fontSize: '14px',
  } satisfies CSSProperties,

  actionsBarStyle: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    display: 'flex',
    gap: '8px',
  } satisfies CSSProperties,

  // Dinâmicos
  feedback: (type: FeedbackMessage['type'] | undefined): CSSProperties => ({
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '15px 20px',
    borderRadius: '8px',
    backgroundColor:
      type === 'success'
        ? 'var(--color-success)'
        : type === 'error'
          ? 'var(--color-error)'
          : 'var(--color-info)',
    color: 'white',
    fontWeight: 'bold',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    zIndex: 1000,
    animation: 'slideIn 0.3s ease-out',
  }),

  actionBarDiscardButton: (isDisabled: boolean): CSSProperties => ({
    padding: '12px 20px',
    borderRadius: '8px',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-surface-raised)',
    color: isDisabled ? 'var(--color-text-disabled)' : 'var(--color-text-secondary)',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
  }),

  actionBarSaveButton: (isDisabled: boolean): CSSProperties => ({
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: isDisabled ? 'var(--color-disabled-bg)' : 'var(--color-warning)',
    color: isDisabled ? 'var(--color-text-disabled)' : 'white',
    cursor: isDisabled ? 'not-allowed' : 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
    transition: 'background-color 0.2s ease',
  }),
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

type LoadingState = 'idle' | 'fetching' | 'saving';

export default function App() {
  const [endpoints, setEndpoints] = useState<Endpoints | null>({ listEndpoints: [] });
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [feedbackMessage, setFeedbackMessage] = useState<FeedbackMessage | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Record<string, Endpoint>>({});
  const [filterText, setFilterText] = useState('');

  const handleFetchStart = useCallback(() => {
    setLoadingState('fetching');
    setFeedbackMessage({ text: 'Carregando endpoints...', type: 'info' });
  }, []);

  const handleFetchSuccess = useCallback((response: AxiosResponse<Endpoints>) => {
    if (response.status === 200) {
      setEndpoints(response.data);
      setFeedbackMessage({ text: 'Endpoints carregados com sucesso!', type: 'success' });
    }
  }, []);

  const handleFetchError = useCallback((error: unknown) => {
    console.error('Erro ao buscar endpoints:', error);
    setEndpoints({ listEndpoints: [] });
    setFeedbackMessage({ text: 'Erro ao carregar endpoints', type: 'error' });
  }, []);

  const fetchEndpoints = useCallback(async () => {
    handleFetchStart();
    try {
      const response = await axios.get<Endpoints>('/api/endpoints');
      handleFetchSuccess(response);
    } catch (error) {
      handleFetchError(error);
    } finally {
      setLoadingState('idle');
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  }, [handleFetchStart, handleFetchSuccess, handleFetchError]);

  const onAddPendingEndpoint = useCallback((endpoint: Endpoint) => {
    setPendingChanges((prev) => {
      // Se o endpoint já estiver pendente, remove das pendências (toggle)
      if (endpoint.localhostAddress in prev) {
        const { [endpoint.localhostAddress]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [endpoint.localhostAddress]: endpoint };
    });
  }, []);

  const handleSaveStart = useCallback(() => {
    setLoadingState('saving');
    setFeedbackMessage({ text: 'Salvando alterações...', type: 'info' });
  }, []);

  const handleSaveSuccess = useCallback(() => {
    setPendingChanges({});
    setFeedbackMessage({ text: 'Alterações salvas com sucesso!', type: 'success' });
  }, []);

  const handleSaveError = useCallback((error: unknown) => {
    console.error('Erro ao salvar alterações:', error);
    setFeedbackMessage({ text: 'Erro ao salvar alterações', type: 'error' });
  }, []);

  const saveChanges = useCallback(async () => {
    const endpointsToChange = Object.values(pendingChanges);
    if (endpointsToChange.length === 0) return;

    handleSaveStart();
    try {
      await axios.post('/api/changeStateEndpoint', endpointsToChange);
      handleSaveSuccess();
      await fetchEndpoints();
    } catch (error) {
      handleSaveError(error);
    } finally {
      setLoadingState('idle');
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  }, [pendingChanges, handleSaveStart, handleSaveSuccess, handleSaveError, fetchEndpoints]);

  useEffect(() => {
    fetchEndpoints().catch(console.error);
  }, [fetchEndpoints]);

  const pendingKeys = Object.keys(pendingChanges);

  const filteredEndpoints = endpoints
    ? {
        listEndpoints: endpoints.listEndpoints.filter((ep) => {
          const q = filterText.toLowerCase();
          return (
            ep.description.toLowerCase().includes(q) ||
            ep.localhostAddress.toLowerCase().includes(q) ||
            ep.method.toLowerCase().includes(q)
          );
        }),
      }
    : null;

  return (
    <>
      <FeedbackToast message={feedbackMessage} />

      <LoadingOverlay loadingState={loadingState} />

      <FilterBar value={filterText} onChange={setFilterText} />

      <ListEndpoints
        endpoints={filteredEndpoints}
        isLoading={loadingState !== 'idle'}
        pendingChanges={new Set(pendingKeys)}
        onAddPendingEndpoint={onAddPendingEndpoint}
      />

      <ActionsBar
        count={pendingKeys.length}
        isDisabled={loadingState !== 'idle'}
        onDiscard={() => setPendingChanges({})}
        onSave={saveChanges}
      />
    </>
  );
}

type FeedbackMessage = {
  text: string;
  type: 'success' | 'error' | 'info';
};

// ---------------------------------------------------------------------------
// FeedbackToast
// ---------------------------------------------------------------------------
const FeedbackToast = ({ message }: { message: FeedbackMessage | null }) => {
  if (!message) return null;
  return <div style={S.feedback(message.type)}>{message.text}</div>;
};

// ---------------------------------------------------------------------------
// LoadingOverlay
// ---------------------------------------------------------------------------

const overlayStates: Record<LoadingState, string> = {
  idle: '',
  fetching: 'Carregando...',
  saving: 'Alterando estado...',
};

const LoadingOverlay = ({ loadingState }: { loadingState: LoadingState }) => {
  if (loadingState === 'idle') return null;
  return (
    <div style={S.overlayBackdrop}>
      <div style={S.overlayCard}>
        <div style={S.overlaySpinner} />
        <span style={S.loadingText}>{overlayStates[loadingState]}</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------
type FilterBarProps = {
  value: string;
  onChange: (value: string) => void;
};

const FilterBar = ({ value, onChange }: FilterBarProps) => (
  <div style={S.filterBar}>
    <input
      style={S.filterInput}
      type="text"
      placeholder="Filtrar por descrição, endereço ou método..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button style={S.filterClearButton} onClick={() => onChange('')}>
        ✕
      </button>
    )}
  </div>
);

// ---------------------------------------------------------------------------
// ActionsBar
// ---------------------------------------------------------------------------
type ActionsBarProps = {
  count: number;
  isDisabled: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

const ActionsBar = ({ count, isDisabled, onDiscard, onSave }: ActionsBarProps) => {
  if (count === 0) return null;
  return (
    <div style={S.actionsBarStyle}>
      <button
        style={S.actionBarDiscardButton(isDisabled)}
        disabled={isDisabled}
        onClick={onDiscard}
      >
        Descartar ({count})
      </button>
      <button style={S.actionBarSaveButton(isDisabled)} disabled={isDisabled} onClick={onSave}>
        Salvar alterações ({count})
      </button>
    </div>
  );
};
