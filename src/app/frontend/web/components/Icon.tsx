import type { SVGProps } from 'react';

const PATHS = {
  search:
    'M11 4a7 7 0 1 0 4.2 12.6l4.1 4.1 1.4-1.4-4.1-4.1A7 7 0 0 0 11 4Zm0 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10Z',
  close:
    'M6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4 17.6 5 12 10.6 6.4 5Z',
  file: 'M6 2h8l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm7 2H6v16h12V9h-5V4Zm2 .4V7h2.6L15 4.4Z',
  external:
    'M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14V3ZM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
  chevron: 'M8.6 7.4 7.2 8.8l4.8 4.8 4.8-4.8-1.4-1.4-3.4 3.4-3.4-3.4Z',
  robot:
    'M12 2a1 1 0 0 1 1 1v2h4a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h4V3a1 1 0 0 1 1-1ZM7 7a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H7Zm2.5 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm5 0a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Zm-5.5 5h6v1.5H9V15Z',
  warning: 'M12 3 2 20h20L12 3Zm-1 6h2v5h-2V9Zm0 6.5h2v2h-2v-2Z',
  duplicate:
    'M8 3h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm0 2v11h11V5H8ZM3 8h1.5v11a1 1 0 0 0 1 1H16v1.5H5.5A2.5 2.5 0 0 1 3 19V8Z',
  undo: 'M12.5 8c-2.6 0-5 1-6.8 2.6L2 7v9h9l-3.6-3.6A8 8 0 0 1 12.5 10c3.1 0 5.8 1.8 7.1 4.4l1.9-.8A9.9 9.9 0 0 0 12.5 8Z',
  check: 'm9.5 16.2-3.7-3.7L4.4 14l5.1 5.1L20.6 8 19.2 6.6 9.5 16.2Z',
} as const;

export type IconName = keyof typeof PATHS;

type IconProps = { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>;

export const Icon = ({ name, size = 16, ...rest }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...rest}
  >
    <path d={PATHS[name]} />
  </svg>
);
