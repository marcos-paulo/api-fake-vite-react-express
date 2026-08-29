import { render } from 'ink';

import { App } from './App';
import { redirectConsoleToFile, tuiLogFilePath } from './file-logger';

// Precisa rodar antes de qualquer render/efeito — nenhum console.* pode
// escapar pro stdout depois que o alt screen entra em cena.
redirectConsoleToFile();
console.log(`TUI iniciada, logs em: ${tuiLogFilePath}`);

// Buffer de tela alternativo (mesmo usado por vim/htop/less): dá à TUI um
// viewport fixo e dedicado, isolado do scrollback do terminal. Sem isso, um
// frame um pouco mais alto que o anterior faz o terminal rolar sozinho,
// empurrando o título para fora da área visível.
const ENTER_ALT_SCREEN = '\x1b[?1049h';
const EXIT_ALT_SCREEN = '\x1b[?1049l';

process.stdout.write(ENTER_ALT_SCREEN);

// O Ink faz seu próprio patch de console.* por padrão (via a lib "patch-console",
// pra imprimir logs acima da UI) — isso sobrescreveria nosso redirectConsoleToFile
// de cima, mandando tudo de volta pro stdout real (onde o redraw do alt screen
// apaga a mensagem no ciclo seguinte). patchConsole: false mantém nosso redirect
// como a única implementação durante toda a sessão.
const { waitUntilExit, unmount } = render(<App />, { patchConsole: false });

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
