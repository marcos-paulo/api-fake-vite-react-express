import styles from './Switch.module.css';

type SwitchProps = {
  checked: boolean;
  label: string;
  disabled?: boolean;
  isPending?: boolean;
  onToggle: () => void;
};

export const Switch = ({
  checked,
  label,
  disabled = false,
  isPending = false,
  onToggle,
}: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    title={label}
    disabled={disabled}
    data-pending={isPending || undefined}
    className={styles.switch}
    onClick={onToggle}
  >
    <span className={styles.thumb} />
  </button>
);
