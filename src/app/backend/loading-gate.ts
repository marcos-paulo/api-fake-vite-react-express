export class LoadingGate {
  private loading: Promise<void> | undefined;

  private resolveLoading: () => void = () => {};

  private activeOperations = 0;

  enable() {
    this.activeOperations += 1;

    if (this.activeOperations === 1) {
      this.loading = new Promise<void>((resolve) => {
        this.resolveLoading = resolve;
      });
    }
  }

  resolve() {
    if (this.activeOperations === 0) return;

    this.activeOperations -= 1;

    if (this.activeOperations === 0) {
      this.resolveLoading();
      this.resolveLoading = () => {};
      this.loading = undefined;
    }
  }

  async wait() {
    await this.loading;
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    this.enable();
    try {
      return await operation();
    } finally {
      this.resolve();
    }
  }
}
