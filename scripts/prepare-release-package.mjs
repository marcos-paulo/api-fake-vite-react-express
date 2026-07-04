import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const sourceDistDir = path.join(rootDir, 'dist');

const packageDir = path.join(rootDir, 'dist-package');
const packageDistDir = path.join(packageDir, 'dist');
const packageScriptsDir = path.join(packageDir, 'scripts');

const rootPackageJsonPath = path.join(rootDir, 'package.json');
const rootReadmePath = path.join(rootDir, 'README.md');
const compiledPostInstallPath = path.join(rootDir, 'dist', 'scripts', 'postinstall-add-script.cjs');

const productionBinFileName = 'api-fake-puppeteer-prod.cjs';

if (!fs.existsSync(sourceDistDir)) {
  throw new Error('Diretório dist não encontrado. Execute o build antes de preparar o pacote.');
}

const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));
const packageJson = {
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
    postinstall: 'node ./scripts/postinstall-add-script.cjs',
  },
  dependencies: {
    ...rootPackageJson.dependencies,
  },
  engines: rootPackageJson.engines,
};

fs.rmSync(packageDir, { recursive: true, force: true });
fs.mkdirSync(packageScriptsDir, { recursive: true });

if (!fs.existsSync(compiledPostInstallPath)) {
  throw new Error(
    'Script de postinstall compilado nao encontrado. Execute o build antes de preparar o pacote.',
  );
}

fs.cpSync(sourceDistDir, packageDistDir, {
  recursive: true,
  filter: (source) => {
    return !source.includes(`${path.sep}package`);
  },
});

fs.copyFileSync(
  compiledPostInstallPath,
  path.join(packageScriptsDir, 'postinstall-add-script.cjs'),
);

if (fs.existsSync(rootReadmePath)) {
  fs.copyFileSync(rootReadmePath, path.join(packageDir, 'README.md'));
}

fs.writeFileSync(
  path.join(packageDir, 'package.json'),
  `${JSON.stringify(packageJson, null, 2)}\n`,
);
