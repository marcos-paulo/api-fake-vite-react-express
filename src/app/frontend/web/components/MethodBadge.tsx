import type { EndpointMethod } from '../../../../types/dynamic-endpoints.types';
import styles from './MethodBadge.module.css';

type MethodBadgeProps = {
  method: EndpointMethod;
};

export const MethodBadge = ({ method }: MethodBadgeProps) => (
  <span className={styles.badge} data-method={method}>
    {method}
  </span>
);
