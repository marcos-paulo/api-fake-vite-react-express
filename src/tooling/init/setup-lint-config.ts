import fs from 'node:fs';
import path from 'node:path';

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

  let packageJson: Record<string, unknown>;

  try {
    packageJson = JSON.parse(fs.readFileSync(targetPackageJsonPath, 'utf-8')) as Record<
      string,
      unknown
    >;
  } catch {
    console.warn('[api-fake] Falha ao ler package.json do projeto destino.');
    return;
  }

  if (
    packageJson[prettierPackageJsonKey] &&
    packageJson[prettierPackageJsonKey] !== prettierPackageJsonValue
  ) {
    console.warn(
      `[api-fake] Campo "${prettierPackageJsonKey}" já existe no package.json do projeto destino e não foi alterado.`,
    );
    return;
  }

  if (packageJson[prettierPackageJsonKey] === prettierPackageJsonValue) {
    return;
  }

  packageJson[prettierPackageJsonKey] = prettierPackageJsonValue;
  fs.writeFileSync(targetPackageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
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

  let tsconfig: Record<string, unknown>;

  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    console.warn(
      `[api-fake] Falha ao ler "${tsconfigFileName}", padrões de tipos não foram aplicados.`,
    );
    return;
  }

  if (tsconfig.extends) {
    console.warn(
      `[api-fake] "${tsconfigFileName}" já possui "extends" e não foi alterado. Para herdar os padrões de ` +
        `tipos do api-fake, adicione "${tsconfigExtendsValue}" à lista de "extends" manualmente.`,
    );
    return;
  }

  tsconfig.extends = tsconfigExtendsValue;
  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
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
