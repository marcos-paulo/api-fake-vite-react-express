#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { setupLintConfig } from '../init/setup-lint-config';
import { setupPackageScripts } from '../init/setup-package-scripts';

// Raiz do pacote instalado (node_modules/api-fake), usada para localizar arquivos
// base como editorconfig-base — resolvida a partir da localização deste próprio
// script compilado (node_modules/api-fake/dist/bin/api-fake-init.mjs), não do cwd
// do usuário.
const packageRootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// process.cwd() é a raiz do projeto que roda `npx api-fake-init` manualmente;
// INIT_CWD cobre o caso raro de alguém invocar isso a partir de um script npm.
const targetDir = process.env.INIT_CWD || process.cwd();

console.log('[api-fake] Inicializando projeto...');

setupPackageScripts(targetDir);
setupLintConfig(targetDir, packageRootDir);

console.log('[api-fake] Inicialização concluída.');
