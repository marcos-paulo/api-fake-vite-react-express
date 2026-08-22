import { render } from 'ink';

import { App } from './App';

// Buffer de tela alternativo (mesmo usado por vim/htop/less): dá à TUI um
// viewport fixo e dedicado, isolado do scrollback do terminal. Sem isso, um
// frame um pouco mais alto que o anterior faz o terminal rolar sozinho,
// empurrando o título para fora da área visível.
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';

process.stdout.write(ENTER_ALT_SCREEN);

const { waitUntilExit, unmount } = render(<App />);

function shutdown() {
  unmount();
  process.stdout.write(EXIT_ALT_SCREEN);
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

waitUntilExit().then(() => {
  process.stdout.write(EXIT_ALT_SCREEN);
  process.exit(0);
});
