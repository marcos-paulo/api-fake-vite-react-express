import fs from 'node:fs';
import path from 'node:path';

const typeKey = 'type';
const typeValue = 'module';
const targetDir = process.env.INIT_CWD || process.cwd();
const targetPackageJsonPath = path.join(targetDir, 'package.json');

if (!fs.existsSync(targetPackageJsonPath)) {
  console.log('[api-fake] package.json do projeto destino nao encontrado.');
  process.exit(0);
}

let packageJson: Record<string, unknown>;

try {
  packageJson = JSON.parse(fs.readFileSync(targetPackageJsonPath, 'utf-8')) as Record<
    string,
    unknown
  >;
} catch {
  console.warn('[api-fake] Falha ao ler package.json do projeto destino.');
  process.exit(0);
}

const scriptsValue = packageJson.scripts;
const scripts: Record<string, string> =
  scriptsValue && typeof scriptsValue === 'object' ? (scriptsValue as Record<string, string>) : {};

function applyScript(key: string, value: string) {
  if (scripts[key] && scripts[key] !== value) {
    console.warn(`[api-fake] Script "${key}" ja existe no projeto destino e nao foi alterado.`);
  } else if (scripts[key] !== value) {
    scripts[key] = value;
    console.log(`[api-fake] Script "${key}" adicionado ao package.json do projeto destino.`);
  }
}

applyScript('start', 'api-fake');
applyScript('lint', 'eslint .');
applyScript('lint:fix', 'eslint . --fix');

if (packageJson[typeKey] && packageJson[typeKey] !== typeValue) {
  console.warn('[api-fake] Campo "type" ja existe no projeto destino e nao foi alterado.');
} else if (packageJson[typeKey] !== typeValue) {
  packageJson[typeKey] = typeValue;
  console.log('[api-fake] Campo "type" adicionado ao package.json do projeto destino.');
}

packageJson.scripts = scripts;
fs.writeFileSync(targetPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
