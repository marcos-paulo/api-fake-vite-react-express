import { useEffect } from 'react';

import styles from './ActionsBar.module.css';

type ActionsBarProps = {
  count: number;
  isDisabled: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

export const ActionsBar = ({ count, isDisabled, onDiscard, onSave }: ActionsBarProps) => {
  const hasChanges = count > 0;

  // Ctrl/Cmd+S salva; Esc (fora de campos de texto) descarta
  useEffect(() => {
    if (!hasChanges || isDisabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasChanges, isDisabled, onSave]);

  if (!hasChanges) return null;

  return (
    <div className={styles.bar} role="region" aria-label="Alterações pendentes">
      <p className={styles.summary} aria-live="polite">
        <span className={styles.dot} aria-hidden="true" />
        {count === 1 ? '1 alteração não salva' : `${count} alterações não salvas`}
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.discard} disabled={isDisabled} onClick={onDiscard}>
          Descartar
        </button>
        <button type="button" className={styles.save} disabled={isDisabled} onClick={onSave}>
          Salvar <kbd className={styles.kbd}>Ctrl S</kbd>
        </button>
      </div>
    </div>
  );
};
