import fs from 'node:fs';
import path from 'node:path';

const targetDir = process.env.INIT_CWD || process.cwd();

const eslintConfigCandidates = ['eslint.config.js', 'eslint.config.mjs', 'eslint.config.ts', 'eslint.config.cjs'];
const eslintConfigFileName = 'eslint.config.mjs';
const eslintConfigContent = `import apiFakeConfig from 'api-fake/eslint-config';

export default [...apiFakeConfig];
`;

function setupEslintConfig() {
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

const tsconfigFileName = 'tsconfig.json';
const tsconfigExtendsValue = 'api-fake/tsconfig-base.json';

function setupTsconfig() {
  const tsconfigPath = path.join(targetDir, tsconfigFileName);

  if (!fs.existsSync(tsconfigPath)) {
    const tsconfig = { extends: tsconfigExtendsValue, include: ['**/*.ts'] };
    fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
    console.log(`[api-fake] "${tsconfigFileName}" criado estendendo os padrões de tipos do api-fake.`);
    return;
  }

  let tsconfig: Record<string, unknown>;

  try {
    tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    console.warn(`[api-fake] Falha ao ler "${tsconfigFileName}", padrões de tipos não foram aplicados.`);
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
  console.log(`[api-fake] "${tsconfigFileName}" atualizado para estender os padrões de tipos do api-fake.`);
}

setupEslintConfig();
setupTsconfig();
