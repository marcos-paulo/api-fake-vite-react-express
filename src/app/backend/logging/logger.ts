const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const LIGHT_GREEN = '\x1b[92m';
const LIGHT_YELLOW = '\x1b[93m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';

// Ponto de saída de uma linha de log — um Logger pode ter vários, escritos em
// sequência (ver Logger.write abaixo). Permite, por exemplo, gravar a mesma
// linha no console e num arquivo ao mesmo tempo.
export type LogWriter = (level: 'info' | 'warn' | 'error', message: string, cause?: unknown) => void;

// Classe interna da camada de logging — quem precisa logar não usa Logger
// diretamente, e sim uma das instâncias já prontas exportadas por
// logger-app.ts (log do app/inicialização) ou logger-requests.ts (log por
// requisição HTTP), cada uma com seus próprios writers.
export class Logger {
  private stack: string[] = [];

  constructor(private writers: LogWriter[]) {}

  private write(level: 'info' | 'warn' | 'error', message: string, cause?: unknown) {
    for (const writer of this.writers) writer(level, message, cause);
  }

  addToStack(context: string) {
    this.stack.push(context);
  }

  removeFromStack() {
    this.stack.pop();
  }

  startSection(context: string, isRoot = false) {
    this.addToStack(context);
    const log = this.createLogger(context, isRoot ? 0 : this.stack.length - 1);
    log.header();
    return log;
  }

  endSection() {
    this.removeFromStack();
  }

  logToSection(context: string) {
    const log = this.createLogger(context, this.stack.length);
    log.header();
    return log;
  }

  createLogger(methodName: string, level: number) {
    const spaces = ' '.repeat(level * 2);

    const header = () => {
      this.write('info', `${spaces}${CYAN}[${methodName}]${RESET}`);
    };

    return {
      header,
      step: (message: string) => this.write('info', `${spaces} ${MAGENTA}◆ ${message}${RESET}`),
      info: (message: string) => this.write('info', `${spaces} → ${message}`),
      warn: (message: string) => this.write('warn', `${spaces} ${LIGHT_YELLOW}⚠ ${message}${RESET}`),
      success: (message: string) => this.write('info', `${spaces} ${LIGHT_GREEN}✔ ${message}${RESET}`),
      error: (message: string, cause?: unknown) =>
        this.write('error', `${spaces} ${RED}✗ ${message}${RESET}`, cause),
      endSection: () => this.endSection(),
    };
  }
}
