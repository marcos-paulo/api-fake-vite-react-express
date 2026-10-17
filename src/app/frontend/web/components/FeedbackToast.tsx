import type { FeedbackMessage } from '../hooks/useEndpoints';
import styles from './FeedbackToast.module.css';

type FeedbackToastProps = {
  message: FeedbackMessage | null;
};

// A região live fica sempre montada: leitores de tela só anunciam mudanças em regiões que já
// existiam. Erros usam role=alert (interrompe), o resto usa status (educado).
export const FeedbackToast = ({ message }: FeedbackToastProps) => {
  const visibleMessage = message && !message.quiet ? message : null;
  return (
    <div
      className={styles.region}
      aria-live={visibleMessage?.type === 'error' ? 'assertive' : 'polite'}
    >
      {visibleMessage && (
        <div className={styles.toast} data-type={visibleMessage.type} role="status">
          {visibleMessage.text}
        </div>
      )}
    </div>
  );
};
