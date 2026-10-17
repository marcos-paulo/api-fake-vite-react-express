import type { ReactNode } from 'react';

import styles from './EndpointSection.module.css';

const SECTION_TITLES = {
  enabled: 'Habilitados',
  disabled: 'Desabilitados',
} as const;

type EndpointSectionProps = {
  variant: keyof typeof SECTION_TITLES;
  count: number;
  // Com um único grupo visível o cabeçalho só repetiria o que a aba de filtro já diz
  showHeader: boolean;
  children: ReactNode;
};

export const EndpointSection = ({ variant, count, showHeader, children }: EndpointSectionProps) => (
  <section className={styles.section} aria-label={SECTION_TITLES[variant]}>
    {showHeader && (
      <h2 className={styles.header} data-variant={variant}>
        {SECTION_TITLES[variant]}
        <span className={styles.count}>{count}</span>
      </h2>
    )}
    <ul className={styles.items}>{children}</ul>
  </section>
);
