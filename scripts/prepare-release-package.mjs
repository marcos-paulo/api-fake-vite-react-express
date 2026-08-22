import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const sourceDistDir = path.join(rootDir, 'dist');
const packageDir = path.join(rootDir, 'dist-package');
const packageDistDir = path.join(packageDir, 'dist');
const packageScriptsDir = path.join(packageDir, 'scripts');

const rootPackageJsonPath = path.join(rootDir, 'package.json');
const rootReadmePath = path.join(rootDir, 'README.md');
const compiledInitPath = path.join(rootDir, 'dist', 'bin', 'api-fake-init.mjs');
const compiledDownloadPuppeteerPath = path.join(
  rootDir,
  'dist',
  'scripts',
  'download-puppeteer.mjs',
);
const tsconfigBaseSourcePath = path.join(rootDir, 'config', 'tsconfig-base.json');
const prettierBaseSourcePath = path.join(rootDir, '.prettierrc');
const editorconfigSourcePath = path.join(rootDir, '.editorconfig');
const productionBinFileName = 'api-fake-prod.mjs';
const initBinFileName = 'api-fake-init.mjs';

function assertBuildArtifactsExist() {
  if (!fs.existsSync(sourceDistDir)) {
    throw new Error('Diretório dist não encontrado. Execute o build antes de preparar o pacote.');
  }

  if (!fs.existsSync(compiledInitPath)) {
    throw new Error(
      'Script de "api-fake init" compilado nao encontrado. Execute o build antes de preparar o pacote.',
    );
  }

  if (!fs.existsSync(compiledDownloadPuppeteerPath)) {
    throw new Error(
      'Script de download do puppeteer compilado nao encontrado. Execute o build antes de preparar o pacote.',
    );
  }

  if (!fs.existsSync(tsconfigBaseSourcePath)) {
    throw new Error('config/tsconfig-base.json nao encontrado.');
  }

  if (!fs.existsSync(prettierBaseSourcePath)) {
    throw new Error('.prettierrc nao encontrado.');
  }

  if (!fs.existsSync(editorconfigSourcePath)) {
    throw new Error('.editorconfig nao encontrado.');
  }
}

function resetPackageDir() {
  fs.rmSync(packageDir, { recursive: true, force: true });
  fs.mkdirSync(packageScriptsDir, { recursive: true });
}

function copyDistFiles() {
  fs.cpSync(sourceDistDir, packageDistDir, {
    recursive: true,
    filter: (source) => !source.includes(`${path.sep}package`),
  });
}

function copyCompiledScripts() {
  // api-fake-init.mjs já é copiado junto com o resto de dist/bin por copyDistFiles();
  // aqui só copiamos o que fica fora de dist/ (scripts/ é usado só pelo hook postinstall).
  fs.copyFileSync(
    compiledDownloadPuppeteerPath,
    path.join(packageScriptsDir, 'download-puppeteer.mjs'),
  );
}

function copyReadme() {
  if (fs.existsSync(rootReadmePath)) {
    fs.copyFileSync(rootReadmePath, path.join(packageDir, 'README.md'));
  }
}

function copyTsconfigBase() {
  fs.copyFileSync(tsconfigBaseSourcePath, path.join(packageDir, 'tsconfig-base.json'));
}

function copyPrettierBase() {
  fs.copyFileSync(prettierBaseSourcePath, path.join(packageDir, 'prettier-config.json'));
}

function copyEditorConfigBase() {
  fs.copyFileSync(editorconfigSourcePath, path.join(packageDir, 'editorconfig-base'));
}

function buildPackageJson() {
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));

  return {
    name: rootPackageJson.name,
    version: rootPackageJson.version,
    type: rootPackageJson.type,
    bin: {
      'api-fake': `./dist/bin/${productionBinFileName}`,
      'api-fake-init': `./dist/bin/${initBinFileName}`,
    },
    types: './dist/types/index.d.ts',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
      },
      './eslint-config': {
        import: './dist/shared/eslint-config.js',
      },
      './tsconfig-base.json': './tsconfig-base.json',
      './prettier-config.json': './prettier-config.json',
    },
    files: [
      'dist',
      'scripts',
      'tsconfig-base.json',
      'prettier-config.json',
      'editorconfig-base',
      'README.md',
    ],
    scripts: {
      postinstall: 'node ./scripts/download-puppeteer.mjs',
    },
    dependencies: {
      ...rootPackageJson.dependencies,
    },
    engines: rootPackageJson.engines,
  };
}

function writePackageJson(packageJson) {
  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    `${JSON.stringify(packageJson, null, 2)}\n`,
  );
}

function main() {
  assertBuildArtifactsExist();
  resetPackageDir();
  copyDistFiles();
  copyCompiledScripts();
  copyReadme();
  copyTsconfigBase();
  copyPrettierBase();
  copyEditorConfigBase();
  writePackageJson(buildPackageJson());
}

main();
