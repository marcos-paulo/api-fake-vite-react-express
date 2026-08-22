declare module 'wrap-ansi' {
  export interface WrapAnsiOptions {
    trim?: boolean;
    hard?: boolean;
    wordWrap?: boolean;
  }

  export default function wrapAnsi(text: string, columns: number, options?: WrapAnsiOptions): string;
}
