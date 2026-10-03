export type ShellId = 'browser' | 'puppeteer' | 'tauri' | 'tui';

export type ShellDefinition = {
  id: ShellId;
  label: string;
  // Script npm de dev (concurrently) que sobe esse shell. `null` quando o shell
  // precisa de tratamento especial — hoje só a tui, por causa do TTY (ver
  // `ttyExclusive` abaixo e `src/boot/bin/api-fake-dev.ts`).
  devScript: string | null;
  // Caminho do entrypoint de UI compilado, relativo a `dist/`. `null` quando o
  // shell não abre processo de UI próprio — o browser só navega até a URL que o
  // server já serve.
  prodUiEntry: string | null;
  // Se true, o server precisa servir o client web (dist/client) pra esse shell
  // funcionar — via Vite em dev, estático em produção.
  needsWebFrontend: boolean;
  // Se true, o shell precisa ser o único dono do TTY do processo (raw mode do
  // Ink) — não pode compartilhar stdio com outro processo via concurrently.
  ttyExclusive: boolean;
};

export const shells: Record<ShellId, ShellDefinition> = {
  browser: {
    id: 'browser',
    label: 'Browser',
    devScript: 'dev:browser',
    prodUiEntry: null,
    needsWebFrontend: true,
    ttyExclusive: false,
  },
  puppeteer: {
    id: 'puppeteer',
    label: 'Puppeteer',
    devScript: 'dev:with:puppeteer',
    prodUiEntry: 'puppeteer/main.js',
    needsWebFrontend: true,
    ttyExclusive: false,
  },
  // Janela nativa via binário Rust/Tauri (native/api-fake-tauri), commitado em native-bin/ — o
  // pacote publicado já o leva pronto. Exige webkit2gtk-4.1 e glibc >= 2.34 na máquina de quem
  // roda; sem isso o shell falha com uma mensagem apontando puppeteer/browser como alternativa.
  tauri: {
    id: 'tauri',
    label: 'Tauri',
    devScript: 'dev:with:tauri',
    prodUiEntry: 'tauri/main.js',
    needsWebFrontend: true,
    ttyExclusive: false,
  },
  tui: {
    id: 'tui',
    label: 'TUI',
    devScript: null,
    prodUiEntry: 'tui/main.js',
    needsWebFrontend: false,
    ttyExclusive: true,
  },
};

export function listShellIds(): ShellId[] {
  return Object.keys(shells) as ShellId[];
}

export function isShellId(id: string): id is ShellId {
  return id in shells;
}

export function getShell(id: ShellId): ShellDefinition {
  return shells[id];
}
