import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { getConfig } from '../server/server-load-config';

// Mesma resolução/validação de caminho de src/server/routes/open-endpoint-file-route.ts
// (basename only, restrito ao diretório de endpoints do workspace ativo).
function resolveEndpointFilePath(fileName: string): string | null {
  const normalizedFileName = path.basename(fileName);
  const workspacePath = path.resolve(getConfig().WORKSPACES_ROOT_PATH, getConfig().ACTIVE_WORKSPACE);
  const endpointsDir = path.resolve(workspacePath, 'endpoints');
  const endpointFilePath = path.resolve(endpointsDir, normalizedFileName);

  if (!endpointFilePath.startsWith(`${endpointsDir}${path.sep}`)) return null;
  if (!fs.existsSync(endpointFilePath)) return null;
  return endpointFilePath;
}

// Só faz sentido abrir o nvim numa aba do tmux quando a própria TUI já está
// rodando dentro de uma sessão tmux (var TMUX setada) — fora disso, o nvim
// tomaria conta do mesmo terminal que o Ink já está usando em raw mode.
export function openInTmuxNvim(fileName: string): boolean {
  if (!process.env.TMUX) return false;

  const filePath = resolveEndpointFilePath(fileName);
  if (!filePath) return false;

  const child = spawn('tmux', ['new-window', '-n', fileName, 'nvim', filePath], {
    detached: true,
    stdio: 'ignore',
  });
  child.on('error', () => {
    // tmux/nvim ausentes no PATH — silencioso, o chamador cai no fallback.
  });
  child.unref();

  return true;
}
