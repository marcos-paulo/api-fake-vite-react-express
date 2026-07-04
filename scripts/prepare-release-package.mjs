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
const compiledPostInstallPath = path.join(rootDir, 'dist', 'scripts', 'postinstall-add-script.mjs');
const compiledDownloadPuppeteerPath = path.join(rootDir, 'dist', 'scripts', 'download-puppeteer.mjs');
const productionBinFileName = 'api-fake-prod.mjs';

function assertBuildArtifactsExist() {
  if (!fs.existsSync(sourceDistDir)) {
    throw new Error('Diretório dist não encontrado. Execute o build antes de preparar o pacote.');
  }

  if (!fs.existsSync(compiledPostInstallPath)) {
    throw new Error(
      'Script de postinstall compilado nao encontrado. Execute o build antes de preparar o pacote.',
    );
  }

  if (!fs.existsSync(compiledDownloadPuppeteerPath)) {
    throw new Error(
      'Script de download do puppeteer compilado nao encontrado. Execute o build antes de preparar o pacote.',
    );
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
  fs.copyFileSync(compiledPostInstallPath, path.join(packageScriptsDir, 'postinstall-add-script.mjs'));
  fs.copyFileSync(compiledDownloadPuppeteerPath, path.join(packageScriptsDir, 'download-puppeteer.mjs'));
}

function copyReadme() {
  if (fs.existsSync(rootReadmePath)) {
    fs.copyFileSync(rootReadmePath, path.join(packageDir, 'README.md'));
  }
}

function buildPackageJson() {
  const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));

  return {
    name: rootPackageJson.name,
    version: rootPackageJson.version,
    type: rootPackageJson.type,
    bin: {
      'api-fake': `./dist/bin/${productionBinFileName}`,
    },
    types: './dist/types/index.d.ts',
    exports: {
      '.': {
        types: './dist/types/index.d.ts',
      },
    },
    files: ['dist', 'scripts', 'README.md'],
    scripts: {
      postinstall: 'node ./scripts/postinstall-add-script.mjs && node ./scripts/download-puppeteer.mjs',
    },
    dependencies: {
      ...rootPackageJson.dependencies,
    },
    engines: rootPackageJson.engines,
  };
}

function writePackageJson(packageJson) {
  fs.writeFileSync(path.join(packageDir, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
}

function main() {
  assertBuildArtifactsExist();
  resetPackageDir();
  copyDistFiles();
  copyCompiledScripts();
  copyReadme();
  writePackageJson(buildPackageJson());
}

main();
