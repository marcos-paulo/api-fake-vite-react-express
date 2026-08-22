import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';

import waitOn from 'wait-on';

export type ManagedProcessOptions = {
  command: string;
  args: string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  // `npm` no Windows é um .cmd — precisa passar pelo shell pra ser executável
  // diretamente por spawn(). Comandos binários (process.execPath, etc.) não.
  shell?: boolean;
  // Quando definido, stdout/stderr do processo são gravados nesse arquivo em vez
  // de herdar o terminal do pai — usado quando outro processo irmão (a TUI)
  // precisa ser dono exclusivo do TTY.
  logFilePath?: string;
};

export function spawnManagedProcess({
  command,
  args,
  cwd,
  env,
  shell,
  logFilePath,
}: ManagedProcessOptions): ChildProcess {
  if (logFilePath) {
    const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    const child = spawn(command, args, { cwd, env, shell, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout?.pipe(logStream);
    child.stderr?.pipe(logStream);
    return child;
  }

  return spawn(command, args, { cwd, env, shell, stdio: 'inherit' });
}

export async function waitForPort(port: number, timeout = 30000) {
  // Sem host explícito de propósito: o Vite (porta do client) só escuta em
  // `::1` neste tipo de ambiente, não em `127.0.0.1` — travava aqui achando que
  // a porta nunca subia. `tcp:<porta>` deixa o wait-on resolver "localhost" do
  // mesmo jeito que o processo cliente real vai resolver.
  await waitOn({ resources: [`tcp:${port}`], timeout });
}

type TrackOptions = {
  // Chamado quando o processo morre sem que o supervisor tenha pedido o
  // desligamento — sinal de crash/erro, não de encerramento normal.
  onUnexpectedExit?: (exitCode: number | null) => void;
};

// Agrupa spawn + wait-on + cascata de shutdown em SIGINT/SIGTERM — o padrão que
// tanto o supervisor de produção (api-fake-prod.ts) quanto o de desenvolvimento
// (api-fake-dev.ts) precisam pra subir um backend, esperar a porta e só então
// subir o processo de UI, desligando tudo em cascata quando qualquer um cai.
export class ProcessSupervisor {
  private children: ChildProcess[] = [];
  private shuttingDown = false;

  track(child: ChildProcess, { onUnexpectedExit }: TrackOptions = {}): ChildProcess {
    this.children.push(child);
    child.on('exit', (code) => {
      if (this.shuttingDown) return;
      onUnexpectedExit?.(code);
      this.shutdown(code ?? 0);
    });
    return child;
  }

  shutdown(exitCode = 0): void {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    // Encerra na ordem inversa em que os processos foram registrados (UI antes
    // do backend que ela depende).
    for (const child of [...this.children].reverse()) {
      if (!child.killed) child.kill('SIGTERM');
    }

    process.exit(exitCode);
  }

  registerSignalHandlers(): void {
    process.on('SIGINT', () => this.shutdown(0));
    process.on('SIGTERM', () => this.shutdown(0));
  }
}
