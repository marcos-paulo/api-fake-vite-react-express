import { spawn } from 'node:child_process';

import { resolveEndpointFilePath } from '../../../shared/resolve-endpoint-file-path';

// Só faz sentido abrir o nvim numa aba do tmux quando a própria TUI já está
// rodando dentro de uma sessão tmux (var TMUX setada) — fora disso, o nvim
// tomaria conta do mesmo terminal que o Ink já está usando em raw mode.
export function openInTmuxNvim(fileName: string): boolean {
  if (!process.env.TMUX) return false;

  const resolved = resolveEndpointFilePath(fileName);
  if (!resolved.ok) return false;

  const child = spawn('tmux', ['new-window', '-n', fileName, 'nvim', resolved.absolutePath], {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {
    // tmux/nvim ausentes no PATH — silencioso, o chamador cai no fallback.
  });
  child.unref();

  return true;
}
