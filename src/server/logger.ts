const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const LIGHT_GREEN = '\x1b[92m';
const LIGHT_YELLOW = '\x1b[93m';
const MAGENTA = '\x1b[35m';
const RESET = '\x1b[0m';

export class Logger {
  private stack: string[] = [];

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
      console.info(`${spaces}${CYAN}[${methodName}]${RESET}`);
    };

    return {
      header,
      step: (message: string) => console.info(`${spaces} ${MAGENTA}◆ ${message}${RESET}`),
      info: (message: string) => console.info(`${spaces} → ${message}`),
      warn: (message: string) => console.warn(`${spaces} ${LIGHT_YELLOW}⚠ ${message}${RESET}`),
      success: (message: string) => console.info(`${spaces} ${LIGHT_GREEN}✔ ${message}${RESET}`),
      error: (message: string, cause?: unknown) =>
        console.error(
          `${spaces} ${RED}✗ ${message}${RESET}`,
          ...(cause !== undefined ? [cause] : []),
        ),
      endSection: () => this.endSection(),
    };
  }
}
