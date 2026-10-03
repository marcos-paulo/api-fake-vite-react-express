import fs from 'node:fs';
import path from 'node:path';

import { readJsonFile, writeJsonFileIfChanged } from './json-file';

const typeKey = 'type';
const typeValue = 'module';

export function setupPackageScripts(targetDir: string) {
  const targetPackageJsonPath = path.join(targetDir, 'package.json');

  if (!fs.existsSync(targetPackageJsonPath)) {
    console.log('[api-fake] package.json do projeto destino nao encontrado.');
    return;
  }

  const file = readJsonFile(targetPackageJsonPath);

  if (!file) {
    console.warn('[api-fake] Falha ao ler package.json do projeto destino.');
    return;
  }

  const packageJson = file.data;
  const scriptsValue = packageJson.scripts;
  const scripts: Record<string, string> =
    scriptsValue && typeof scriptsValue === 'object'
      ? (scriptsValue as Record<string, string>)
      : {};

  function applyScript(key: string, value: string) {
    if (scripts[key] === value) return;

    if (scripts[key]) {
      console.warn(`[api-fake] Script "${key}" ja existe no projeto destino e nao foi alterado.`);
      return;
    }

    scripts[key] = value;
    console.log(`[api-fake] Script "${key}" adicionado ao package.json do projeto destino.`);
  }

  applyScript('start', 'api-fake');
  applyScript('api-fake:agent', 'api-fake-agent');
  applyScript('lint', 'eslint .');
  applyScript('lint:fix', 'eslint . --fix');
  applyScript('prettier:check', 'prettier --check .');
  applyScript('prettier', 'prettier --write .');

  if (packageJson[typeKey] && packageJson[typeKey] !== typeValue) {
    console.warn('[api-fake] Campo "type" ja existe no projeto destino e nao foi alterado.');
  } else if (packageJson[typeKey] !== typeValue) {
    packageJson[typeKey] = typeValue;
    console.log('[api-fake] Campo "type" adicionado ao package.json do projeto destino.');
  }

  packageJson.scripts = scripts;
  writeJsonFileIfChanged(targetPackageJsonPath, file);
}
