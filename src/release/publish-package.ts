import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runNpmScript } from './run-tools';

// Publica o pacote empacotado (.tgz) numa branch órfã deste repo, pra poder
// ser clonada e instalada em qualquer máquina sem compilar nada ali. A
// distribuição pros projetos consumidores fica de fora de propósito — é
// feita manualmente por quem publica.
//
// Versão REAL e permanente a cada execução, via `npm version <patch|minor|major>`
// — cria commit + tag de verdade no histórico deste repo (não um sufixo
// descartável). `npm version` já exige working tree limpo sozinho; a checagem
// em assertCleanWorkingTree() só existe pra dar um erro mais cedo e mais claro.
//
// O commit + tag do bump ficam só LOCAIS nesta máquina — este script não dá
// push na branch de desenvolvimento sozinho (só na branch de distribuição
// "pacote-compilado"). Ver aviso no final da execução.
//
// Uso: npm run package:publish -- [patch|minor|major]  (padrão: patch)

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const distTargetDir = path.join(rootDir, 'dist-target');
const worktreesDir = path.join(rootDir, '.worktrees');
const worktreeDir = path.join(worktreesDir, 'pacote-compilado');

const REMOTE = 'origin';
const BRANCH = 'pacote-compilado';
const BUMP_TYPES = ['patch', 'minor', 'major'] as const;
type BumpType = (typeof BUMP_TYPES)[number];

function isBumpType(value: string): value is BumpType {
  return (BUMP_TYPES as readonly string[]).includes(value);
}

function parseBumpType(): BumpType {
  const arg = process.argv[2] ?? 'patch';
  if (!isBumpType(arg)) {
    console.error(`[publish-package] Tipo de bump inválido: "${arg}" (use patch, minor ou major).`);
    process.exit(1);
  }
  return arg;
}

function assertCleanWorkingTree() {
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: rootDir }).toString();
  if (status.trim()) {
    console.error(
      '[publish-package] Há alterações não commitadas — commit (ou stash) tudo antes de publicar:',
    );
    console.error(status);
    process.exit(1);
  }
}

function bumpVersion(bumpType: BumpType): string {
  console.log(`[publish-package] Bump de versão (${bumpType})...`);
  execFileSync('npm', ['version', bumpType], { cwd: rootDir, stdio: 'inherit' });
  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf-8')) as {
    version: string;
  };
  return packageJson.version;
}

function buildAndPack(): string {
  console.log('[publish-package] Build + empacotamento (npm run package:pack)...');
  runNpmScript(rootDir, 'package:pack');

  const tarballs = fs.readdirSync(distTargetDir).filter((file) => file.endsWith('.tgz'));
  if (tarballs.length !== 1) {
    throw new Error(`Esperava exatamente um .tgz em dist-target/, encontrei ${tarballs.length}.`);
  }
  return tarballs[0];
}

function publishToOrphanBranch(tarballFileName: string) {
  fs.rmSync(worktreeDir, { recursive: true, force: true });
  fs.mkdirSync(worktreesDir, { recursive: true });

  console.log(`[publish-package] Criando branch órfã "${BRANCH}"...`);
  // --orphan exige uma branch "não nascida" — não dá pra combinar com -B pra
  // reaproveitar uma branch que já tem commit de uma execução anterior (erro:
  // "already exists"). Por isso apaga a branch local antes, se existir, e
  // recria do zero toda vez.
  try {
    execFileSync('git', ['branch', '-D', BRANCH], { cwd: rootDir, stdio: 'ignore' });
  } catch {
    // branch não existia — ok
  }
  execFileSync('git', ['worktree', 'add', '--orphan', '-b', BRANCH, worktreeDir], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  fs.copyFileSync(path.join(distTargetDir, tarballFileName), path.join(worktreeDir, tarballFileName));

  execFileSync('git', ['add', tarballFileName], { cwd: worktreeDir, stdio: 'inherit' });
  execFileSync('git', ['commit', '-m', `Pacote: ${tarballFileName}`], {
    cwd: worktreeDir,
    stdio: 'inherit',
  });

  console.log(`[publish-package] Enviando pro ${REMOTE}...`);
  execFileSync('git', ['push', REMOTE, BRANCH, '--force'], { cwd: worktreeDir, stdio: 'inherit' });

  execFileSync('git', ['worktree', 'remove', '--force', worktreeDir], { cwd: rootDir, stdio: 'inherit' });
}

function main() {
  const bumpType = parseBumpType();
  assertCleanWorkingTree();
  const version = bumpVersion(bumpType);
  const tarballFileName = buildAndPack();
  publishToOrphanBranch(tarballFileName);

  console.log();
  console.log(`[publish-package] Pronto. Branch "${BRANCH}" publicada com ${tarballFileName}.`);
  console.log(`  git clone --branch ${BRANCH} --single-branch <url-do-repo> pacote-api-fake`);
  console.log(`  npm install ./pacote-api-fake/${tarballFileName}`);
  console.log();
  console.log(
    `[publish-package] A publicação nos projetos consumidores é manual — não é feita por este script.`,
  );
  console.log();
  console.log(
    `[publish-package] O commit + tag da versão ${version} ficaram só LOCAIS — envie pro ${REMOTE} quando quiser:`,
  );
  console.log(`  git push ${REMOTE} HEAD --follow-tags`);
}

main();
