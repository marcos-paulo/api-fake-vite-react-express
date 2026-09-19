import fs from 'fs';
import path from 'path';

import { getConfig } from './config';

export type ResolvedEndpointFilePath =
  | { ok: true; absolutePath: string }
  | { ok: false; reason: 'invalid-path' | 'not-found' };

/**
 * Resolve um fileName de endpoint (relativo, podendo ter subpastas, ex:
 * "sub/foo.ts") pra um caminho absoluto dentro de endpoints/ do workspace
 * ativo — recusando qualquer resultado que escape desse diretório (path
 * traversal via "../"). Usado tanto pela rota HTTP de abrir arquivo
 * (src/app/backend/routes/open-endpoint-file-route.ts) quanto pelo shell
 * TUI (src/app/frontend/tui/open-in-tmux-nvim.ts), que abre o mesmo arquivo
 * direto no nvim sem passar pela API.
 */
export function resolveEndpointFilePath(fileName: string): ResolvedEndpointFilePath {
  const workspacePath = path.resolve(getConfig().WORKSPACES_ROOT_PATH, getConfig().ACTIVE_WORKSPACE);
  const endpointsDir = path.resolve(workspacePath, 'endpoints');
  const endpointFilePath = path.resolve(endpointsDir, fileName);

  const isInsideEndpointsDir =
    endpointFilePath === endpointsDir || endpointFilePath.startsWith(`${endpointsDir}${path.sep}`);

  if (!isInsideEndpointsDir) {
    return { ok: false, reason: 'invalid-path' };
  }

  if (!fs.existsSync(endpointFilePath)) {
    return { ok: false, reason: 'not-found' };
  }

  return { ok: true, absolutePath: endpointFilePath };
}
