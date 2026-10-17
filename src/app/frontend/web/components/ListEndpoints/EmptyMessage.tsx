import styles from './EmptyMessage.module.css';

type EmptyMessageProps = {
  message: string;
};

export const EmptyMessage = ({ message }: EmptyMessageProps) => (
  <p className={styles.empty} role="status">
    {message}
  </p>
);
