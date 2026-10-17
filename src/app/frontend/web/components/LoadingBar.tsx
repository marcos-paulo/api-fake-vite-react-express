import type { LoadingState } from '../hooks/useEndpoints';
import styles from './LoadingBar.module.css';

const LOADING_LABELS: Record<LoadingState, string> = {
  idle: '',
  fetching: 'Carregando endpoints…',
  saving: 'Salvando alterações…',
};

type LoadingBarProps = {
  loadingState: LoadingState;
};

// Substitui o overlay de tela cheia: recargas ao vivo acontecem a cada edição de endpoint e
// bloquear a tela inteira toda vez atrapalha mais do que informa.
export const LoadingBar = ({ loadingState }: LoadingBarProps) => (
  <div
    className={styles.track}
    role="progressbar"
    aria-label={LOADING_LABELS[loadingState] || 'Ocioso'}
    aria-hidden={loadingState === 'idle'}
  >
    {loadingState !== 'idle' && <div className={styles.indicator} />}
  </div>
);
