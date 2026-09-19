import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runTsxScript } from './run-tools';

// Ponto de entrada único pra uma release completa: garante working tree
// limpo, builda + empacota + publica a branch "pacote-compilado" (bump de
// versão de verdade via npm version, dentro de publish-package.ts), e em
// seguida já propaga essa mesma branch pros projetos consumidores
// configurados (publish-to-consumers.ts).
//
// A checagem de working tree limpo já existe dentro de publish-package.ts —
// repetida aqui só pra dar um aviso mais cedo e mais claro, antes de sequer
// começar a imprimir passos.
//
// Uso: npm run release -- [patch|minor|major]  (padrão: patch)

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const BUMP_TYPES = ['patch', 'minor', 'major'] as const;
type BumpType = (typeof BUMP_TYPES)[number];

function isBumpType(value: string): value is BumpType {
  return (BUMP_TYPES as readonly string[]).includes(value);
}

function parseBumpType(): BumpType {
  const arg = process.argv[2] ?? 'patch';
  if (!isBumpType(arg)) {
    console.error(`[release] Tipo de bump inválido: "${arg}" (use patch, minor ou major).`);
    process.exit(1);
  }
  return arg;
}

function assertCleanWorkingTree() {
  const status = execFileSync('git', ['status', '--porcelain'], { cwd: rootDir }).toString();
  if (status.trim()) {
    console.error(
      '[release] Há alterações não commitadas — commit (ou stash) tudo antes de fazer uma release:',
    );
    console.error(status);
    process.exit(1);
  }
}

function main() {
  const bumpType = parseBumpType();

  assertCleanWorkingTree();

  console.log(`[release] Publicando pacote (bump: ${bumpType})...`);
  runTsxScript(rootDir, 'src/release/publish-package.ts', [bumpType]);

  console.log('[release] Publicando nos consumidores...');
  runTsxScript(rootDir, 'src/release/publish-to-consumers.ts');
}

main();
