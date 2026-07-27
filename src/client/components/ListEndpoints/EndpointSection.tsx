import type { CSSProperties, ReactNode } from 'react';

const S = {
  section: {
    flex: 1,
    minWidth: 0,
  } satisfies CSSProperties,

  sectionEnabledHeader: {
    margin: '0 0 8px 0',
    padding: '6px 10px',
    fontSize: '0.85em',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--color-success)',
    borderBottom: '2px solid var(--color-success)',
  } satisfies CSSProperties,

  sectionDisabledHeader: {
    margin: '0 0 8px 0',
    padding: '6px 10px',
    fontSize: '0.85em',
    fontWeight: 'bold',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    color: 'var(--color-text-dim)',
    borderBottom: '2px solid var(--color-text-dim)',
  } satisfies CSSProperties,

  sectionEnabledUnorderedList: {
    border: '1px solid var(--color-success)',
    padding: '5px 5px 0 5px',
    listStyle: 'none',
    margin: 0,
    borderRadius: '4px',
  } satisfies CSSProperties,

  sectionDisabledUnorderedList: {
    border: '1px solid var(--color-border-muted)',
    padding: '5px 5px 0 5px',
    listStyle: 'none',
    margin: 0,
    borderRadius: '4px',
  } satisfies CSSProperties,
};

const sectionConfig = {
  enabled: {
    title: 'Habilitados',
    headerStyle: S.sectionEnabledHeader,
    unorderedListStyle: S.sectionEnabledUnorderedList,
  },
  disabled: {
    title: 'Desabilitados',
    headerStyle: S.sectionDisabledHeader,
    unorderedListStyle: S.sectionDisabledUnorderedList,
  },
} satisfies Record<
  'enabled' | 'disabled',
  { title: string; headerStyle: CSSProperties; unorderedListStyle: CSSProperties }
>;

type EndpointSectionProps = {
  variant: 'enabled' | 'disabled';
  count: number;
  children: ReactNode;
};

export const EndpointSection = ({ variant, count, children }: EndpointSectionProps) => {
  const { title, headerStyle, unorderedListStyle } = sectionConfig[variant];
  return (
    <div className="flex-scroll-column-hidden" style={S.section}>
      <h3 style={headerStyle}>
        {title} ({count})
      </h3>
      <ul className="flex-scroll-column-auto" style={unorderedListStyle}>
        {children}
      </ul>
    </div>
  );
};
