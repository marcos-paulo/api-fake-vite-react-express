export class LoadingGate {
  private loading: Promise<void> | undefined;

  private resolveLoading: () => void = () => {};

  enable() {
    this.loading = new Promise<void>((resolve) => {
      this.resolveLoading = resolve;
    });
  }

  resolve() {
    this.resolveLoading();
    this.resolveLoading = () => {};
    this.loading = undefined;
  }

  async wait() {
    await this.loading;
  }
}
