export type ShellId = 'browser' | 'puppeteer' | 'electron' | 'tui';

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
  // Shells sem caminho de produção suportado ainda. O electron depende de um
  // runtime nativo pesado por plataforma que este pacote nunca baixou/empacotou
  // automaticamente (não está nem entre as dependencies publicadas, de propósito
  // — ver Fase 1 da refatoração) nem faz parte do `npm run build` agregado; fica
  // só como shell de desenvolvimento até esse suporte existir de verdade.
  prodReady: boolean;
};

export const shells: Record<ShellId, ShellDefinition> = {
  browser: {
    id: 'browser',
    label: 'Browser',
    devScript: 'dev:browser',
    prodUiEntry: null,
    needsWebFrontend: true,
    ttyExclusive: false,
    prodReady: true,
  },
  puppeteer: {
    id: 'puppeteer',
    label: 'Puppeteer',
    devScript: 'dev:with:puppeteer',
    prodUiEntry: 'puppeteer/main.js',
    needsWebFrontend: true,
    ttyExclusive: false,
    prodReady: true,
  },
  electron: {
    id: 'electron',
    label: 'Electron',
    devScript: 'dev:with:electron',
    prodUiEntry: 'electron/main.js',
    needsWebFrontend: true,
    ttyExclusive: false,
    prodReady: false,
  },
  tui: {
    id: 'tui',
    label: 'TUI',
    devScript: null,
    prodUiEntry: 'tui/main.js',
    needsWebFrontend: false,
    ttyExclusive: true,
    prodReady: true,
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
