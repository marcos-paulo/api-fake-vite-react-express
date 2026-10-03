import fs from 'node:fs';
import path from 'node:path';

import { readJsonFile, writeJsonFileIfChanged } from './json-file';

const eslintConfigCandidates = [
  'eslint.config.js',
  'eslint.config.mjs',
  'eslint.config.ts',
  'eslint.config.cjs',
];
const eslintConfigFileName = 'eslint.config.mjs';
const eslintConfigContent = `import apiFakeConfig from 'api-fake/eslint-config';

export default [...apiFakeConfig];
`;

function setupEslintConfig(targetDir: string) {
  const existing = eslintConfigCandidates.find((fileName) =>
    fs.existsSync(path.join(targetDir, fileName)),
  );

  if (existing) {
    // Já herda o api-fake (foi criado por uma execução anterior, ou pela própria pessoa):
    // nada a fazer, nem a avisar.
    const content = fs.readFileSync(path.join(targetDir, existing), 'utf-8');
    if (content.includes('api-fake/eslint-config')) return;

    console.warn(
      `[api-fake] "${existing}" já existe e não foi alterado. Para herdar os padrões de lint do api-fake, ` +
        `adicione manualmente:\n` +
        `  import apiFakeConfig from 'api-fake/eslint-config';\n` +
        `  export default [...apiFakeConfig, /* sua config aqui */];`,
    );
    return;
  }

  fs.writeFileSync(path.join(targetDir, eslintConfigFileName), eslintConfigContent);
  console.log(`[api-fake] "${eslintConfigFileName}" criado com os padrões de lint do api-fake.`);
}

const prettierConfigCandidates = [
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.yaml',
  '.prettierrc.yml',
  '.prettierrc.js',
  '.prettierrc.cjs',
  '.prettierrc.mjs',
  'prettier.config.js',
  'prettier.config.cjs',
  'prettier.config.mjs',
];
const prettierPackageJsonKey = 'prettier';
const prettierPackageJsonValue = 'api-fake/prettier-config.json';

function setupPrettierConfig(targetDir: string) {
  const existingFile = prettierConfigCandidates.find((fileName) =>
    fs.existsSync(path.join(targetDir, fileName)),
  );

  if (existingFile) {
    console.warn(
      `[api-fake] "${existingFile}" já existe e não foi alterado. Para herdar os padrões de ` +
        `formatação do api-fake, referencie manualmente:\n` +
        `  "${prettierPackageJsonKey}": "${prettierPackageJsonValue}"\n` +
        `no package.json (ou o equivalente "extends"/import no seu arquivo de config).`,
    );
    return;
  }

  const targetPackageJsonPath = path.join(targetDir, 'package.json');

  if (!fs.existsSync(targetPackageJsonPath)) {
    console.log('[api-fake] package.json do projeto destino não encontrado.');
    return;
  }

  const file = readJsonFile(targetPackageJsonPath);

  if (!file) {
    console.warn('[api-fake] Falha ao ler package.json do projeto destino.');
    return;
  }

  const current = file.data[prettierPackageJsonKey];

  if (current === prettierPackageJsonValue) return;

  if (current) {
    console.warn(
      `[api-fake] Campo "${prettierPackageJsonKey}" já existe no package.json do projeto destino e não foi alterado.`,
    );
    return;
  }

  file.data[prettierPackageJsonKey] = prettierPackageJsonValue;
  writeJsonFileIfChanged(targetPackageJsonPath, file);
  console.log(
    `[api-fake] Campo "${prettierPackageJsonKey}" adicionado ao package.json do projeto destino, ` +
      `herdando os padrões de formatação do api-fake.`,
  );
}

const editorconfigFileName = '.editorconfig';

function setupEditorConfig(targetDir: string, packageRootDir: string) {
  const targetEditorConfigPath = path.join(targetDir, editorconfigFileName);
  const editorconfigSourcePath = path.join(packageRootDir, 'editorconfig-base');

  if (fs.existsSync(targetEditorConfigPath)) {
    // Idêntico ao base (criado por uma execução anterior): nada a fazer, nem a avisar.
    if (
      fs.existsSync(editorconfigSourcePath) &&
      fs.readFileSync(targetEditorConfigPath, 'utf-8') ===
        fs.readFileSync(editorconfigSourcePath, 'utf-8')
    ) {
      return;
    }

    console.warn(
      `[api-fake] "${editorconfigFileName}" já existe e não foi alterado. Para herdar os padrões ` +
        `do api-fake, copie o conteúdo de "node_modules/api-fake/editorconfig-base" manualmente.`,
    );
    return;
  }

  if (!fs.existsSync(editorconfigSourcePath)) {
    console.warn('[api-fake] "editorconfig-base" não encontrado no pacote instalado.');
    return;
  }

  fs.copyFileSync(editorconfigSourcePath, targetEditorConfigPath);
  console.log(`[api-fake] "${editorconfigFileName}" criado com os padrões do api-fake.`);
}

const tsconfigFileName = 'tsconfig.json';
const tsconfigExtendsValue = 'api-fake/tsconfig-base.json';

function setupTsconfig(targetDir: string) {
  const tsconfigPath = path.join(targetDir, tsconfigFileName);

  if (!fs.existsSync(tsconfigPath)) {
    const tsconfig = { extends: tsconfigExtendsValue, include: ['**/*.ts'] };
    fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
    console.log(
      `[api-fake] "${tsconfigFileName}" criado estendendo os padrões de tipos do api-fake.`,
    );
    return;
  }

  const file = readJsonFile(tsconfigPath);

  if (!file) {
    console.warn(
      `[api-fake] Falha ao ler "${tsconfigFileName}", padrões de tipos não foram aplicados.`,
    );
    return;
  }

  const currentExtends = file.data.extends;

  // Já estende o api-fake (criado por uma execução anterior, ou pela própria pessoa): nada a
  // fazer, nem a avisar. O "extends" também pode ser uma lista.
  if (
    currentExtends === tsconfigExtendsValue ||
    (Array.isArray(currentExtends) && currentExtends.includes(tsconfigExtendsValue))
  ) {
    return;
  }

  if (currentExtends) {
    console.warn(
      `[api-fake] "${tsconfigFileName}" já possui "extends" e não foi alterado. Para herdar os padrões de ` +
        `tipos do api-fake, adicione "${tsconfigExtendsValue}" à lista de "extends" manualmente.`,
    );
    return;
  }

  file.data.extends = tsconfigExtendsValue;
  writeJsonFileIfChanged(tsconfigPath, file);
  console.log(
    `[api-fake] "${tsconfigFileName}" atualizado para estender os padrões de tipos do api-fake.`,
  );
}

export function setupLintConfig(targetDir: string, packageRootDir: string) {
  setupEslintConfig(targetDir);
  setupTsconfig(targetDir);
  setupPrettierConfig(targetDir);
  setupEditorConfig(targetDir, packageRootDir);
}
